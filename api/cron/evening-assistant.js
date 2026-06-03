/**
 * LUMI — Evening Assistant cron (Phase 05-05).
 * Vercel Serverless Function (Node.js — firebase-admin, mirrors api/quota.js).
 *
 * Runs HOURLY. Selects PREMIUM users whose local time is 20:00 right now (users/{uid}.tz),
 * builds a taste profile from their Firestore favorites/watchlist, asks Gemini for exactly 3
 * titles, and writes one evening_pick event to their inbox. Idempotent per local day
 * (users/{uid}.lastEveningPick = local date). 1 AI call per user per day — cost bounded.
 *
 * Secured by CRON_SECRET. Real push is Phase 6 — the event lands in the in-app inbox.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
    selectEveningUsers,
    localDateKey,
    parseEveningTitles,
    buildEveningPickEvent,
} from '../../src/lib/evening-core.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

function firebase() {
    const app = getApps().length
        ? getApps()[0]
        : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    return getFirestore(app);
}

function authorized(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return true;
    return req.headers.authorization === `Bearer ${secret}`;
}

function baseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return host ? `https://${host}` : '';
}

async function tasteFor(userRef) {
    const [likes, watch] = await Promise.all([
        userRef.collection('favorites').get().catch(() => ({ docs: [] })),
        userRef.collection('watchlist').get().catch(() => ({ docs: [] })),
    ]);
    const titlesOf = (snap) => (snap.docs || []).map((d) => d.data()?.title || d.data()?.name).filter(Boolean);
    return { liked: titlesOf(likes).slice(0, 25), watchlist: titlesOf(watch).slice(0, 15) };
}

function eveningPrompt(taste, lang) {
    const liked = taste.liked.length ? `I like: ${taste.liked.join(', ')}.` : '';
    const wl = taste.watchlist.length ? `On my watchlist: ${taste.watchlist.join(', ')}.` : '';
    return `It is evening. Suggest EXACTLY 3 titles (movies or TV series) for a relaxed night in. ${liked} ${wl} `
        + `Avoid the obvious blockbusters; give a confident, slightly non-obvious mix. `
        + `Return ONLY a numbered list of 3 titles, no extra text.${lang === 'tr' ? ' Respond in Turkish.' : ''}`;
}

async function askGemini(base, prompt, lang) {
    try {
        const r = await fetch(`${base}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, lang, feature: 'evening' }),
        });
        if (!r.ok) return null;
        const j = await r.json();
        return j?.text || j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch { return null; }
}

export default async function handler(req, res) {
    if (!authorized(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) { res.status(500).json({ error: 'not_configured' }); return; }

    const base = baseUrl(req);
    const db = firebase();
    const now = Date.now();
    const summary = { premium: 0, selected: 0, delivered: 0 };

    try {
        const premiumSnap = await db.collection('users').where('premium', '==', true).get();
        summary.premium = premiumSnap.size;

        const users = premiumSnap.docs.map((d) => ({ uid: d.id, ref: d.ref, ...d.data() }));
        const selected = selectEveningUsers(users, now);
        summary.selected = selected.length;

        for (const u of selected) {
            const lang = (u.lang || (String(u.country).toLowerCase() === 'tr' ? 'tr' : 'en'));
            const taste = await tasteFor(u.ref);
            const text = await askGemini(base, eveningPrompt(taste, lang), lang);
            const picks = parseEveningTitles(text || '');
            if (!picks.length) continue;
            const ev = buildEveningPickEvent(picks, lang);
            await u.ref.collection('notifications').add({ ...ev, createdAt: now });
            await u.ref.set({ lastEveningPick: localDateKey(u.tz || 'UTC', now) }, { merge: true });
            summary.delivered++;
        }

        res.status(200).json({ ok: true, ...summary });
    } catch (error) {
        console.error('[evening-assistant] error:', error?.message || error);
        res.status(500).json({ error: 'evening_failed', ...summary });
    }
}
