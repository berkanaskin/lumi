// ============================================
// LUMI - Streaming Availability Cache
// v1.0.0
// ============================================

/**
 * Firestore caching layer for streaming availability data.
 * - 24h TTL: if cached data is fresher than 24h, return it directly
 * - 48h Firestore document expiry (expiresAt field for future TTL policy)
 * - Falls back to TMDB watch providers on API failure
 */

import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { TMDBService } from './api.js';

const TTL_MS = 24 * 60 * 60 * 1000;    // 24 hours: app-level freshness check
const EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours: Firestore document expiry

export const GROUP_MAP = {
    subscription: 'stream',
    free: 'stream',
    addon: 'stream',
    rent: 'rent',
    buy: 'buy',
};

const ISO_2_RE = /^[A-Z]{2}$/;

/**
 * Known Turkish streaming providers TMDB sometimes omits from /watch/providers
 * for Turkish-original content. Keys are lowercased production-company name
 * substrings; values are provider records to inject when the producer matches.
 *
 * Provider IDs use TMDB's actual IDs where known, with `tmdb_` prefix for stability.
 */
const TR_PRODUCER_PROVIDERS = {
    'gain': {
        serviceId: 'tmdb_gain',
        serviceName: 'Gain',
        type: 'subscription',
        group: 'stream',
        link: 'https://www.gain.tv/',
        themeColor: null,
        quality: null,
        logoPath: null,
    },
    'exxen': {
        serviceId: 'tmdb_exxen',
        serviceName: 'Exxen',
        type: 'subscription',
        group: 'stream',
        link: 'https://www.exxen.com/',
        themeColor: null,
        quality: null,
        logoPath: null,
    },
    'blu tv': {
        serviceId: 'tmdb_blutv',
        serviceName: 'BluTV',
        type: 'subscription',
        group: 'stream',
        link: 'https://www.blutv.com/',
        themeColor: null,
        quality: null,
        logoPath: null,
    },
    'tabii': {
        serviceId: 'tmdb_tabii',
        serviceName: 'Tabii',
        type: 'subscription',
        group: 'stream',
        link: 'https://www.tabii.com/',
        themeColor: null,
        quality: null,
        logoPath: null,
    },
    'tod': {
        serviceId: 'tmdb_tod',
        serviceName: 'TOD',
        type: 'subscription',
        group: 'stream',
        link: 'https://www.tod.tv/',
        themeColor: null,
        quality: null,
        logoPath: null,
    },
};

/**
 * Inject Turkish providers when production_companies indicate a Turkish-original
 * platform (e.g. Gain Medya → Gain). Idempotent: skips if provider already in list.
 *
 * @param {Array} providers - existing normalized providers
 * @param {object} details - TMDB details object (production_companies, origin_country)
 * @returns {Array} possibly augmented providers
 */
export function injectTurkishProviders(providers, details) {
    if (!Array.isArray(providers) || !details) return providers || [];
    // Check BOTH production_companies AND networks: TMDB lists Gain/Exxen/Tabii
    // as NETWORKS for shows they stream (not production_companies). E.g. "Şahsiyet"
    // has Gain in `networks`, but `production_companies` lists "Ay Yapım".
    const pc = Array.isArray(details.production_companies) ? details.production_companies : [];
    const nw = Array.isArray(details.networks) ? details.networks : [];
    const companies = [...pc, ...nw];
    if (companies.length === 0) return providers;

    const existingKeys = new Set(
        providers.map(p => String(p.serviceName || '').toLowerCase().trim()).filter(Boolean)
    );

    const result = [...providers];
    for (const company of companies) {
        const name = String(company?.name || '').toLowerCase();
        if (!name) continue;
        for (const [keyword, providerTemplate] of Object.entries(TR_PRODUCER_PROVIDERS)) {
            if (!name.includes(keyword)) continue;
            const providerKey = providerTemplate.serviceName.toLowerCase();
            if (existingKeys.has(providerKey)) continue;
            result.push({ ...providerTemplate });
            existingKeys.add(providerKey);
        }
    }

    // Round 4 fix: REMOVED the blanket origin_country fallback that injected all 5
    // Turkish platforms (Gain, Exxen, BluTV, TOD, Tabii) for any content with
    // origin_country=TR. That caused "Kulüp" (Netflix Turkey original) to spam all
    // 5 platforms alongside Netflix, even though those platforms don't have it.
    //
    // Now we trust TMDB data: only inject providers when production_companies or
    // networks explicitly name a Turkish platform (handled in the loop above).
    // If TMDB has a data gap for a specific show, that's a TMDB issue — not ours
    // to paper over with false-positive provider chips.
    //
    // Trade-off: some Turkish-origin content with TMDB networks gaps will show
    // zero Turkish platforms. Acceptable: false negatives > false positives here.

    return result;
}

/**
 * Normalize TMDB watch-providers shape to our canonical provider shape.
 * @param {object} tmdbProviders - { flatrate?, free?, rent?, buy?, ads?, link? }
 * @returns {Array} normalized providers
 */
