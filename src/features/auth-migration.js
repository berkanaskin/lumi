/**
 * LUMI - One-shot localStorage -> Firestore migration (Phase 04-03).
 *
 * On first successful sign-in for an existing guest user, lift their local
 * `liked_items` and `watchlist_items` arrays into Firestore under
 *   users/{uid}/favorites/{id}
 *   users/{uid}/watchlist/{id}
 *
 * Guarantees:
 *  - Idempotent: a `lumi_migrated_v1` flag prevents re-run on subsequent calls.
 *  - Union-merge: uses Firestore `set(..., { merge: true })` so existing remote
 *    docs (e.g. cross-device favorites already in Firestore) preserve fields
 *    like `added_at` that aren't in the local payload.
 *  - Failure-safe: if the batch write throws, the flag is NOT set, so the next
 *    `onAuthStateChanged` event will retry.
 *  - localStorage is preserved post-migration as a write-through cache so the
 *    app keeps working offline / on sign-out.
 *
 * If schema changes in the future, bump the flag (lumi_migrated_v2) to re-run.
 */

export const MIGRATION_FLAG = 'lumi_migrated_v1';

function safeReadArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * @param {{uid: string} | null | undefined} user  Firebase user from onAuthStateChanged
 * @param {object} db                              firebase.firestore() handle (v8 compat)
 * @param {{onError?: (err:Error)=>void}} [options]
 * @returns {Promise<{skipped?:boolean, migrated?:number, error?:string, reason?:string}>}
 */
export async function migrateOnAuth(user, db, options = {}) {
    if (!user?.uid) return { skipped: true, reason: 'no-user' };
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
        return { skipped: true, reason: 'already-migrated' };
    }
    if (!db || typeof db.batch !== 'function') {
        return { skipped: true, reason: 'no-db' };
    }

    const liked = safeReadArray('liked_items');
    const watch = safeReadArray('watchlist_items');

    if (liked.length === 0 && watch.length === 0) {
        // Nothing to migrate — set flag so we don't keep re-checking forever.
        localStorage.setItem(MIGRATION_FLAG, 'true');
        return { migrated: 0 };
    }

    try {
        const batch = db.batch();
        for (const item of liked) {
            if (item == null || item.id == null) continue;
            const ref = db.collection(`users/${user.uid}/favorites`).doc(String(item.id));
            batch.set(ref, item, { merge: true });
        }
        for (const item of watch) {
            if (item == null || item.id == null) continue;
            const ref = db.collection(`users/${user.uid}/watchlist`).doc(String(item.id));
            batch.set(ref, item, { merge: true });
        }
        await batch.commit();
        localStorage.setItem(MIGRATION_FLAG, 'true');
        return { migrated: liked.length + watch.length };
    } catch (err) {
        // Flag intentionally NOT set so we retry on next auth event.
         
        console.error('[auth-migration] batch failed', err);
        if (options.onError) {
            try { options.onError(err); } catch { /* swallow */ }
        }
        return { error: err?.message || String(err) };
    }
}
