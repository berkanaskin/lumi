/**
 * Streaming Availability API Proxy
 * Vercel Edge Function
 *
 * Server-side proxy for Streaming Availability API (RapidAPI).
 * Keeps RAPIDAPI_KEY server-side only — never exposed to client.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imdbId = searchParams.get('imdbId');
        const country = (searchParams.get('country') || 'tr').toLowerCase();

        if (!imdbId) {
            return new Response(
                JSON.stringify({ error: 'Missing imdbId' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                }
            );
        }

        const apiUrl = `https://streaming-availability.p.rapidapi.com/shows/${encodeURIComponent(imdbId)}?country=${country}&series_granularity=show`;

        const response = await fetch(apiUrl, {
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
            },
        });

        if (!response.ok) {
            throw new Error(`Streaming API responded with ${response.status}`);
        }

        const data = await response.json();
        const options = (data.streamingOptions && data.streamingOptions[country]) || [];

        return new Response(
            JSON.stringify({ options, fetchedAt: Date.now() }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    } catch (error) {
        console.error('[Streaming Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Streaming lookup failed', details: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    }
}
