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

// Phase 04-02: Accept-Language fallback for callers without explicit body.lang.
function parseAcceptLanguage(header) {
    if (!header || typeof header !== 'string') return [];
    return header.split(',').map((s) => {
        const trimmed = s.trim();
        if (!trimmed) return null;
        const [tag, qPart] = trimmed.split(';q=');
        if (!tag) return null;
        let q = qPart === undefined ? 1 : parseFloat(qPart);
        if (!Number.isFinite(q)) q = 0;
        return { tag: tag.trim(), q };
    }).filter(Boolean).sort((a, b) => b.q - a.q);
}

function pickLang(body, request) {
    if (body?.lang) return resolveLang(body.lang);
    const prefs = parseAcceptLanguage(request.headers.get('accept-language'));
    for (const { tag } of prefs) {
        try {
            const code = new Intl.Locale(tag).language;
            if (LANG_NAME[code]) return code;
        } catch {}
    }
    return 'en';
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
        const { prompt, feature } = body;

        // Phase 05-05: the 'evening' feature uses a higher-diversity sampling but otherwise
        // shares this proxy. The branch only tweaks generation; the request shape is unchanged.
        const isEvening = feature === 'evening';

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Phase 04-02: body.lang wins, else Accept-Language, else 'en'.
        const resolvedLang = pickLang(body, request);
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
                    // Evening picks want a short, varied list → slightly higher temperature,
                    // tighter token budget. Default search behavior is unchanged.
                    temperature: isEvening ? 1.0 : 0.9,
                    topP: 0.95,
                    maxOutputTokens: isEvening ? 256 : 2048,
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
