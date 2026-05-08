/**
 * AI Search — Gemini 2.5 Flash (direct REST API)
 * Vercel Serverless Function (Node.js)
 *
 * User describes what they want → Gemini suggests TMDB IDs → enrich with TMDB data.
 * No Firestore dependency — works without billing.
 *
 * Round 6: AI SDK (`ai` + `@ai-sdk/google`) caused 4 rounds of cold-start hangs in
 * Vercel Node 20. Replaced entirely with a direct fetch() to Google's Generative
 * Language API. `embeddings.js` still uses `ai` + `@ai-sdk/openai` — those deps stay.
 */

export const config = {
    runtime: 'edge',
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

/**
 * Round 10 fix: Gemini hallucinates TMDB IDs (returns invalid/non-existent IDs).
 * Instead of trusting Gemini's IDs, look up real TMDB content by title + year + mediaType.
 *
 * @param {string} title - movie/show title (any language)
 * @param {number|null} year - release year (optional but improves match accuracy)
 * @param {string} mediaType - 'movie' | 'tv' | 'either'
 * @param {string} apiKey - TMDB v3 API key
 * @returns {Promise<object|null>} normalized TMDB record or null
 */
async function findTMDBByTitle(title, year, mediaType, apiKey) {
    if (!title) return null;
    const types = mediaType === 'either' || !mediaType ? ['movie', 'tv'] : [mediaType];
    for (const type of types) {
        try {
            const yearParam = year
                ? `&${type === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${year}`
                : '';
            const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=tr-TR&include_adult=false${yearParam}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) continue;
            const data = await res.json();
            const top = Array.isArray(data.results) && data.results[0];
            if (!top) continue;
            return type === 'movie'
                ? {
                    id: top.id,
                    title: top.title,
                    release_date: top.release_date || null,
                    poster_path: top.poster_path || null,
                    vote_average: top.vote_average || 0,
                    overview: top.overview || '',
                    media_type: 'movie',
                }
                : {
                    id: top.id,
                    title: top.name,
                    release_date: top.first_air_date || null,
                    poster_path: top.poster_path || null,
                    vote_average: top.vote_average || 0,
                    overview: top.overview || '',
                    media_type: 'tv',
                };
        } catch {
            // try next type
        }
    }
    return null;
}

// Direct REST call to Google Generative Language API. No SDK, no dynamic imports.
async function callGeminiREST(query, limit, apiKey, abortSignal) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = `Sen bir film ve dizi öneri uzmanısın. Kullanıcı şu tarzı bir şey izlemek istiyor: "${query}"

Bu isteğe en uygun ${limit} film veya dizi öner.

Önemli kurallar:
- Sadece gerçek, var olan filmleri/dizileri öner
- Kullanıcı "film" veya "dizi" diye belirtmediyse hem film hem dizi karışık öner — mediaType'ı içeriğe göre seç
- Türkçe ve yabancı yapımlar karışık olabilir
- Popüler ve az bilinen yapımlar karışık olsun
- Her öneri için: title (tam başlık, orijinal dilde tercih edilir), year (çıkış yılı), mediaType ('movie' / 'tv' / 'either'), reason (1 cümle Türkçe)`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            response_mime_type: 'application/json',
            response_schema: {
                type: 'object',
                properties: {
                    suggestions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                title: { type: 'string', description: 'Tam başlık (orijinal dil tercih)' },
                                year: { type: 'integer', description: 'Çıkış yılı' },
                                mediaType: { type: 'string', enum: ['movie', 'tv', 'either'] },
                                reason: { type: 'string', description: 'Neden önerildi — 1 cümle' },
                            },
                            required: ['title', 'year', 'mediaType', 'reason'],
                        },
                    },
                },
                required: ['suggestions'],
            },
            temperature: 0.7,
            maxOutputTokens: 2048,
        },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortSignal,
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text');
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('Gemini returned invalid JSON: ' + text.slice(0, 200));
    }
    return parsed.suggestions || [];
}

export default async function handler(request) {
    // Fast health-check shortcut — runs BEFORE body parse so we can verify the
    // function is reachable at all and which env vars are configured.
    if (request.method === 'GET') {
        const url = new URL(request.url, 'http://localhost');
        if (url.searchParams.has('healthcheck')) {
            return new Response(JSON.stringify({
                ok: true,
                ts: Date.now(),
                hasGeminiKey: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY),
                hasTmdbKey: Boolean(process.env.TMDB_API_KEY),
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(
            JSON.stringify({ error: 'GET only allowed for ?healthcheck=1' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Edge runtime: request.body is a ReadableStream — must use await request.json()
        let body;
        try { body = await request.json(); } catch { body = {}; }
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

        // Env keys
        const tmdbKey = process.env.TMDB_API_KEY;
        if (!tmdbKey) {
            return new Response(
                JSON.stringify({ error: 'TMDB_API_KEY not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return new Response(
                JSON.stringify({
                    error: 'AI yapılandırması eksik',
                    details: 'GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) is not set on this deployment',
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Direct Gemini REST call — 20s ceiling so we always have time left for TMDB enrichment.
        let suggestions;
        try {
            suggestions = await callGeminiREST(query, limit, geminiKey, AbortSignal.timeout(20_000));
        } catch (err) {
            const isAbort = err?.name === 'AbortError' || err?.name === 'TimeoutError';
            console.error('[Search] Gemini REST error:', err?.name, err?.message);
            return new Response(JSON.stringify({
                results: [],
                source: 'gemini',
                empty: true,
                reason: isAbort ? 'llm_timeout' : 'llm_error',
                errorName: err?.name || 'Error',
                errorMessage: err?.message || 'LLM call failed',
                timestamp: new Date().toISOString(),
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Enrich with TMDB data — parallel batches of 5.
        // Round 10: Gemini hallucinates IDs, so we now do title-based TMDB SEARCH
        // instead of ID-based lookup. Much more reliable.
        const enriched = [];
        const batchSize = 5;
        for (let i = 0; i < suggestions.length; i += batchSize) {
            const batch = suggestions.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(s => findTMDBByTitle(s.title, s.year, s.mediaType, tmdbKey))
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

        // Empty-state with diagnostic so frontend can surface a real message.
        if (enriched.length === 0) {
            const reason = suggestions.length === 0 ? 'gemini_empty' : 'tmdb_lookup_failed';
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
