/**
 * Phase 04.6-01 Task 1.2 — Streaming-Availability response cache.
 *
 * Wraps /api/streaming-availability with cost-aware caching:
 *   - Cache key:  sa:providers:{country}:{type}
 *   - TTL:        24h (override via setCacheTTL for tests)
 *   - Backend:    @vercel/functions runtime-cache when available, in-memory fallback
 *                 (a Map keyed on cache-key, value = { v, expiresAt }) otherwise
 *
 * Failure semantics (assumption A2 from PLAN):
 *   - Upstream 429 / 5xx / timeout  → return null  (signals "ignore SA layer")
 *   - DO NOT cache error responses (no negative caching — let next call retry)
 *   - 200 with empty options[]      → cache normally (legit "not available" signal)
 *
 * IMPORTANT: This module is imported from both the browser (onboarding.js,
 * detail.js) and from Node test contexts. Keep it framework-free.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let CACHE_TTL_MS = ONE_DAY_MS;
const REQUEST_TIMEOUT_MS = 8000;

// In-memory fallback store. Map<cacheKey, { v: any, expiresAt: number }>
const memStore = new Map();

/**
 * Test seam: override TTL.
 */
export function setCacheTTL(ms) {
    CACHE_TTL_MS = ms;
}
export function resetCacheTTL() {
    CACHE_TTL_MS = ONE_DAY_MS;
}

/**
 * Test seam: clear in-memory cache.
 */
export function clearSACache() {
    memStore.clear();
}

function cacheKey(country, type) {
    return `sa:providers:${String(country || '').toLowerCase()}:${String(type || 'movie').toLowerCase()}`;
}

function memGet(key) {
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memStore.delete(key);
        return null;
    }
    return entry.v;
}

function memSet(key, value) {
    memStore.set(key, { v: value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Build the /api/streaming-availability URL. The deployed proxy accepts
 * `imdbId` + `country`, but for region-wide queries we also expose a
 * country+type-only "providers list" lookup via the same endpoint with a
 * `mode=providers` flag (see api/streaming-availability.js handler).
 *
 * Tests can override by injecting a custom `fetchFn` via getCachedSAProviders.
 */
function buildSAUrl(country, type) {
    const params = new URLSearchParams({
        mode: 'providers',
        country: String(country || '').toLowerCase(),
        type: String(type || 'movie').toLowerCase(),
    });
    return `/api/streaming-availability?${params.toString()}`;
}

/**
 * Fetch with timeout. Returns Response or throws on timeout/network error.
 */
async function fetchWithTimeout(url, fetchFn) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    try {
        return await fetchFn(url, controller ? { signal: controller.signal } : {});
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * Main entry point. Returns either:
 *   - { options: [...], fetchedAt: number, _cache: 'hit'|'miss' }   (success)
 *   - null                                                            (degraded — SA unavailable)
 *
 * @param {string} country
 * @param {'movie'|'series'} type
 * @param {object} [opts]
 * @param {Function} [opts.fetchFn] — test seam, defaults to global fetch
 * @returns {Promise<object|null>}
 */
export async function getCachedSAProviders(country, type = 'movie', opts = {}) {
    const fetchFn = opts.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) return null; // no fetch available (Node without polyfill)

    const key = cacheKey(country, type);

    // ── Cache lookup ────────────────────────────────────────────────────────
    const hit = memGet(key);
    if (hit) {
        return { ...hit, _cache: 'hit' };
    }

    // ── Cache miss: fetch ───────────────────────────────────────────────────
    let response;
    try {
        response = await fetchWithTimeout(buildSAUrl(country, type), fetchFn);
    } catch (err) {
        // Timeout / network error → null (do NOT cache)
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined') console.warn('[sa-cache] fetch error:', err?.message || err);
        return null;
    }

    if (!response || !response.ok) {
        const status = response?.status || 0;
        // 429 / 5xx → degrade silently. Surface retry hint for observability only.
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined') console.warn(`[sa-cache] upstream ${status} for ${key}`);
        return null;
    }

    let data;
    try {
        data = await response.json();
    } catch {
        return null;
    }

    // Defensive: shape is { options: [...], fetchedAt: number }
    if (!data || typeof data !== 'object' || !Array.isArray(data.options)) {
        return null;
    }

    const cacheable = { options: data.options, fetchedAt: data.fetchedAt || Date.now() };
    memSet(key, cacheable);
    return { ...cacheable, _cache: 'miss' };
}

/**
 * Convenience: extract the set of SA service ids ("netflix", "prime", ...) from
 * a successful response. Returns empty Set on null / malformed input.
 */
export function extractSAServiceIds(saResponse) {
    const ids = new Set();
    if (!saResponse || !Array.isArray(saResponse.options)) return ids;
    for (const opt of saResponse.options) {
        const id = opt?.service?.id;
        if (typeof id === 'string' && id) ids.add(id.toLowerCase());
    }
    return ids;
}
