/**
 * YouTube API Proxy
 * Vercel Serverless Function
 * 
 * Proxies YouTube Data API requests with caching.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');
        const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;

        if (!endpoint) {
            return new Response(
                JSON.stringify({ error: 'Missing endpoint parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build YouTube URL
        const youtubeUrl = new URL(`https://www.googleapis.com/youtube/v3${endpoint}`);
        youtubeUrl.searchParams.set('key', apiKey);

        // Forward other query params
        for (const [key, value] of searchParams.entries()) {
            if (key !== 'endpoint') {
                youtubeUrl.searchParams.set(key, value);
            }
        }

        const response = await fetch(youtubeUrl.toString());
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
        console.error('[YouTube Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Proxy request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
