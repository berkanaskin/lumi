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

// Language allow-list + human-readable names for the "Respond in X." prompt prefix.
// Mirrors api/search.js BCP_47/LANG_NAME (Edge functions are file-scoped).
const LANG_NAME = {
    tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français',
    es: 'Español', ja: '日本語', ko: '한국어', zh: '中文',
};
function resolveLang(raw) {
    if (typeof raw !== 'string') return 'en';
    const norm = raw.includes('-') ? raw.split('-')[0].toLowerCase() : raw.toLowerCase();
    return LANG_NAME[norm] ? norm : 'en';
}

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
        const { prompt, lang } = body;

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Prepend "Respond in {LanguageName}." so Gemini emits the right locale.
        const resolvedLang = resolveLang(lang);
        const localizedPrompt = `Respond in ${LANG_NAME[resolvedLang]}.\n\n${prompt}`;

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
                contents: [{ parts: [{ text: localizedPrompt }] }],
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
