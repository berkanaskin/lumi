/**
 * LUMI - Auth Profile Update Helper
 * Pure function (dependency-injected) used by both AuthService and tests.
 *
 * Threat mitigations:
 *  - T-03.2-03-01: rejects non-HTTPS photoURL
 *  - T-03.2-03-02: trims and caps displayName at 40 chars (caller must use textContent for render)
 *  - T-03.2-03-03: Firestore rules enforce request.auth.uid == uid (verified separately)
 */

const NAME_MAX = 40;

/**
 * Update Firebase Auth + Firestore user profile.
 * @param {{auth:any, db:any, syncUserToLocal: Function}} ctx
 * @param {string|undefined} displayName
 * @param {string|undefined} photoURL
 */
export async function updateUserProfileImpl(ctx, displayName, photoURL) {
    const { auth, db, syncUserToLocal } = ctx;
    const user = auth?.currentUser;
    if (!user) {
        throw new Error('Not logged in');
    }

    // Build sanitized payload — Firebase compat v8: only set fields provided.
    const authPayload = {};
    const firestorePayload = {};

    if (displayName !== undefined && displayName !== null) {
        const cleaned = String(displayName).trim().slice(0, NAME_MAX);
        if (cleaned.length === 0) {
            throw new Error('Display name cannot be empty');
        }
        authPayload.displayName = cleaned;
        firestorePayload.displayName = cleaned;
    }

    if (photoURL !== undefined && photoURL !== null) {
        if (!/^https:\/\//i.test(photoURL)) {
            throw new Error('photoURL must use HTTPS');
        }
        authPayload.photoURL = photoURL;
        firestorePayload.photoURL = photoURL;
    }

    if (Object.keys(authPayload).length === 0) {
        return; // nothing to do
    }

    // 1) Auth first — primary source of truth
    await user.updateProfile(authPayload);

    // 2) Firestore — best-effort sync, log on error but do not undo Auth update
    if (db) {
        try {
            await db.collection('users').doc(user.uid).update(firestorePayload);
        } catch (err) {
            // If document doesn't exist yet, create it
            if (err && (err.code === 'not-found' || /no document/i.test(err.message || ''))) {
                try {
                    await db.collection('users').doc(user.uid).set(firestorePayload, { merge: true });
                } catch (setErr) {
                    console.warn('[updateUserProfile] Firestore set failed:', setErr);
                }
            } else {
                console.warn('[updateUserProfile] Firestore update failed:', err);
            }
        }
    }

    // 3) Resync local — Pitfall 3: dispatch authStateChanged so UI reacts
    if (typeof syncUserToLocal === 'function') {
        syncUserToLocal(auth.currentUser);
    }
}
