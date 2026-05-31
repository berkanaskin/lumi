/**
 * LUMI — "seen" derivation + taste profile (Phase 05-03).
 *
 * Locked decision: there is NO explicit "watched" mark. A title counts as SEEN if the
 * user has RATED it (userRatings) OR LIKED it (liked_items) — both mean "I've engaged
 * with this and have an opinion". `watchlist_items` is the opposite — a positive
 * "want to watch" signal — so it is NEVER in the seen set.
 *
 * Reused by Decide-for-Me (exclude seen) and Pair Mode (exclude the union of both
 * partners' seen sets).
 */
import { loadFavoritesItems } from '../features/favorites-storage.js';

function readRatings() {
    try {
        const raw = JSON.parse(localStorage.getItem('userRatings') || '{}');
        return raw && typeof raw === 'object' ? raw : {};
    } catch {
        return {};
    }
}

/** Normalize a rating key ("movie_603" | "tv_1399" | "603") to a bare id string. */
export function idFromRatingKey(key) {
    const m = String(key).match(/(\d+)\s*$/);
    return m ? m[1] : String(key);
}

/** Set of TMDB id strings the user has SEEN = rated ∪ liked. */
export function getSeenSet() {
    const set = new Set();
    for (const key of Object.keys(readRatings())) set.add(idFromRatingKey(key));
    for (const item of loadFavoritesItems('liked')) {
        if (item && item.id != null) set.add(String(item.id));
    }
    return set;
}

/** Set of TMDB id strings on the user's watchlist (want-to-watch — a positive signal). */
export function getWatchlistIds() {
    const set = new Set();
    for (const item of loadFavoritesItems('watchlist')) {
        if (item && item.id != null) set.add(String(item.id));
    }
    return set;
}

/** True if a TMDB id (any type) is already seen. */
export function isSeen(id) {
    return getSeenSet().has(String(id));
}

/**
 * Compact taste profile for grounding AI prompts (Decide-for-Me / Pair Mode).
 * Titles only — cheap to embed in a prompt, no PII.
 */
export function getTasteProfile() {
    const liked = loadFavoritesItems('liked');
    const ratings = readRatings();
    const likedTitles = liked.map((i) => i?.title || i?.name).filter(Boolean).slice(0, 25);
    const ratedTitles = Object.values(ratings).map((r) => r?.title).filter(Boolean).slice(0, 25);
    const watchlistTitles = loadFavoritesItems('watchlist').map((i) => i?.title || i?.name).filter(Boolean).slice(0, 15);
    return {
        likedTitles,
        ratedTitles,
        watchlistTitles,
        seenCount: getSeenSet().size,
        likedCount: liked.length,
    };
}
