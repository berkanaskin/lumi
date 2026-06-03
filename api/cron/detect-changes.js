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
    // 05-final: fail-secure. With no secret set, only allow Vercel's own cron caller
    // (which sets x-vercel-cron); reject arbitrary public callers.
    if (!secret) return !!req.headers['x-vercel-cron'];
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
            // 05-final: per-user isolation — one user's Firestore error must not abort the run.
            try {
                const country = (userDoc.data().country || '').toLowerCase();
                const wlSnap = await userDoc.ref.collection('watchlist').get();
                if (wlSnap.empty) continue;
                const items = wlSnap.docs.map((d) => ({ _ref: d.ref, ...d.data() }));

                // ── Platform diff (cache-first, one SA fetch per region group) ──────
                if (country) {
                    const groups = groupItemsByRegionType(items, country);
                    for (const [key, groupItems] of Object.entries(groups)) {
                        const type = key.endsWith(':series') ? 'series' : 'movie';
                        const sa = await getCachedSAProviders(country, type, {
                            fetchFn: (u, o) => fetch(u.startsWith('http') ? u : `${base}${u}`, o),
                        });
                        if (!sa) {
                            // 05-final: SA degraded → stamp a dated marker so we don't re-fetch
                            // this region every run, but DON'T corrupt the real saSnapshot.ids.
                            for (const item of groupItems) {
                                await item._ref.set({ saDegradedAt: Date.now() }, { merge: true }).catch(() => {});
                            }
                            continue;
                        }
                        const currIds = extractSAServiceIds(sa);
                        for (const item of groupItems) {
                            summary.scannedItems++;
                            const prior = item.saSnapshot?.ids ?? null;
                            // 05-final: persist the snapshot BEFORE writing the event, so a crash
                            // can't leave a notification with a stale (null) snapshot that re-fires.
                            await item._ref.set(
                                { saSnapshot: { ids: Array.from(currIds), fetchedAt: Date.now() }, saCountry: country },
                                { merge: true },
                            ).catch((e) => console.error('[detect-changes] sa snapshot write failed', e?.message));
                            if (prior == null) { summary.seeded++; continue; }
                            const ev = detectPlatformGain(prior, currIds, item, country);
                            if (ev) {
                                await userDoc.ref.collection('notifications').add({ ...ev, createdAt: Date.now() })
                                    .then(() => { summary.events++; })
                                    .catch((e) => console.error('[detect-changes] notif write failed', e?.message));
                            }
                        }
                    }
                } else {
                    summary.skippedNoCountry++;
                }

                // ── Episode diff (per TV item) ──────────────────────────────────────
                for (const item of items) {
                    if (item.media_type !== 'tv') continue;
                    const nextEp = await fetchNextEpisode(base, item.id);
                    const prior = item.nextEpSnapshot ?? null;
                    // 05-final: always persist current state (incl. "no upcoming episode" → null)
                    // BEFORE the event, so the snapshot never goes stale and can't re-fire.
                    await item._ref.set(
                        { nextEpSnapshot: nextEp?.air_date ? { airDate: nextEp.air_date } : null },
                        { merge: true },
                    ).catch((e) => console.error('[detect-changes] ep snapshot write failed', e?.message));
                    const ev = detectEpisodeChange(prior, nextEp, item);
                    if (ev) {
                        await userDoc.ref.collection('notifications').add({ ...ev, createdAt: Date.now() })
                            .then(() => { summary.events++; })
                            .catch((e) => console.error('[detect-changes] notif write failed', e?.message));
                    }
                }
            } catch (userErr) {
                console.error(`[detect-changes] user ${userDoc.id} failed:`, userErr?.message || userErr);
            }
        }

        res.status(200).json({ ok: true, ...summary });
    } catch (error) {
        console.error('[detect-changes] error:', error?.message || error);
        res.status(500).json({ error: 'detect_failed', ...summary });
    }
}
