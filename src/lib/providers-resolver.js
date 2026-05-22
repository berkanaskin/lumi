/**
 * Phase 04.6-01 Task 1.3 — 3-layer providers resolver.
 *
 * Layer order (highest authority first):
 *   1. Curated per-region list   (src/data/region-platforms.js)
 *      — defines presence + display order + preSelected flags
 *   2. Streaming-Availability    (src/lib/sa-cache.js)
 *      — annotates live=true|false per item (NEVER filters out curated entries;
 *        SA non-EN coverage is patchy per assumption A1)
 *   3. TMDB                      (fetchProviders from src/features/onboarding.js)
 *      — last-resort fallback only when curated is empty
 *
 * Output shape (consumed by onboarding S2 + detail overlay):
 *   {
 *     id:          number   — TMDB provider id (keys ownedPlatforms set)
 *     name:        string
 *     slug:        string
 *     logoUrl:     string
 *     preSelected: boolean
 *     live:        boolean|null — SA-confirmed (true), SA-says-absent (false), unknown (null)
 *     source:      'curated' | 'tmdb-fallback'
 *   }
 */

import { getCuratedForCountry, FALLBACK_PLATFORMS } from '../data/region-platforms.js';
import { getCachedSAProviders, extractSAServiceIds } from './sa-cache.js';

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';
const FALLBACK_PRE_SELECTED_IDS = new Set([8, 337, 119]); // Netflix, Disney+, Prime

/**
 * Map a curated platform entry to the resolver output shape.
 * @param {object} p — entry from REGION_PLATFORMS
 * @param {Set<string>|null} saIds — lowercased SA service ids if available
 */
function annotateCurated(p, saIds) {
    let live = null;
    if (saIds && p.sa_id) {
        live = saIds.has(String(p.sa_id).toLowerCase());
    }
    return {
        id: p.tmdb_id,
        name: p.name,
        slug: p.slug,
        logoUrl: p.logo_path,
        preSelected: !!p.preSelected,
        live,
        source: 'curated',
        free: !!p.free,
    };
}

/**
 * TMDB fallback fetcher. Defaults to /api/tmdb endpoint; tests inject a fake.
 */
async function defaultTmdbFetcher(country) {
    if (typeof fetch === 'undefined') return [];
    try {
        const cc = String(country || '').toUpperCase();
        const url = `/api/tmdb?endpoint=/watch/providers/tv&watch_region=${encodeURIComponent(cc)}`;
        const res = await fetch(url);
        if (!res || !res.ok) return [];
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        return results
            .filter((p) => p && typeof p === 'object')
            .slice()
            .sort((a, b) => {
                const ap = a.display_priorities?.[cc] ?? a.display_priority ?? 999;
                const bp = b.display_priorities?.[cc] ?? b.display_priority ?? 999;
                return ap - bp;
            })
            .slice(0, 20);
    } catch {
        return [];
    }
}

/**
 * Main entry. Returns ordered list of providers for a country.
 *
 * @param {string} country — ISO-3166-1 alpha-2 (case-insensitive)
 * @param {'movie'|'series'} [type]
 * @param {object} [opts]
 * @param {Function} [opts.saFetcher] — test seam for getCachedSAProviders
 * @param {Function} [opts.tmdbFetcher] — test seam for TMDB fallback
 * @returns {Promise<Array>} resolved provider list (possibly empty)
 */
export async function getResolvedProviders(country, type = 'movie', opts = {}) {
    const cc = String(country || '').toUpperCase();
    const saCall = opts.saFetcher || ((c, t) => getCachedSAProviders(c, t));
    const tmdbCall = opts.tmdbFetcher || defaultTmdbFetcher;

    const curated = getCuratedForCountry(cc);

    if (curated.length > 0) {
        // Curated wins. Annotate with SA live flag if SA is reachable.
        let saIds = null;
        try {
            const saResp = await saCall(cc, type);
            if (saResp) saIds = extractSAServiceIds(saResp);
        } catch {
            // SA layer ignored on any error.
        }
        return curated.map((p) => annotateCurated(p, saIds));
    }

    // Curated empty → TMDB fallback (existing Phase 04-04 behaviour).
    let tmdb = [];
    try {
        tmdb = await tmdbCall(cc);
    } catch {
        tmdb = [];
    }

    if (!Array.isArray(tmdb) || tmdb.length === 0) {
        // Hard fallback — show universal default so UI never empty-states for new regions.
        return FALLBACK_PLATFORMS.map((p) => ({
            id: p.tmdb_id,
            name: p.name,
            slug: p.slug,
            logoUrl: p.logo_path,
            preSelected: !!p.preSelected,
            live: null,
            source: 'curated',
            free: !!p.free,
        }));
    }

    return tmdb.map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        slug: '',
        logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : '',
        preSelected: FALLBACK_PRE_SELECTED_IDS.has(p.provider_id),
        live: null,
        source: 'tmdb-fallback',
        free: false,
    }));
}

/**
 * Helper used by detail.js to filter a streaming-cache providers array down to
 * the curated allowlist for the active country, preserving curated display order.
 *
 * Input: rawProviders = [{ serviceId, serviceName, logoPath, link, group }]
 * Output: same shape, reordered + filtered (or unchanged if no curated list).
 */
export function filterProvidersToCurated(rawProviders, country) {
    const cc = String(country || '').toUpperCase();
    const curated = getCuratedForCountry(cc);
    if (!curated.length || !Array.isArray(rawProviders) || rawProviders.length === 0) {
        return rawProviders || [];
    }

    // Build lookup by sa_id, slug, lowercased name — accept any match.
    const curatedKeys = curated.map((p, idx) => ({
        idx,
        keys: new Set(
            [p.sa_id, p.slug, p.name].filter(Boolean).map((k) => String(k).toLowerCase())
        ),
    }));

    const matched = new Map(); // curatedIdx → first matching rawProvider
    for (const raw of rawProviders) {
        const candidates = [raw.serviceId, raw.serviceName]
            .filter(Boolean)
            .map((k) => String(k).toLowerCase().trim());
        for (const c of curatedKeys) {
            if (matched.has(c.idx)) continue;
            if (candidates.some((cand) => c.keys.has(cand))) {
                matched.set(c.idx, raw);
                break;
            }
        }
    }

    // Emit in curated order; drop unmatched raw entries (curated wins).
    const out = [];
    for (let i = 0; i < curated.length; i++) {
        if (matched.has(i)) out.push(matched.get(i));
    }
    return out.length ? out : rawProviders;
}
