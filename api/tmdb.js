/**
 * TMDB API Proxy
 * Vercel Serverless Function
 * 
 * This proxy allows safe API calls without exposing the API key.
 * Although TMDB key is public, this provides rate limiting and caching.
 */

export const config = {
    runtime: 'edge',
};

// BCP 47 mapping mirrors api/search.js (Edge functions are file-scoped).
const BCP_47 = {
    tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
};
function resolveLang(raw) {
    if (typeof raw !== 'string') return 'en';
    const norm = raw.includes('-') ? raw.split('-')[0].toLowerCase() : raw.toLowerCase();
    return BCP_47[norm] ? norm : 'en';
}

// Phase 04-02: Accept-Language fallback for callers without explicit ?lang.
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

function pickAcceptLangBCP47(request) {
    const prefs = parseAcceptLanguage(request.headers.get('accept-language'));
    for (const { tag } of prefs) {
        try {
            const code = new Intl.Locale(tag).language;
            if (BCP_47[code]) return BCP_47[code];
        } catch {}
    }
    return null;
}

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');
        const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

        if (!endpoint) {
            return new Response(
                JSON.stringify({ error: 'Missing endpoint parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build TMDB URL
        const tmdbUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
        tmdbUrl.searchParams.set('api_key', apiKey);

        // Language resolution precedence (Phase 04-02 adds step 3):
        //   1. explicit `lang` (2-letter) → map to BCP 47 (preferred new contract)
        //   2. legacy `language` (already BCP 47) → pass through unchanged
        //   3. Accept-Language header → first supported tag mapped to BCP 47
        //   4. default 'en-US' (NOT 'tr-TR') per i18n EN-first
        const rawLang = searchParams.get('lang');
        const legacyLanguage = searchParams.get('language');
        const tmdbLanguage = rawLang
            ? BCP_47[resolveLang(rawLang)]
            : (legacyLanguage || pickAcceptLangBCP47(request) || 'en-US');
        tmdbUrl.searchParams.set('language', tmdbLanguage);

        // Forward other query params (skip lang/language — handled above).
        for (const [key, value] of searchParams.entries()) {
            if (key === 'endpoint' || key === 'lang' || key === 'language') continue;
            tmdbUrl.searchParams.set(key, value);
        }

        const response = await fetch(tmdbUrl.toString());
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('[TMDB Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Proxy request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