function _normalizeTMDBProviders(tmdbProviders) {
    if (!tmdbProviders) return [];
    const flatList = [
        ...(tmdbProviders.flatrate || []).map(p => ({ ...p, type: 'subscription' })),
        ...(tmdbProviders.free || []).map(p => ({ ...p, type: 'free' })),
        ...(tmdbProviders.rent || []).map(p => ({ ...p, type: 'rent' })),
        ...(tmdbProviders.buy || []).map(p => ({ ...p, type: 'buy' })),
        ...(tmdbProviders.ads || []).map(p => ({ ...p, type: 'free' })),
    ];
    return flatList.map(p => ({
        serviceId: String(p.provider_id || p.provider_name || ''),
        serviceName: p.provider_name || '',
        type: p.type,
        group: GROUP_MAP[p.type] || 'stream',
        link: tmdbProviders.link || '',
        themeColor: null,
        quality: null,
        logoPath: p.logo_path || null,
    }));
}

/**
 * Merge TMDB watch-providers (TR or other country) into a RapidAPI provider list.
 * RapidAPI's Streaming Availability dataset only covers BluTV for Turkey,
 * so for TR we always merge TMDB providers (Gain, Exxen, TOD, TV+, Tabii) to fill the gap.
 *
 * - Dedup by lowercased serviceId; RapidAPI version preferred.
 * - On TMDB failure: returns rapidApiProviders unchanged.
 * - Validates countryUpper against ISO 3166-1 alpha-2 (T-03.2-02-01).
 *
 * @param {Array} rapidApiProviders - normalized providers from RapidAPI
 * @param {string} tmdbId
 * @param {string} type - 'movie' | 'tv'
 * @param {string} countryUpper - validated ISO-2 country code
 * @returns {Promise<Array>} merged provider list
 */
export async function mergeWithTMDB(rapidApiProviders, tmdbId, type, countryUpper) {
    const list = Array.isArray(rapidApiProviders) ? rapidApiProviders : [];
    if (!countryUpper || !ISO_2_RE.test(countryUpper)) {
        return list;
    }
    let tmdbProviders;
    try {
        tmdbProviders = await TMDBService.getWatchProviders(tmdbId, type, countryUpper);
    } catch (err) {
        console.warn('[StreamingCache] TMDB merge failed:', err?.message || err);
        return list;
    }
    if (!tmdbProviders) return list;

    const normalized = _normalizeTMDBProviders(tmdbProviders);
    if (normalized.length === 0) return list;

    const seen = new Set(list.map(p => String(p.serviceId || '').toLowerCase()).filter(Boolean));
    const merged = [...list];
    for (const p of normalized) {
        const key = String(p.serviceId || '').toLowerCase();
        if (key && seen.has(key)) continue;
        // Also dedup by serviceName lowercased (TMDB ids differ from RapidAPI ids)
        const nameKey = String(p.serviceName || '').toLowerCase();
        if (nameKey && list.some(x => String(x.serviceName || '').toLowerCase() === nameKey)) continue;
        merged.push(p);
        if (key) seen.add(key);
    }
    return merged;
}

/**
 * Get streaming availability data with Firestore caching.
 *
 * Flow:
 * 1. Check Firestore cache (collection: streamingAvailability, doc: {tmdbId}_{COUNTRY})
 * 2. If cache hit and fresh (<24h), return cached providers
 * 3. On cache miss/stale: fetch from /api/streaming-availability
 * 4. Transform and write to Firestore with 48h expiry
 * 5. On API failure (429/500): fall back to TMDB watch providers
 *
 * @param {string} tmdbId - TMDB content ID
 * @param {string} imdbId - IMDb ID (tt-prefixed) for Streaming Availability API
 * @param {string} country - ISO 3166-1 alpha-2 country code (e.g. 'TR', 'US')
 * @param {string} type - Content type: 'movie' or 'tv'
 * @returns {Promise<{ providers: Array, fallback?: boolean } | null>}
 */
export async function getStreamingWithCache(tmdbId, imdbId, country, type = 'movie', details = null) {
    const countryUpper = (country || 'TR').toUpperCase();
    const countryLower = countryUpper.toLowerCase();
    const docId = `${tmdbId}_${countryUpper}`;

    let db;
    try {
        db = getFirestore();
    } catch (err) {
        console.warn('[StreamingCache] Firestore not available:', err.message);
        return _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, null, docId, type, details);
    }

    // 1. Try Firestore cache
    try {
        const ref = doc(db, 'streamingAvailability', docId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const cached = snap.data();
            const fetchedAt = cached.fetchedAt?.toMillis?.() || 0;
            const age = Date.now() - fetchedAt;

            if (age < TTL_MS) {
                // Cache hit — apply Turkish producer injection on top (cheap, idempotent)
                let providers = cached.providers || [];
                if (countryUpper === 'TR' && details) {
                    const before = providers.length;
                    providers = injectTurkishProviders(providers, details);
                    // Round 3 fix: if cache was written before injection logic existed AND
                    // we just added providers via injection, write the augmented list back
                    // so the next reader sees the merged result without re-injecting.
                    if (providers.length > before) {
                        try {
                            const ref2 = doc(db, 'streamingAvailability', docId);
                            await setDoc(ref2, {
                                ...cached,
                                providers,
                                fetchedAt: cached.fetchedAt, // keep original freshness
                            }, { merge: true });
                        } catch { /* non-critical */ }
                    }
                }
                return { providers };
            }
        }
    } catch (err) {
        console.warn('[StreamingCache] Cache read failed:', err.message);
    }

    // 2. Cache miss or stale — fetch from API
    return _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, db, docId, type, details);
}

