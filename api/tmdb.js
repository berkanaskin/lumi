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

        // Forward other query params
        for (const [key, value] of searchParams.entries()) {
            if (key !== 'endpoint') {
                tmdbUrl.searchParams.set(key, value);
            }
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
