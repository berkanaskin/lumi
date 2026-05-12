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

// BCP 47 language mapping for TMDB API (which requires xx-XX, not bare xx).
// Exported for test consumption (api-search-lang.test.js).
export const BCP_47 = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
};

// Human-readable language name (for Gemini "Respond in X." prompt prefix).
export const LANG_NAME = {
    tr: 'Türkçe',
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    ja: '日本語',
    ko: '한국어',
    zh: '中文',
};

// Resolve raw lang input to an allow-listed 2-letter code. Defaults to 'en'.
export function resolveLang(raw) {
    if (typeof raw !== 'string') return 'en';
    const norm = raw.includes('-') ? raw.split('-')[0].toLowerCase() : raw.toLowerCase();
    return BCP_47[norm] ? norm : 'en';
}

// Phase 04-02: Accept-Language fallback so browsers without an explicit body.lang
// still get correct locale (e.g., curl, server-side fetches, missing onboarding).
// Inline duplicate of src/lib/locale.js#parseAcceptLanguage — Edge functions are
// file-scoped, can't import from src/.
function parseAcceptLanguage(header) {
    if (!header || typeof header !== 'string') return [];
    return header.split(',').map((s) => {
        const trimmed = s.trim();
        if (!trimmed) return null;
        const [tag, qPart] = trimmed.split(';q=');
        if (!tag) return null;
        let q = qPart === undefined ? 1 : parseFloat(qPart);
        if (!Number.isFinite(q)) q = 0;
        return { tag: tag.trim(), q };
    }).filter(Boolean).sort((a, b) => b.q - a.q);
}

function pickLang(body, request) {
    if (body?.lang) return resolveLang(body.lang);
    const prefs = parseAcceptLanguage(request.headers.get('accept-language'));
    for (const { tag } of prefs) {
        try {
            const code = new Intl.Locale(tag).language;
            if (BCP_47[code]) return code;
        } catch {}
    }
    return 'en';
}

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
 * Round 10 r2: Gemini hallucinates TMDB IDs. Replace ID lookup with title+year+mediaType
 * search across BOTH movie and tv (when 'either'), then rank by year-proximity then popularity.
 * This is much more robust than picking the first result of a single search.
 *
 * @param {{title:string, year:number|null, mediaType:'movie'|'tv'|'either'}} suggestion
 * @param {string} apiKey - TMDB v3 API key
 * @returns {Promise<object|null>} normalized TMDB record or null
 */