/**
 * Internal: fetch from /api/streaming-availability, transform, cache, or fall back to TMDB.
 */
async function _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, db, docId, type = 'movie', details = null) {
    if (!imdbId) {
        // No IMDb ID — fall back to TMDB watch providers immediately
        return _tmdbFallback(tmdbId, countryUpper, type, details);
    }

    try {
        const response = await fetch(
            `/api/streaming-availability?imdbId=${encodeURIComponent(imdbId)}&country=${countryLower}`
        );

        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }

        const json = await response.json();
        const rawOptions = json.options || [];

        // Transform each option to normalized provider shape
        let providers = rawOptions.map(option => ({
            serviceId: option.service?.id || '',
            serviceName: option.service?.name || '',
            type: option.type || 'subscription',
            group: GROUP_MAP[option.type] || 'stream',
            link: option.link || '',
            themeColor: option.service?.themeColorCode || null,
            quality: option.quality || null,
            logoPath: option.service?.imageSet?.lightThemeImage || option.service?.imageSet?.darkThemeImage || null,
        }));

        // 2.5. For TR, always merge TMDB watch-providers (RapidAPI only has BluTV for TR;
        //      Gain/Exxen/TOD/TV+/Tabii live in TMDB). Failure-safe: returns providers unchanged.
        if (countryUpper === 'TR') {
            providers = await mergeWithTMDB(providers, tmdbId, type, countryUpper);
            // 2.6. Inject Turkish providers from production_companies (e.g. Gain Medya → Gain)
            //      for Turkish-original content TMDB sometimes omits.
            if (details) {
                providers = injectTurkishProviders(providers, details);
            }
        }

        // 3. Write to Firestore cache
        if (db) {
            try {
                const now = Timestamp.now();
                const ref = doc(db, 'streamingAvailability', docId);
                await setDoc(ref, {
                    tmdbId: String(tmdbId),
                    country: countryUpper,
                    imdbId,
                    providers,
                    fetchedAt: now,
                    expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
                });
            } catch (writeErr) {
                console.warn('[StreamingCache] Cache write failed:', writeErr.message);
            }
        }

        return { providers };
    } catch (err) {
        console.warn('[StreamingCache] API fetch failed, falling back to TMDB:', err.message);
        return _tmdbFallback(tmdbId, countryUpper, type, details);
    }
}

/**
 * Internal: fall back to TMDB watch providers on API failure.
 */
async function _tmdbFallback(tmdbId, countryUpper, type = 'movie', details = null) {
    try {
        const tmdbProviders = await TMDBService.getWatchProviders(tmdbId, type, countryUpper);
        if (!tmdbProviders) return { providers: [], fallback: true };

        // Map TMDB provider shapes to our normalized shape
        const flatList = [
            ...(tmdbProviders.flatrate || []).map(p => ({ ...p, type: 'subscription' })),
            ...(tmdbProviders.free || []).map(p => ({ ...p, type: 'free' })),
            ...(tmdbProviders.rent || []).map(p => ({ ...p, type: 'rent' })),
            ...(tmdbProviders.buy || []).map(p => ({ ...p, type: 'buy' })),
            ...(tmdbProviders.ads || []).map(p => ({ ...p, type: 'free' })),
        ];

        let providers = flatList.map(p => ({
            serviceId: String(p.provider_id || ''),
            serviceName: p.provider_name || '',
            type: p.type,
            group: GROUP_MAP[p.type] || 'stream',
            link: tmdbProviders.link || '',
            themeColor: null,
            quality: null,
            logoPath: p.logo_path || null,
        }));

        // Inject Turkish providers for TR when production_companies indicate one
        if (countryUpper === 'TR' && details) {
            providers = injectTurkishProviders(providers, details);
        }

        return { providers, fallback: true };
    } catch (err) {
        console.warn('[StreamingCache] TMDB fallback failed:', err.message);
        // Even on failure, attempt producer-based injection as last resort
        if (countryUpper === 'TR' && details) {
            const providers = injectTurkishProviders([], details);
            return { providers, fallback: true };
        }
        return { providers: [], fallback: true };
    }
}
