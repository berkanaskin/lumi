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

        // Model fallback + retry: if rate limited, wait and retry or try next model
        const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
        const reqBody = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        });

        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

        for (const model of models) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            // Try up to 2 times per model (initial + 1 retry after wait)
            for (let attempt = 0; attempt < 2; attempt++) {
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: reqBody,
                });

                if (response.ok) {
                    const data = await response.json();
                    return new Response(JSON.stringify(data), { status: 200, headers });
                }

                if (response.status === 429) {
                    if (attempt === 0) {
                        // First 429: wait 5 seconds and retry same model
                        await new Promise(r => setTimeout(r, 5000));
                        continue;
                    }
                    // Second 429: move to next model
                    console.warn(`[Gemini] ${model} rate limited after retry, trying next model...`);
                    break;
                }

                // Other errors — return
                const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
                return new Response(JSON.stringify(errData), { status: response.status, headers });
            }
        }

        return new Response(
            JSON.stringify({ error: 'AI su an yogun, lutfen 1 dakika sonra tekrar deneyin' }),
            { status: 429, headers }
        );
    } catch (error) {
        console.error('[Gemini Proxy] Error:', error);
        return new Response(
            JSON.stringify({ error: 'AI request failed', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
