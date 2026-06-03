/**
 * LUMI — Pair Mode pure logic (Phase 05-04).
 *
 * Framework-free helpers for the 6-digit pairing flow + the dual-history recommendation
 * prompt. Side-effects (Firestore code issue/redeem, the pairs/{pairId} doc, the AI call)
 * live in api/pair.js + src/features/pair-mode.js; this module is fully unit-testable.
 *
 * Pairing model: one user generates a short-lived 6-char code; the other redeems it; a
 * persistent pairs/{pairId} doc links both UIDs. Both must be REAL accounts (not anon).
 */

const CODE_TTL_MS = 10 * 60 * 1000; // unredeemed codes expire after 10 minutes
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

/** Normalize user-entered code: uppercase, strip spaces/dashes. */
export function normalizeCode(code) {
    return String(code || '').toUpperCase().replace(/[\s-]/g, '');
}

/** 6 chars from the unambiguous alphabet. */
export function isValidCodeFormat(code) {
    return /^[A-Z0-9]{6}$/.test(normalizeCode(code));
}

/**
 * Generate a 6-char code. Accepts an injectable randomInt(maxExclusive) for deterministic
 * tests; defaults to crypto/Math at the call site (kept out of this pure module's default).
 */
export function generateCode(randomInt) {
    const rnd = typeof randomInt === 'function'
        ? randomInt
        : (max) => Math.floor(Math.random() * max);
    let out = '';
    for (let i = 0; i < 6; i++) out += CODE_ALPHABET[rnd(CODE_ALPHABET.length)];
    return out;
}

/** Deterministic, order-independent pair id from two uids. */
export function pairIdFor(a, b) {
    return [String(a), String(b)].sort().join('__');
}

/** Has an unredeemed code record expired? Missing record = expired. */
export function codeExpired(record, now = Date.now(), ttl = CODE_TTL_MS) {
    if (!record || record.createdAt == null) return true;
    return now - record.createdAt > ttl;
}

/** Union of two id collections, coerced to strings. */
export function mergeSeenIds(aIds, bIds) {
    const set = new Set();
    for (const id of aIds || []) set.add(String(id));
    for (const id of bIds || []) set.add(String(id));
    return set;
}

function titlesOf(taste) {
    return [...(taste?.likedTitles || []), ...(taste?.ratedTitles || [])].slice(0, 20);
}

/** Prompt for the pair recommendation: titles neither has seen and both would enjoy. */
export function buildPairPrompt(tasteA, tasteB, lang = 'en') {
    const a = titlesOf(tasteA);
    const b = titlesOf(tasteB);
    const parts = [];
    parts.push('Recommend 5 titles (movies or TV series) for TWO people watching together.');
    parts.push('Return titles that BOTH would likely enjoy and that fall in the overlap of their tastes.');
    if (a.length) parts.push(`Person A likes: ${a.join(', ')}.`);
    if (b.length) parts.push(`Person B likes: ${b.join(', ')}.`);
    parts.push('Avoid anything either person has obviously already seen. Prefer a confident, crowd-pleasing middle ground.');
    if (lang === 'tr') parts.push('Respond in Turkish.');
    return parts.join(' ');
}

export { CODE_TTL_MS };
