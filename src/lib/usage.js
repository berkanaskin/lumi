/**
 * LUMI — free-tier AI quota logic (Phase 05-01).
 *
 * Pure, runtime-agnostic helpers shared by the client (remaining-quota display)
 * and the server gate (api/gemini.js). The daily counter is keyed by the user's
 * LOCAL date so it resets at their local 00:00 — the same `tz` that drives the
 * Evening Assistant's local-20:00 delivery (05-05).
 *
 * The locked decision (PREMIUM-PRICING.md §6): 5 AI "Öner Bana" queries/day,
 * enforced server-side, reset daily at the user's local midnight.
 */

export const FREE_DAILY_LIMIT = 5;

/**
 * The YYYY-MM-DD calendar date at `now` in the given IANA timezone.
 * Used as the Firestore usage doc id so the count resets at local midnight.
 * Falls back to UTC for a missing/invalid tz rather than throwing.
 *
 * @param {string} tz   IANA zone, e.g. "Europe/Istanbul"
 * @param {number} now  epoch ms (defaults to Date.now())
 * @returns {string} "YYYY-MM-DD"
 */
export function localDateKey(tz, now = Date.now()) {
    const d = new Date(now);
    // en-CA formats as ISO-like YYYY-MM-DD.
    const fmt = (zone) =>
        new Intl.DateTimeFormat('en-CA', {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    try {
        return fmt(tz || 'UTC');
    } catch {
        return fmt('UTC');
    }
}

/** Free queries left today, clamped to [0, limit]. Nullish/garbage counts → 0 used. */
export function remainingQuota(count, limit = FREE_DAILY_LIMIT) {
    const c = Number(count);
    const used = Number.isFinite(c) ? c : 0;
    return Math.max(0, limit - used);
}

/** True once the free user has spent the day's allowance (the next query is blocked). */
export function isOverQuota(count, limit = FREE_DAILY_LIMIT) {
    const c = Number(count);
    const used = Number.isFinite(c) ? c : 0;
    return used >= limit;
}

/**
 * Pure server-gate decision. api/gemini.js wires token-verify + Firestore read/
 * increment around this; keeping the policy pure makes it fully unit-testable.
 *
 * @param {{premium?:boolean, count?:number, limit?:number}} input
 *   count = queries already spent today (BEFORE this one).
 * @returns {{allow:boolean, status:number, remaining:number, premium:boolean, error?:string}}
 */
export function evaluateQuota({ premium = false, count = 0, limit = FREE_DAILY_LIMIT } = {}) {
    if (premium) {
        return { allow: true, status: 200, remaining: Infinity, premium: true };
    }
    if (isOverQuota(count, limit)) {
        return { allow: false, status: 429, remaining: 0, premium: false, error: 'quota_exceeded' };
    }
    return { allow: true, status: 200, remaining: remainingQuota(count, limit), premium: false };
}
