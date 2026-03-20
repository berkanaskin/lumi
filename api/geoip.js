/**
 * GeoIP Country Detection Proxy
 * Vercel Edge Function
 *
 * Detects the user's country via ipapi.co (free, no API key required).
 * Returns a safe fallback (TR) on any error.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const response = await fetch('https://ipapi.co/json/');

        if (!response.ok) {
            throw new Error(`ipapi.co responded with ${response.status}`);
        }

        const data = await response.json();

        return new Response(
            JSON.stringify({
                countryCode: data.country_code,
                countryName: data.country_name,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    } catch (error) {
        console.error('[GeoIP Proxy] Error:', error);
        // Safe fallback — never fail, return Turkey as default
        return new Response(
            JSON.stringify({ countryCode: 'TR', countryName: 'Turkey' }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    }
}
