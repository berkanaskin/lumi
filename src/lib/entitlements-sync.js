/**
 * LUMI — entitlement sync (Phase 05-01 completion).
 *
 * Mirrors the SERVER source of truth (Firestore `users/{uid}.premium`) into the
 * client entitlement mirror whenever auth state changes. Without this, `isPremium()`
 * would only ever reflect the dev mock — a real premium user (or, for testing, the
 * owner flipping `premium:true` in the Firestore console) would never unlock the
 * client features. In Phase 6 the RevenueCat webhook writes the same flag.
 *
 * Only REAL (non-anonymous) users can be premium — anonymous guests can't purchase.
 */
import { applyEntitlement } from './entitlements.js';

/** Pure: derive premium from the firebase user + their Firestore user-doc data. */
export function resolvePremium(firebaseUser, docData) {
    if (!firebaseUser || firebaseUser.isAnonymous) return false;
    return !!(docData && docData.premium === true);
}

/** Read the current user's premium flag from Firestore (v8 compat) → client mirror. */
export function syncEntitlementFromAuth() {
    try {
        const fb = typeof window !== 'undefined' ? window.firebase : null;
        const u = fb?.auth?.()?.currentUser;
        if (!u || u.isAnonymous) {
            applyEntitlement(false);
            return;
        }
        const db = fb.firestore?.();
        if (!db) return;
        db.collection('users').doc(u.uid).get()
            .then((doc) => applyEntitlement(resolvePremium(u, doc && doc.exists ? doc.data() : null)))
            .catch(() => { /* offline / rules — keep last known mirror */ });
    } catch {
        /* firebase unavailable — leave mirror as-is */
    }
}

if (typeof window !== 'undefined' && !window.__lumiEntSync) {
    window.__lumiEntSync = true;
    window.addEventListener('authStateChanged', () => syncEntitlementFromAuth());
}
