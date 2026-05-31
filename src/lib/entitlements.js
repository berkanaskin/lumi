/**
 * LUMI — entitlement abstraction (Phase 05-01).
 *
 * The SINGLE read path for "is this user premium?". Every premium feature reads
 * `isPremium()` here — no feature touches the storage directly. This is the seam
 * that lets the publishing account stay undecided: today the writer is the dev
 * mock (`setPremiumMock`); in Phase 6 the RevenueCat webhook writes the Firestore
 * `users/{uid}.premium` flag and `applyEntitlement()` mirrors the snapshot — the
 * feature code never changes, only who writes.
 *
 * Source of truth: Firestore `users/{uid}.premium`. localStorage is a
 * write-through mirror so guests/offline reads are instant and synchronous.
 */

export const PREMIUM_KEY = 'lumi_premium';

const listeners = new Set();

function emit(value) {
    for (const cb of listeners) {
        try {
            cb(value);
        } catch {
            /* a listener throwing must not break the others */
        }
    }
}

/** Synchronous premium read from the localStorage mirror. */
export function isPremium() {
    try {
        return localStorage.getItem(PREMIUM_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Mirror an authoritative entitlement value (from a Firestore snapshot or the
 * RevenueCat webhook in Phase 6) and notify listeners.
 */
export function applyEntitlement(premium) {
    const val = !!premium;
    try {
        localStorage.setItem(PREMIUM_KEY, val ? 'true' : 'false');
    } catch {
        /* storage unavailable — listeners still fire so UI can react */
    }
    emit(val);
}

/**
 * Dev-only writer used by the mock paywall (05-02). In production the paywall CTA
 * links to the stores instead of calling this. Phase 6 replaces it with the
 * RevenueCat webhook → `applyEntitlement`.
 */
export function setPremiumMock(premium) {
    applyEntitlement(premium);
}

/**
 * Subscribe to entitlement changes. Returns an unsubscribe fn.
 * @param {(premium:boolean)=>void} cb
 */
export function onEntitlementChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
