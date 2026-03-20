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
 * @returns {Promise<{ providers: Array, fallback?: boolean } | null>}
 */
export async function getStreamingWithCache(tmdbId, imdbId, country) {
    const countryUpper = (country || 'TR').toUpperCase();
    const countryLower = countryUpper.toLowerCase();
    const docId = `${tmdbId}_${countryUpper}`;

    let db;
    try {
        db = getFirestore();
    } catch (err) {
        console.warn('[StreamingCache] Firestore not available:', err.message);
        return _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, null, docId);
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
                // Cache hit — data is fresh
                return { providers: cached.providers || [] };
            }
        }
    } catch (err) {
        console.warn('[StreamingCache] Cache read failed:', err.message);
    }

    // 2. Cache miss or stale — fetch from API
    return _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, db, docId);
}

/**
 * Internal: fetch from /api/streaming-availability, transform, cache, or fall back to TMDB.
 */
async function _fetchFromApiOrFallback(tmdbId, imdbId, countryLower, countryUpper, db, docId) {
    if (!imdbId) {
        // No IMDb ID — fall back to TMDB watch providers immediately
        return _tmdbFallback(tmdbId, countryUpper);
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
        const providers = rawOptions.map(option => ({
            serviceId: option.service?.id || '',
            serviceName: option.service?.name || '',
            type: option.type || 'subscription',
            group: GROUP_MAP[option.type] || 'stream',
            link: option.link || '',
            themeColor: option.service?.themeColorCode || null,
            quality: option.quality || null,
        }));

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
        return _tmdbFallback(tmdbId, countryUpper);
    }
}

/**
 * Internal: fall back to TMDB watch providers on API failure.
 */
async function _tmdbFallback(tmdbId, countryUpper) {
    try {
        const tmdbProviders = await TMDBService.getWatchProviders(tmdbId, 'movie', countryUpper);
        if (!tmdbProviders) return { providers: [], fallback: true };

        // Map TMDB provider shapes to our normalized shape
        const flatList = [
            ...(tmdbProviders.flatrate || []).map(p => ({ ...p, type: 'subscription' })),
            ...(tmdbProviders.free || []).map(p => ({ ...p, type: 'free' })),
            ...(tmdbProviders.rent || []).map(p => ({ ...p, type: 'rent' })),
            ...(tmdbProviders.buy || []).map(p => ({ ...p, type: 'buy' })),
            ...(tmdbProviders.ads || []).map(p => ({ ...p, type: 'free' })),
        ];

        const providers = flatList.map(p => ({
            serviceId: String(p.provider_id || ''),
            serviceName: p.provider_name || '',
            type: p.type,
            group: GROUP_MAP[p.type] || 'stream',
            link: tmdbProviders.link || '',
            themeColor: null,
            quality: null,
        }));

        return { providers, fallback: true };
    } catch (err) {
        console.warn('[StreamingCache] TMDB fallback failed:', err.message);
        return { providers: [], fallback: true };
    }
}
