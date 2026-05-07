/**
 * LUMI - Favorites Storage Helper
 *
 * Single source of truth for reading liked / watchlist items from localStorage.
 *
 * Writers (src/features/detail.js) use:
 *   - "liked_items"      (toggleLike)
 *   - "watchlist_items"  (toggleWatchlist)
 *
 * Legacy writers (no longer reached from UI) used:
 *   - "favorites"   -> migrated into "liked_items"
 *   - "watchlist"   -> migrated into "watchlist_items"
 *
 * This helper performs the one-time migration on first read so users do not
 * lose data when the reader-side key bug is fixed.
 *
 * Item shape (canonical):
 *   { id, media_type, poster_path, title, added_at }
 */

const KEY_MAP = {
    liked: { current: 'liked_items', legacy: 'favorites' },
    watched: { current: 'watchlist_items', legacy: 'watchlist' },
    // Aliases — UI uses data-list="watchlist" / "favorites" in places.
    watchlist: { current: 'watchlist_items', legacy: 'watchlist' },
    favorites: { current: 'liked_items', legacy: 'favorites' },
};

function safeParseArray(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Load favorites/watchlist items, migrating legacy keys on first read.
 *
 * @param {"liked" | "watched" | "watchlist" | "favorites"} listType
 * @returns {Array<{id:number,media_type:string,poster_path:string,title:string,added_at?:number}>}
 */
export function loadFavoritesItems(listType) {
    const keys = KEY_MAP[listType];
    if (!keys) return [];

    const current = safeParseArray(localStorage.getItem(keys.current));
    const legacy = safeParseArray(localStorage.getItem(keys.legacy));

    // One-time migration: merge legacy into current (de-dup by id), then drop legacy.
    if (legacy.length > 0) {
        const merged = [...current];
        const seen = new Set(merged.map((i) => i?.id).filter((id) => id != null));
        for (const item of legacy) {
            if (item && item.id != null && !seen.has(item.id)) {
                merged.push(item);
                seen.add(item.id);
            }
        }
        try {
            localStorage.setItem(keys.current, JSON.stringify(merged));
            localStorage.removeItem(keys.legacy);
        } catch {
            // ignore quota / serialization errors — return what we have
        }
        return merged;
    }

    return current;
}
