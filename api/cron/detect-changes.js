/**
 * LUMI — Smart Notifications detection cron (Phase 05-05).
 * Vercel Serverless Function (Node.js — firebase-admin, mirrors api/quota.js).
 *
 * Daily, PREMIUM users only. For each premium user's watchlist:
 *   - PLATFORM gain: one cached region SA lookup per (country, type) group; if a watchlist
 *     item's region service-set gained a service vs its stored snapshot → inbox event.
 *   - EPISODE change: per TV item, TMDB next_episode_to_air air_date diff vs snapshot.
 * First run seeds snapshots silently (no notification storm).
 *
 * Cost bound: premium-scoped; SA is one fetch per region-group (cache-first); 0 AI calls.
 * Snapshots are stored per watchlist item: users/{uid}/watchlist/{itemId}.saSnapshot /
 * .nextEpSnapshot. Real APNs/FCM push is Phase 6 — events land in the in-app inbox.
 *
 * Secured by CRON_SECRET (Vercel sets `Authorization: Bearer <CRON_SECRET>` on cron calls).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
    groupItemsByRegionType,
    detectPlatformGain,
    detectEpisodeChange,
} from '../../src/lib/detect-changes-core.js';
import { getCachedSAProviders, extractSAServiceIds } from '../../src/lib/sa-cache.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

function firebase() {
    const app = getApps().length
        ? getApps()[0]
        : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    return getFirestore(app);
}

function authorized(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return true; // not configured → allow (dev); set it in prod.
    return req.headers.authorization === `Bearer ${secret}`;
}

function baseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return host ? `https://${host}` : '';
}

async function fetchNextEpisode(base, tmdbId) {
    try {
        const r = await fetch(`${base}/api/tmdb?endpoint=${encodeURIComponent(`/tv/${tmdbId}`)}`);
        if (!r.ok) return null;
        const j = await r.json();
        return j?.next_episode_to_air || null;
    } catch { return null; }
}

export default async function handler(req, res) {
    if (!authorized(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) { res.status(500).json({ error: 'not_configured' }); return; }

    const base = baseUrl(req);
    const db = firebase();
    const summary = { premium: 0, scannedItems: 0, events: 0, seeded: 0, skippedNoCountry: 0 };

    try {
        const premiumSnap = await db.collection('users').where('premium', '==', true).get();
        summary.premium = premiumSnap.size;

        for (const userDoc of premiumSnap.docs) {
            const uid = userDoc.id;
            const country = (userDoc.data().country || '').toLowerCase();
            const wlSnap = await userDoc.ref.collection('watchlist').get();
            if (wlSnap.empty) continue;
            const items = wlSnap.docs.map((d) => ({ _ref: d.ref, ...d.data() }));

            // ── Platform diff (cache-first, one SA fetch per region group) ──────────
            if (country) {
                const groups = groupItemsByRegionType(items, country);
                for (const [key, groupItems] of Object.entries(groups)) {
                    const type = key.endsWith(':series') ? 'series' : 'movie';
                    const sa = await getCachedSAProviders(country, type, {
                        fetchFn: (u, o) => fetch(u.startsWith('http') ? u : `${base}${u}`, o),
                    });
                    if (!sa) continue; // SA degraded → skip platform diff this run
                    const currIds = extractSAServiceIds(sa);
                    for (const item of groupItems) {
                        summary.scannedItems++;
                        const prior = item.saSnapshot?.ids ?? null;
                        const ev = detectPlatformGain(prior, currIds, item, country);
                        if (ev) {
                            await userDoc.ref.collection('notifications').add({ ...ev, createdAt: Date.now() });
                            summary.events++;
                        }
                        if (prior == null) summary.seeded++;
                        await item._ref.set(
                            { saSnapshot: { ids: Array.from(currIds), fetchedAt: Date.now() }, saCountry: country },
                            { merge: true },
                        );
                    }
                }
            } else {
                summary.skippedNoCountry++;
            }

            // ── Episode diff (per TV item) ──────────────────────────────────────────
            for (const item of items) {
                if (item.media_type !== 'tv') continue;
                const nextEp = await fetchNextEpisode(base, item.id);
                const prior = item.nextEpSnapshot ?? null;
                const ev = detectEpisodeChange(prior, nextEp, item);
                if (ev) {
                    await userDoc.ref.collection('notifications').add({ ...ev, createdAt: Date.now() });
                    summary.events++;
                }
                if (nextEp?.air_date) {
                    await item._ref.set({ nextEpSnapshot: { airDate: nextEp.air_date } }, { merge: true });
                }
            }
        }

        res.status(200).json({ ok: true, ...summary });
    } catch (error) {
        console.error('[detect-changes] error:', error?.message || error);
        res.status(500).json({ error: 'detect_failed', ...summary });
    }
}
