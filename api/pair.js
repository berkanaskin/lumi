/**
 * LUMI — Pair Mode code exchange (Phase 05-04).
 * Vercel Serverless Function (Node.js — firebase-admin, mirrors api/quota.js).
 *
 * Token-verified actions (POST { action, idToken, code? }):
 *   - 'generate' → issues a short-lived 6-char code in pairCodes/{code} (server-only) and
 *                  returns it. Requires a REAL (non-anonymous) account.
 *   - 'redeem'   → consumes the other user's code, creates the persistent pairs/{pairId}
 *                  doc { members:[a,b] }, deletes the code. Rejects self-pairing + anon.
 *   - 'status'   → returns the caller's current pair (if any).
 *
 * pairCodes is denied to all clients in firestore.rules, so codes can't be enumerated or
 * brute-forced from the browser — only this privileged endpoint reads/writes them.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { generateCode, normalizeCode, isValidCodeFormat, pairIdFor, codeExpired, CODE_TTL_MS } from '../src/lib/pairing-core.js';

export const config = { runtime: 'nodejs' };

function firebase() {
    const app = getApps().length
        ? getApps()[0]
        : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    return { db: getFirestore(app), auth: getAuth(app) };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) { res.status(500).json({ error: 'not_configured' }); return; }

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
    catch { res.status(400).json({ error: 'bad_body' }); return; }

    const { action, idToken } = body;
    if (!idToken) { res.status(401).json({ error: 'missing_token' }); return; }

    const { db, auth } = firebase();

    let token;
    try { token = await auth.verifyIdToken(idToken); }
    catch { res.status(401).json({ error: 'invalid_token' }); return; }

    // Pair Mode requires a REAL account (anonymous guests can't pair).
    if (token.firebase?.sign_in_provider === 'anonymous') {
        res.status(403).json({ error: 'account_required' });
        return;
    }
    const uid = token.uid;

    try {
        if (action === 'generate') {
            // Generate a unique code (retry a few times on collision).
            let code = '';
            for (let attempt = 0; attempt < 5; attempt++) {
                const candidate = generateCode();
                const exists = await db.collection('pairCodes').doc(candidate).get();
                if (!exists.exists) { code = candidate; break; }
            }
            if (!code) { res.status(500).json({ error: 'code_alloc_failed' }); return; }
            await db.collection('pairCodes').doc(code).set({ owner: uid, createdAt: Date.now() });
            res.status(200).json({ ok: true, code, expiresInMs: CODE_TTL_MS });
            return;
        }

        if (action === 'redeem') {
            const code = normalizeCode(body.code);
            if (!isValidCodeFormat(code)) { res.status(400).json({ error: 'bad_code' }); return; }
            const ref = db.collection('pairCodes').doc(code);
            const snap = await ref.get();
            const rec = snap.exists ? snap.data() : null;
            if (!rec || codeExpired(rec)) {
                if (snap.exists) await ref.delete().catch(() => {});
                res.status(404).json({ error: 'code_invalid' });
                return;
            }
            if (rec.owner === uid) { res.status(400).json({ error: 'self_pair' }); return; }

            const pairId = pairIdFor(uid, rec.owner);
            await db.collection('pairs').doc(pairId).set({
                members: [rec.owner, uid].sort(),
                createdAt: Date.now(),
            }, { merge: true });
            await ref.delete().catch(() => {});
            res.status(200).json({ ok: true, pairId, partner: rec.owner });
            return;
        }

        if (action === 'status') {
            const q = await db.collection('pairs').where('members', 'array-contains', uid).limit(1).get();
            if (q.empty) { res.status(200).json({ ok: true, paired: false }); return; }
            const pair = q.docs[0];
            const partner = (pair.data().members || []).find((m) => m !== uid) || null;
            res.status(200).json({ ok: true, paired: true, pairId: pair.id, partner });
            return;
        }

        res.status(400).json({ error: 'unknown_action' });
    } catch (error) {
        console.error('[pair] error:', error?.message || error);
        res.status(500).json({ error: 'pair_failed' });
    }
}
