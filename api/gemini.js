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

        // Model fallback chain — if one model's quota is exhausted, try next
        const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
        const reqBody = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        });

        for (const model of models) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: reqBody,
            });

            if (response.ok) {
                const data = await response.json();
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // If 429 (quota), try next model
            if (response.status === 429) {
                console.warn(`[Gemini] ${model} quota exceeded, trying next...`);
                continue;
            }

            // Other errors — return as-is
            const errData = await response.json();
            return new Response(JSON.stringify(errData), {
                status: response.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // All models exhausted
        return new Response(
            JSON.stringify({ error: 'Tum AI modelleri su an mesgul, lutfen biraz sonra tekrar deneyin' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error) {
        console.error('[Gemini Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'AI request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
