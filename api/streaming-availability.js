/**
 * Streaming Availability API Proxy — Phase 04.6-01 activated.
 *
 * Server-side proxy for Streaming-Availability API (RapidAPI). Keeps
 * RAPIDAPI_KEY server-side only — never exposed to the client.
 *
 * Modes
 * ─────
 *   1. Per-title lookup (legacy, used by services/streaming-cache.js):
 *        GET /api/streaming-availability?imdbId={id}&country={cc}
 *        → { options: [...], fetchedAt }
 *
 *   2. Per-region providers list (new, used by src/lib/sa-cache.js):
 *        GET /api/streaming-availability?mode=providers&country={cc}&type={movie|series}
 *        → { options: [{ service:{id,name} }, ...], fetchedAt }
 *
 * Error envelopes (all 4xx/5xx responses use this shape):
 *   { error: 'rate_limited'|'upstream_5xx'|'timeout'|'missing_param', retryAfterSec?, details? }
 *
 * Cache headers
 * ─────────────
 * 200 responses set `Cache-Control: public, s-maxage=86400, stale-while-revalidate=43200`
 * so Vercel's edge cache + downstream consumers can reuse the response for 24h with
 * a 12h SWR window. Error responses use `no-store`.
 *
 * Edge runtime: keep the legacy `export const config = { runtime: 'edge' }` syntax
 * per project CLAUDE.md (modern Next.js syntax is silently ignored by Vercel here).
 */

export const config = {
    runtime: 'edge',
};

const UPSTREAM_HOST = 'streaming-availability.p.rapidapi.com';
const UPSTREAM_TIMEOUT_MS = 8000;

function jsonResponse(body, init = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...init.headers,
    };
    return new Response(JSON.stringify(body), { ...init, headers });
}

function errorResponse(code, status, extra = {}) {
    return jsonResponse(
        { error: code, ...extra },
        {
            status,
            headers: {
                'Cache-Control': 'no-store',
            },
        }
    );
}

async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || 'title';
        const country = (searchParams.get('country') || 'us').toLowerCase();

        if (!process.env.RAPIDAPI_KEY) {
            return errorResponse('upstream_5xx', 502, { details: 'RAPIDAPI_KEY not configured' });
        }

        let upstreamUrl;
        if (mode === 'providers') {
            // Per-region providers list — uses /countries/{cc} endpoint which
            // returns the catalogue of services available in that country.
            upstreamUrl = `https://${UPSTREAM_HOST}/countries/${encodeURIComponent(country)}`;
        } else {
            const imdbId = searchParams.get('imdbId');
            if (!imdbId) {
                return errorResponse('missing_param', 400, { details: 'Missing imdbId' });
            }
            upstreamUrl = `https://${UPSTREAM_HOST}/shows/${encodeURIComponent(imdbId)}?country=${country}&series_granularity=show`;
        }

        let response;
        try {
            response = await fetchWithTimeout(upstreamUrl, {
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': UPSTREAM_HOST,
                },
            });
        } catch (err) {
            // Abort/timeout/network
            if (err?.name === 'AbortError') {
                return errorResponse('timeout', 504, { details: `Upstream > ${UPSTREAM_TIMEOUT_MS}ms` });
            }
            return errorResponse('upstream_5xx', 502, { details: err?.message || 'fetch failed' });
        }

        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
            return errorResponse('rate_limited', 429, { retryAfterSec: retryAfter });
        }

        if (response.status >= 500) {
            return errorResponse('upstream_5xx', 502, { details: `upstream ${response.status}` });
        }

        if (!response.ok) {
            return errorResponse('upstream_5xx', 502, { details: `upstream ${response.status}` });
        }

        const data = await response.json();

        let payload;
        if (mode === 'providers') {
            // SA `/countries/{cc}` returns { services: { [id]: {id, name, ...} } }.
            // Normalise to the same { options: [{ service: { id, name } }] } shape
            // the title-lookup mode emits so consumers handle both uniformly.
            const services = (data && data.services) || {};
            const options = Object.entries(services).map(([id, svc]) => ({
                service: { id, name: svc?.name || id },
            }));
            payload = { options, fetchedAt: Date.now() };
        } else {
            const options = (data.streamingOptions && data.streamingOptions[country]) || [];
            payload = { options, fetchedAt: Date.now() };
        }

        return jsonResponse(payload, {
            status: 200,
            headers: {
                // 24h edge cache + 12h SWR — matches sa-cache.js client TTL.
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
            },
        });
    } catch (error) {
        console.error('[Streaming Proxy] Error:', error);
        return errorResponse('upstream_5xx', 502, { details: error?.message || 'unknown' });
    }
}