async function resolveTMDB(suggestion, apiKey, lang = 'en') {
    const { title, year, mediaType } = suggestion || {};
    if (!title) return null;
    const types = (mediaType === 'either' || !mediaType) ? ['movie', 'tv'] : [mediaType];
    const tmdbLang = BCP_47[resolveLang(lang)];
    const candidates = [];
    for (const type of types) {
        try {
            const params = new URLSearchParams({
                api_key: apiKey,
                query: title,
                language: tmdbLang,
                include_adult: 'false',
            });
            // Use 'year' (movie) / 'first_air_date_year' (tv) as a soft bias — TMDB still
            // returns matching titles even if year is off, because it's a hint, not filter.
            if (year) {
                if (type === 'movie') params.set('year', String(year));
                else params.set('first_air_date_year', String(year));
            }
            const url = `https://api.themoviedb.org/3/search/${type}?${params.toString()}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) continue;
            const data = await res.json();
            const top3 = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
            for (const r of top3) {
                const dateStr = (r.release_date || r.first_air_date || '');
                const rYear = dateStr ? Number(dateStr.slice(0, 4)) : null;
                const yearDelta = (year && rYear) ? Math.abs(rYear - year) : 99;
                candidates.push({ ...r, _type: type, _yearDelta: yearDelta });
            }
        } catch {
            // try next type
        }
    }
    if (!candidates.length) return null;
    // Best: lowest year delta, then highest popularity
    candidates.sort((a, b) =>
        (a._yearDelta - b._yearDelta) || ((b.popularity || 0) - (a.popularity || 0))
    );
    const best = candidates[0];
    return {
        id: best.id,
        title: best.title || best.name,
        release_date: best.release_date || best.first_air_date || null,
        poster_path: best.poster_path || null,
        vote_average: best.vote_average || 0,
        overview: best.overview || '',
        media_type: best._type,
    };
}

// Direct REST call to Google Generative Language API. No SDK, no dynamic imports.
async function callGeminiREST(query, limit, apiKey, abortSignal, lang = 'en') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const langName = LANG_NAME[resolveLang(lang)];
    const prompt = `Respond in ${langName}.

Sen bir film ve dizi öneri uzmanısın. Kullanıcı şu tarzı bir şey izlemek istiyor: "${query}"

Bu isteğe en uygun ${limit} film veya dizi öner.

Önemli kurallar:
- Sadece gerçek, var olan filmleri/dizileri öner (TMDB'de aranabilir olmalı)
- Eğer kullanıcı açıkça "film" veya "dizi" diye belirtmediyse mediaType: 'either' döndür — biz hem filmlerde hem dizilerde arayacağız
- Kullanıcı "film" dediyse mediaType: 'movie', "dizi" dediyse mediaType: 'tv'
- Türkçe ve yabancı yapımlar karışık olabilir
- Popüler ve az bilinen yapımlar karışık olsun
- title alanı: orijinal başlığı tercih et (Inception, Breaking Bad, Şahsiyet gibi). Türkçe başlık varsa o da olur, ama TMDB'de aranabilir olmalı.
- year: çıkış yılı (4 haneli sayı). Yıl bilmiyorsan null döndür — uydurma.
- reason: 1 SHORT cümle, MAKSIMUM 80 karakter, Türkçe, neden bu öneri uygun`;

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
                                year: { type: 'integer', description: 'Çıkış yılı (bilmiyorsan 0 döndür)', nullable: true },
                                mediaType: { type: 'string', enum: ['movie', 'tv', 'either'] },
                                reason: { type: 'string', description: 'Neden önerildi — 1 cümle' },
                            },
                            required: ['title', 'mediaType', 'reason'],
                        },
                    },
                },
                required: ['suggestions'],
            },
            temperature: 0.6,
            maxOutputTokens: 4096,
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
        // Defensive partial-JSON recovery: if Gemini truncated mid-array, try to
        // clip to the last complete suggestion object and close the structure.
        // Better to return 7 of 10 suggestions than fail the whole request.
        let recovered = null;
        try {
            // Find the start of the suggestions array
            const arrStart = text.indexOf('"suggestions"');
            if (arrStart >= 0) {
                const bracketStart = text.indexOf('[', arrStart);
                if (bracketStart >= 0) {
                    // Walk forward and remember the last position where a complete
                    // object closed at depth 1 (i.e., a complete suggestion item).
                    let depth = 0;
                    let inString = false;
                    let escape = false;
                    let lastGoodEnd = -1;
                    for (let i = bracketStart; i < text.length; i++) {
                        const ch = text[i];
                        if (escape) { escape = false; continue; }
                        if (ch === '\\') { escape = true; continue; }
                        if (ch === '"') { inString = !inString; continue; }
                        if (inString) continue;
                        if (ch === '{') depth++;
                        else if (ch === '}') {
                            depth--;
                            if (depth === 1) lastGoodEnd = i; // closed an item; depth back to array level (1 = inside array)
                        } else if (ch === '[') depth++;
                        else if (ch === ']') depth--;
                    }
                    if (lastGoodEnd > bracketStart) {
                        const clipped = text.slice(0, lastGoodEnd + 1) + ']}';
                        try {
                            recovered = JSON.parse(clipped);
                        } catch { /* recovery failed */ }
                    }
                }
            }
        } catch { /* recovery threw — fall through */ }
        if (recovered) {
            console.warn('[Search] Gemini JSON truncated, recovered partial suggestions:',
                (recovered.suggestions || []).length);
            parsed = recovered;
        } else {
            throw new Error('Gemini returned invalid JSON: ' + text.slice(0, 200));
        }
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
        // Phase 04-02: body.lang wins, else Accept-Language header, else 'en'.
        const resolvedLang = pickLang(body, request);

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
            suggestions = await callGeminiREST(query, limit, geminiKey, AbortSignal.timeout(20_000), resolvedLang);
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

        // Normalize: Gemini sometimes emits year=0 when it doesn't know the year.
        // Treat 0/falsy as null so resolveTMDB doesn't filter to year=0 (no results).
        const normalized = suggestions.map(s => ({
            title: s?.title || '',
            year: (Number.isInteger(s?.year) && s.year > 1800) ? s.year : null,
            mediaType: s?.mediaType || 'either',
            reason: s?.reason || '',
        })).filter(s => s.title);

        // Enrich with TMDB via title+year+mediaType search (no ID trust).
        // Parallel batches of 5 to avoid hammering TMDB.
        const enriched = [];
        const batchSize = 5;
        for (let i = 0; i < normalized.length; i += batchSize) {
            const batch = normalized.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(s => resolveTMDB(s, tmdbKey, resolvedLang)));
            for (let j = 0; j < results.length; j++) {
                const movie = results[j];
                if (movie) {
                    movie.reason = batch[j].reason;
                    enriched.push(movie);
                }
            }
        }

        // Diagnostic logging
        console.log('[Search] query="%s" gemini=%d normalized=%d enriched=%d',
            query, suggestions.length, normalized.length, enriched.length);

        // Empty-state with diagnostic so frontend can surface a real message.
        if (enriched.length === 0) {
            const reason = normalized.length === 0 ? 'gemini_empty' : 'tmdb_lookup_failed';
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
