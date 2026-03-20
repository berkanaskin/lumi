/**
 * OMDb API Proxy
 * Vercel Edge Function
 *
 * Server-side proxy for the Open Movie Database (OMDb) API.
 * Keeps OMDB_API_KEY server-side only — never exposed to client.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imdbId = searchParams.get('imdbId');

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

        const apiUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${process.env.OMDB_API_KEY}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`OMDb API responded with ${response.status}`);
        }

        const data = await response.json();

        return new Response(
            JSON.stringify(data),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    } catch (error) {
        console.error('[OMDb Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'OMDb lookup failed', details: error.message }),
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
