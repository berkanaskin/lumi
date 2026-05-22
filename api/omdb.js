/**
 * OMDb API Proxy
 * Vercel Edge Function
 *
 * Server-side proxy for the Open Movie Database (OMDb) API.
 * Keeps OMDB_API_KEY server-side only — never exposed to client.
 *
 * Phase 04.6-02: Hardened error envelope for trivia grounding fallback.
 *   - 8s AbortController timeout → { error: 'timeout' }
 *   - 429 → { error: 'rate_limited' }
 *   - 5xx → { error: 'upstream_5xx' }
 *   - Accepts ?imdbId= (legacy) and ?i= (OMDB-native) for compatibility.
 */

export const config = {
    runtime: 'edge',
};

const TIMEOUT_MS = 8000;
const JSON_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};

function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imdbId = searchParams.get('imdbId') || searchParams.get('i');

        if (!imdbId || !/^tt\d{5,}$/.test(imdbId)) {
            return jsonResponse({ error: 'invalid_imdb_id' }, 400);
        }

        if (!process.env.OMDB_API_KEY) {
            return jsonResponse({ error: 'not_configured' }, 500);
        }

        const apiUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${process.env.OMDB_API_KEY}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response;
        try {
            response = await fetch(apiUrl, { signal: controller.signal });
        } catch (err) {
            clearTimeout(timer);
            if (err?.name === 'AbortError') {
                return jsonResponse({ error: 'timeout' }, 504);
            }
            return jsonResponse({ error: 'upstream_5xx', details: err?.message }, 502);
        }
        clearTimeout(timer);

        if (response.status === 429) {
            return jsonResponse({ error: 'rate_limited' }, 429);
        }
        if (response.status >= 500) {
            return jsonResponse({ error: 'upstream_5xx', status: response.status }, 502);
        }
        if (!response.ok) {
            return jsonResponse({ error: 'upstream_error', status: response.status }, response.status);
        }

        const data = await response.json();
        return jsonResponse(data, 200);
    } catch (error) {
        console.error('[OMDb Proxy] Error:', error);
        return jsonResponse({ error: 'unexpected', details: error?.message }, 500);
    }
}
