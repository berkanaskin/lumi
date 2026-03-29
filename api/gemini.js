/**
 * Gemini AI API Proxy
 * Vercel Serverless Function
 * 
 * CRITICAL: This proxy keeps the Gemini API key server-side only.
 * The key is NEVER exposed to the client.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();
        const { prompt } = body;

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'API not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.9,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            }),
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.ok ? 200 : response.status, headers });
    } catch (error) {
        console.error('[Gemini Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'AI request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
