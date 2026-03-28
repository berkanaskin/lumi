/**
 * AI Search — Gemini 2.5 Flash
 * Vercel Serverless Function (Node.js)
 *
 * Direct LLM search: User describes what they want → Gemini suggests TMDB IDs → enrich with TMDB data
 * No Firestore dependency — works without billing
 */

import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const config = {
    runtime: 'nodejs',
    maxDuration: 30,
};

// Free tier protection
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;
const CACHE = new Map();
const CACHE_TTL = 300_000;

// Clean stale entries periodically
function cleanMaps() {
    const now = Date.now();
    for (const [key, val] of CACHE) {
        if (now - val.time > CACHE_TTL) CACHE.delete(key);
    }
    for (const [key, val] of rateLimiter) {
        const fresh = val.filter(t => now - t < RATE_LIMIT_WINDOW);
        if (fresh.length === 0) rateLimiter.delete(key);
        else rateLimiter.set(key, fresh);
    }
}

async function getTMDBMovie(tmdbId, apiKey) {
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=tr-TR`
        );
        if (!res.ok) {
            // Try as TV show
            const tvRes = await fetch(
                `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR`
            );
            if (!tvRes.ok) return null;
            const tv = await tvRes.json();
            return {
                id: tv.id,
                title: tv.name,
                release_date: tv.first_air_date || null,
                poster_path: tv.poster_path || null,
                vote_average: tv.vote_average || 0,
                overview: tv.overview || '',
                media_type: 'tv',
            };
        }
        const data = await res.json();
        return {
            id: data.id,
            title: data.title,
            release_date: data.release_date || null,
            poster_path: data.poster_path || null,
            vote_average: data.vote_average || 0,
            overview: data.overview || '',
            media_type: 'movie',
        };
    } catch {
        return null;
    }
}

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = request.body || {};
        let { query, userId, limit = 10 } = body;

        if (!query || typeof query !== 'string' || query.trim().length < 3) {
            return new Response(
                JSON.stringify({ error: 'Arama en az 3 karakter olmali' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        query = query.trim();
        limit = Math.min(parseInt(limit) || 10, 15);
        const userKey = userId || 'anon';

        // Rate limit
        const now = Date.now();
        cleanMaps();
        const userHistory = rateLimiter.get(userKey) || [];
        if (userHistory.length >= RATE_LIMIT_MAX) {
            return new Response(
                JSON.stringify({ error: 'Cok fazla arama, lutfen biraz bekleyin' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }
        userHistory.push(now);
        rateLimiter.set(userKey, userHistory);

        // Cache
        const cacheKey = query.toLowerCase();
        const cached = CACHE.get(cacheKey);
        if (cached && now - cached.time < CACHE_TTL) {
            return new Response(JSON.stringify(cached.data), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        }

        // Gemini LLM — suggest movies
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'TMDB_API_KEY not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const result = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: `Sen bir film ve dizi oneri uzmanisn. Kullanici su tarzi bir sey izlemek istiyor: "${query}"

Bu isteğe en uygun ${limit} film veya dizi oner. TMDB (The Movie Database) ID'lerini don.

Onemli kurallar:
- Sadece gercek, var olan filmleri/dizileri oner
- TMDB ID'leri dogru olmali
- Turkce ve yabanci yapimlar karisik olabilir
- Populer ve az bilinen yapimlar karisik olsun
- Kullanicinin ruh haline/tarifine en uygun olanlari sec`,
            output: Output.object({
                schema: z.object({
                    suggestions: z.array(z.object({
                        tmdbId: z.number().describe('TMDB ID'),
                        title: z.string().describe('Film/dizi adi'),
                        reason: z.string().describe('Neden onerildi — 1 cumle'),
                    })).describe('Onerilen filmler/diziler'),
                }),
            }),
        });

        // Enrich with TMDB data
        const suggestions = result.object?.suggestions || [];
        const enriched = [];

        // Fetch TMDB data in parallel (max 5 concurrent)
        const batchSize = 5;
        for (let i = 0; i < suggestions.length; i += batchSize) {
            const batch = suggestions.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(s => getTMDBMovie(s.tmdbId, apiKey))
            );
            for (let j = 0; j < results.length; j++) {
                const movie = results[j];
                if (movie) {
                    movie.reason = batch[j].reason;
                    enriched.push(movie);
                }
            }
        }

        const responseData = {
            results: enriched,
            source: 'gemini',
            confidence: 0.85,
            timestamp: new Date().toISOString(),
        };

        CACHE.set(cacheKey, { data: responseData, time: now });

        return new Response(JSON.stringify(responseData), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[Search] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Arama basarisiz', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
