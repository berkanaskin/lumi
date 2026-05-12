/**
 * GeoIP Country Detection
 * Vercel Edge Function
 *
 * Primary: Vercel's built-in `request.geo.country` — free, fast, no rate limit.
 * Fallback: ipapi.co (for local dev where request.geo is undefined, or for
 * regions Vercel cannot resolve). Final fallback: `{ countryCode: 'XX' }` so
 * callers can detect "unknown" without retrying.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    // Primary: Vercel built-in geo header.
    const country = request.geo?.country;
    if (country) {
        return new Response(
            JSON.stringify({
                countryCode: country,
                countryName: country,
                source: 'vercel',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600',
                },
            }
        );
    }

    // Fallback: ipapi.co (forward the client IP via X-Forwarded-For so we don't
    // resolve to the Edge runtime's IP).
    try {
        const xff = request.headers.get('x-forwarded-for');
        const res = await fetch('https://ipapi.co/json/', {
            headers: xff ? { 'X-Forwarded-For': xff } : {},
        });
        if (res.ok) {
            const data = await res.json();
            return new Response(
                JSON.stringify({
                    countryCode: data.country_code,
                    countryName: data.country_name,
                    source: 'ipapi',
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                }
            );
        }
    } catch (error) {
        console.error('[GeoIP] ipapi fallback failed:', error);
    }

    // Final fallback: explicit "unknown". Callers can decide what to do.
    return new Response(
        JSON.stringify({ countryCode: 'XX', countryName: 'Unknown', source: 'fallback' }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        }
    );
}
