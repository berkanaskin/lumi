/**
 * LUMI — free-tier AI quota gate (Phase 05-01).
 * Vercel Serverless Function (Node.js — needs firebase-admin, like cost-dashboard.js).
 *
 * The metered "Öner Bana" search (POST /api/search) is Edge and stays untouched.
 * The client calls THIS endpoint first to check-and-consume one daily query:
 *   - allow:true  → proceed to /api/search
 *   - 429 quota_exceeded → open the paywall (05-02)
 *
 * Why a separate Node endpoint instead of gating search.js directly: search.js is
 * locked to the Edge runtime (latency), where firebase-admin can't run. This mirrors
 * the project's existing Node+firebase-admin pattern (cost-dashboard.js, embeddings.js)
 * and reuses the already-configured FIREBASE_SERVICE_ACCOUNT env.
 *
 * The count lives in users/{uid}/usage/{localDate}.count, written ONLY here with a
 * privileged credential — Firestore security rules deny client writes to usage/*,
 * so the cap cannot be forged from the browser. That is the real server-side enforcement.
 *
 * Pure policy mirror of src/lib/usage.js (Edge/Node functions are file-scoped and
 * can't import from src/, per the project convention — kept inline + tested there).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const config = {
    runtime: 'nodejs',
};

const FREE_DAILY_LIMIT = 5;

/** YYYY-MM-DD at `now` in the given IANA tz; falls back to UTC. (mirror of usage.js) */
function localDateKey(tz, now = Date.now()) {
    const fmt = (zone) =>
        new Intl.DateTimeFormat('en-CA', {
            timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(now));
    try { return fmt(tz || 'UTC'); } catch { return fmt('UTC'); }
}

/** Pure gate decision. (mirror of usage.js#evaluateQuota) */
function evaluateQuota({ premium = false, count = 0, limit = FREE_DAILY_LIMIT } = {}) {
    if (premium) return { allow: true, status: 200, remaining: -1, premium: true };
    const used = Number.isFinite(Number(count)) ? Number(count) : 0;
    if (used >= limit) {
        return { allow: false, status: 429, remaining: 0, premium: false, error: 'quota_exceeded' };
    }
    return { allow: true, status: 200, remaining: Math.max(0, limit - used), premium: false };
}

function firebase() {
    const app = getApps().length
        ? getApps()[0]
        : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    return { db: getFirestore(app), auth: getAuth(app) };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            res.status(500).json({ error: 'not_configured' });
            return;
        }
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { idToken, tz } = body;
        if (!idToken) {
            res.status(401).json({ error: 'missing_token' });
            return;
        }

        const { db, auth } = firebase();

        let uid;
        try {
            ({ uid } = await auth.verifyIdToken(idToken));
        } catch {
            res.status(401).json({ error: 'invalid_token' });
            return;
        }

        const userRef = db.collection('users').doc(uid);

        // Read tier + tz. If even this read fails we cannot tell free from premium, so we
        // fail OPEN (rare deep outage — never punish a possibly-paying user).
        let premium = false;
        let storedTz = null;
        try {
            const userData = (await userRef.get()).data() || {};
            premium = userData.premium === true;
            storedTz = userData.tz || null;
        } catch (readErr) {
            console.error('[Quota] user read failed, failing open:', readErr?.message || readErr);
            res.status(200).json({ allow: true, premium: false, remaining: null, degraded: true });
            return;
        }

        const effectiveTz = tz || storedTz || 'UTC';

        // Persist tz once (drives local-midnight reset + Evening Assistant local 20:00).
        // Swallow + log so a tz write hiccup never blocks the quota check.
        if (tz && storedTz !== tz) {
            userRef.set({ tz }, { merge: true }).catch((e) => {
                console.warn('[Quota] tz persistence failed:', e?.message || e);
            });
        }

        const dateKey = localDateKey(effectiveTz);
        const usageRef = userRef.collection('usage').doc(dateKey);

        // Atomic read → check → increment in one transaction. This closes the TOCTOU bypass
        // where N parallel "6th queries" each read count<5 and all slip through: Firestore
        // serializes the transaction (auto-retrying on contention) so the cap holds.
        let decision;
        try {
            decision = await db.runTransaction(async (tx) => {
                const count = ((await tx.get(usageRef)).data() || {}).count || 0;
                const d = evaluateQuota({ premium, count });
                if (d.allow) {
                    tx.set(usageRef, { count: FieldValue.increment(1) }, { merge: true });
                }
                return d;
            });
        } catch (txErr) {
            // A transaction failure here is effectively a Firestore outage (it auto-retries
            // on mere contention) — the whole app is already degraded. Fail OPEN rather than
            // block search; the only client-triggerable bypass (concurrency) is closed above.
            console.error('[Quota] usage transaction failed, failing open:', txErr?.message || txErr);
            res.status(200).json({ allow: true, premium, remaining: null, degraded: true });
            return;
        }

        if (!decision.allow) {
            res.status(429).json({ error: 'quota_exceeded', remaining: 0, premium: false });
            return;
        }

        res.status(200).json({
            allow: true,
            premium: decision.premium,
            remaining: decision.premium ? -1 : Math.max(0, decision.remaining - 1),
        });
    } catch (error) {
        console.error('[Quota] error:', error?.message || error);
        // Fail-open on infra errors so a Firestore hiccup never blocks a paying flow.
        res.status(200).json({ allow: true, premium: false, remaining: null, degraded: true });
    }
}
