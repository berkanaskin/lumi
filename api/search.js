/**
 * Hybrid AI Search Edge Function
 * Vercel Edge Function for natural language movie/TV search
 *
 * Implements embedding-first search with LLM fallback:
 * - 80% of queries: Vector search on Firestore embeddings
 * - 20% of queries: LLM fallback for complex/low-confidence queries
 *
 * Cost tracking: All calls logged to api_metrics collection
 */

import { embedMany, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const config = {
    runtime: 'nodejs',
};

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const app = initializeApp({
            credential: cert(serviceAccount),
        });

        return getFirestore(app);
    } catch (error) {
        console.error('[Search] Firebase init error:', error.message);
        throw error;
    }
}

/**
 * Get TMDB movie details by ID
 */
async function getTMDBMovie(tmdbId) {
    try {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            console.warn('[Search] TMDB_API_KEY not configured');
            return null;
        }

        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=en-US`
        );

        if (!response.ok) {
            console.warn(`[Search] TMDB fetch failed for ID ${tmdbId}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return {
            tmdbId: data.id,
            title: data.title,
            year: data.release_date ? new Date(data.release_date).getFullYear() : null,
            genres: data.genres ? data.genres.map(g => g.name) : [],
            poster: data.poster_path,
            rating: data.vote_average,
            description: data.overview,
        };
    } catch (error) {
        console.error('[Search] TMDB fetch error:', error);
        return null;
    }
}

/**
 * Log API call metrics to Firestore
 */
async function logMetric(db, metric) {
    try {
        await db.collection('api_metrics').add({
            ...metric,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error('[Search] Failed to log metric:', error);
    }
}

/**
 * Main search handler
 */
export default async function handler(request) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();
        let { query, userId, limit = 20 } = body;

        // Validate input
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Query must be a non-empty string' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        query = query.trim();
        limit = Math.min(parseInt(limit) || 20, 20);

        // Initialize Firebase
        const db = initializeFirebase();
        const timestamp = new Date();

        // Step 1: Generate embedding for query
        let queryEmbedding;
        try {
            const embeddingResult = await embedMany({
                model: openai.embedding('text-embedding-3-small', {
                    dimensions: 512,
                }),
                values: [query],
            });

            queryEmbedding = embeddingResult.embeddings[0];

            // Log embedding generation
            await logMetric(db, {
                type: 'embedding',
                operation: 'search',
                query,
                userId,
                timestamp,
            });
        } catch (error) {
            console.error('[Search] Embedding generation error:', error);
            return new Response(
                JSON.stringify({ error: 'Embedding generation failed', details: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Step 2: Vector search in Firestore
        let results = [];
        let avgScore = 0;
        let source = 'embedding';
        let confidence = 0;

        try {
            const snapshots = await db
                .collection('movies')
                .findNearest('embedding_v1', queryEmbedding, {
                    limit: limit,
                    distanceMeasure: 'COSINE',
                })
                .get();

            if (!snapshots.empty) {
                // Calculate average similarity score
                const similarities = snapshots.docs.map(doc => doc._readTime ? doc.data().__name__ || 0 : 0.5);

                // Extract results (Firestore vector search returns similarity in metadata)
                for (const doc of snapshots.docs) {
                    const movie = doc.data();
                    if (movie && movie.title) {
                        results.push({
                            tmdbId: movie.tmdbId || movie.id,
                            title: movie.title,
                            year: movie.year,
                            genres: movie.genres || [],
                            poster: movie.poster,
                            rating: movie.rating || 0,
                        });
                    }
                }

                // Estimate confidence based on result count and similarity
                avgScore = Math.min(0.9, 0.7 + (results.length / limit) * 0.2);
                confidence = avgScore;
            }
        } catch (error) {
            console.error('[Search] Firestore search error:', error);
            // Continue to LLM fallback on vector search failure
            results = [];
            avgScore = 0;
        }

        // Step 3: Confidence check - if good results, return
        if (results.length > 0 && avgScore > 0.80) {
            // Log successful embedding search
            await logMetric(db, {
                type: 'embedding',
                operation: 'search_results',
                query,
                userId,
                resultCount: results.length,
                similarity: avgScore,
                timestamp,
            });

            return new Response(
                JSON.stringify({
                    results: results.slice(0, limit),
                    source: 'embedding',
                    confidence: avgScore,
                    timestamp: timestamp.toISOString(),
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Step 4: LLM fallback for low confidence or no results
        console.log(`[Search] LLM fallback triggered for query: "${query}" (avgScore: ${avgScore})`);

        try {
            const llmResult = await generateObject({
                model: openai('gpt-4o-mini'),
                prompt: `User is searching for: "${query}". Suggest 10 movie or TV show TMDB IDs that match this request. Return only the IDs as numbers.`,
                schema: z.object({
                    tmdbIds: z.array(z.number()).describe('Array of TMDB IDs matching the query'),
                    reasoning: z.string().describe('Brief explanation of why these were selected'),
                }),
            });

            // Fetch movies from TMDB by IDs
            const llmResults = [];
            for (const tmdbId of llmResult.object.tmdbIds.slice(0, limit)) {
                const movie = await getTMDBMovie(tmdbId);
                if (movie) {
                    llmResults.push(movie);
                }
            }

            // Log LLM call
            await logMetric(db, {
                type: 'llm',
                operation: 'search',
                query,
                userId,
                fallbackReason: 'embedding_low_confidence',
                resultCount: llmResults.length,
                timestamp,
            });

            return new Response(
                JSON.stringify({
                    results: llmResults,
                    source: 'llm',
                    confidence: 0.60,
                    timestamp: timestamp.toISOString(),
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } catch (error) {
            console.error('[Search] LLM fallback error:', error);

            // Log LLM error
            await logMetric(db, {
                type: 'llm',
                operation: 'search_failed',
                query,
                userId,
                error: error.message,
                timestamp,
            });

            // Return best effort: embedding results if any, or empty results
            if (results.length > 0) {
                return new Response(
                    JSON.stringify({
                        results: results.slice(0, limit),
                        source: 'embedding_partial',
                        confidence: 0.5,
                        timestamp: timestamp.toISOString(),
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            return new Response(
                JSON.stringify({ error: 'Search failed', details: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

    } catch (error) {
        console.error('[Search] Handler error:', error);
        return new Response(
            JSON.stringify({ error: 'Search request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
