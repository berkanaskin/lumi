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

        // Language resolution precedence:
        //   1. explicit `lang` (2-letter) → map to BCP 47 (preferred new contract)
        //   2. legacy `language` (already BCP 47) → pass through unchanged
        //   3. neither → default to 'en-US' (NOT 'tr-TR') per i18n EN-first
        const rawLang = searchParams.get('lang');
        const legacyLanguage = searchParams.get('language');
        const tmdbLanguage = rawLang
            ? BCP_47[resolveLang(rawLang)]
            : (legacyLanguage || 'en-US');
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
