/**
 * Embedding Generation Edge Function
 * Vercel Edge Function for batch embedding generation and storage
 *
 * Generates embeddings for movies using OpenAI's text-embedding-3-small model,
 * stores them in Firestore with versioning, and logs metrics for cost tracking.
 */

import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const config = {
    runtime: 'nodejs',
};

/**
 * Initialize Firebase Admin SDK
 * Uses service account from environment variable
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
        console.error('[Embeddings] Firebase init error:', error.message);
        throw error;
    }
}

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
        const { limit = 50, version = 'v1' } = body;

        // Validate request parameters
        if (limit <= 0 || limit > 100) {
            return new Response(
                JSON.stringify({ error: 'Batch limit must be between 1 and 100' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!/^v\d+$/.test(version)) {
            return new Response(
                JSON.stringify({ error: 'Version must be format v1, v2, etc.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Firebase
        const db = initializeFirebase();
        const embeddingField = `embedding_${version}`;

        // Fetch movies without embeddings for this version
        const embeddingFieldName = embeddingField;
        const moviesQuery = await db
            .collection('movies')
            .where(embeddingFieldName, '==', null)
            .limit(limit)
            .get();

        if (moviesQuery.empty) {
            return new Response(
                JSON.stringify({
                    processed: 0,
                    embeddings_generated: 0,
                    newVersion: version,
                    message: 'No movies to process'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Prepare texts for embedding
        const movies = [];
        const texts = [];

        moviesQuery.forEach((doc) => {
            const movie = doc.data();
            movies.push({ id: doc.id, data: movie });

            // Create combined text for embedding
            const text = [
                movie.title || '',
                movie.year ? `(${movie.year})` : '',
                movie.description || '',
                movie.genres ? movie.genres.join(', ') : ''
            ].filter(Boolean).join(' ');

            texts.push(text);
        });

        // Generate embeddings using OpenAI text-embedding-3-small
        let embeddingResults;
        try {
            embeddingResults = await embedMany({
                model: openai.embedding('text-embedding-3-small', {
                    dimensions: 512,
                }),
                values: texts,
            });
        } catch (error) {
            console.error('[Embeddings] OpenAI API error:', error);
            return new Response(
                JSON.stringify({
                    error: 'Embedding generation failed',
                    details: error.message
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Store embeddings in Firestore batch
        const batch = db.batch();
        const now = new Date();
        let successCount = 0;

        for (let idx = 0; idx < movies.length; idx++) {
            const movieRef = db.collection('movies').doc(movies[idx].id);
            const embedding = embeddingResults.embeddings[idx];

            if (embedding) {
                batch.update(movieRef, {
                    [embeddingField]: embedding,
                    embedding_model: 'text-embedding-3-small',
                    embedding_version: version,
                    embedding_generated_at: now,
                });
                successCount++;
            }
        }

        // Log metrics to api_metrics collection
        await db.collection('api_metrics').add({
            type: 'embedding',
            operation: 'generation',
            model: 'text-embedding-3-small',
            batchSize: successCount,
            version: version,
            timestamp: now,
            totalMovies: movies.length,
        });

        // Commit batch
        await batch.commit();

        return new Response(
            JSON.stringify({
                processed: movies.length,
                embeddings_generated: successCount,
                newVersion: version,
                timestamp: now.toISOString(),
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('[Embeddings] Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Embedding generation failed',
                details: error.message
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
