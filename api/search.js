/**
 * AI Search — Gemini 2.5 Flash
 * Vercel Serverless Function (Node.js)
 *
 * Direct LLM search: User describes what they want → Gemini suggests TMDB IDs → enrich with TMDB data
 * No Firestore dependency — works without billing
 */

import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// Build Google provider once. Prefer GOOGLE_GENERATIVE_AI_API_KEY (SDK default),
// fall back to GEMINI_API_KEY (used elsewhere in this project).
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY });

export const runtime = 'nodejs';
export const maxDuration = 60;

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
        // Per-call 4s timeout: a single slow TMDB lookup must not drag the whole function
        // past the 60s wall. AbortSignal.timeout is supported on Vercel Node 18+.
        const res = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=tr-TR`,
            { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) {
            // Try as TV show
            const tvRes = await fetch(
                `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=tr-TR`,
                { signal: AbortSignal.timeout(4000) }
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
        // Robust body parsing — Vercel Node runtime auto-parses JSON when Content-Type is set,
        // but fall back to manual parse if body is a string or stream.
        let body = request.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch { body = {}; }
        } else if (!body || typeof body !== 'object') {
            try { body = await request.json(); } catch { body = {}; }
        }
        let { query, userId, limit = 10 } = body || {};

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
        if (!GEMINI_KEY) {
            return new Response(
                JSON.stringify({
                    error: 'AI yapılandırması eksik',
                    details: 'GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) is not set on this deployment',
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Round 4 fix: replace deprecated `generateText + Output.object` pattern with
        // canonical `generateObject` (Vercel AI SDK 6). The previous pattern was looping
        // internally and exceeding the 60s wall, causing the function to hang.
        // Hard 25s ceiling via AbortSignal so we always have time left to return.
        let result;
        try {
            result = await generateObject({
                model: google('gemini-2.5-flash-lite'),
                schema: z.object({
                    suggestions: z.array(z.object({
                        tmdbId: z.number().describe('TMDB ID'),
                        title: z.string().describe('Film/dizi adi'),
                        reason: z.string().describe('Neden onerildi — 1 cumle'),
                    })).describe('Onerilen filmler/diziler'),
                }),
                prompt: `Sen bir film ve dizi oneri uzmanisn. Kullanici su tarzi bir sey izlemek istiyor: "${query}"

Bu isteğe en uygun ${limit} film veya dizi oner. TMDB (The Movie Database) ID'lerini don.

Onemli kurallar:
- Sadece gercek, var olan filmleri/dizileri oner
- TMDB ID'leri dogru olmali
- Turkce ve yabanci yapimlar karisik olabilir
- Populer ve az bilinen yapimlar karisik olsun
- Kullanicinin ruh haline/tarifine en uygun olanlari sec`,
                maxRetries: 1,
                abortSignal: AbortSignal.timeout(25_000),
            });
        } catch (llmErr) {
            // LLM call timed out or failed — return a structured empty response so the
            // frontend can show a real message instead of hanging forever.
            console.error('[Search] LLM call failed:', llmErr?.name, llmErr?.message);
            return new Response(JSON.stringify({
                results: [],
                source: 'gemini',
                empty: true,
                reason: 'llm_timeout',
                error: llmErr?.message || 'LLM call failed',
                timestamp: new Date().toISOString(),
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

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

        // Diagnostic logging — Round 3: silent failures were because Gemini returned
        // suggestions but TMDB lookups returned null (bad/stale ID). Surface this.
        console.log('[Search] query="%s" gemini=%d enriched=%d', query, suggestions.length, enriched.length);

        // If Gemini returned 0 suggestions OR all TMDB lookups failed → return explicit
        // empty-state response with diagnostic so frontend can surface a real message.
        if (enriched.length === 0) {
            const reason = suggestions.length === 0
                ? 'gemini_empty'
                : 'tmdb_lookup_failed';
            const responseData = {
                results: [],
                source: 'gemini',
                empty: true,
                reason,
                geminiSuggestionsCount: suggestions.length,
                timestamp: new Date().toISOString(),
            };
            // Do NOT cache empty results — let next call retry.
            return new Response(JSON.stringify(responseData), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
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
