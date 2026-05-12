/**
 * LUMI - Broadcast Info (Phase 04-05)
 *
 * Detect actively-airing TV series and resolve broadcast network logos.
 * Separate concern from streaming providers: broadcast networks air content
 * (linear TV / regional broadcast), they do not stream-on-demand.
 *
 * Phase 03.2-r14c excluded broadcast networks from the streaming catalog;
 * this module restores broadcast visibility as a distinct UI affordance.
 *
 * Exports:
 *   - isActivelyAiring(details)        → boolean
 *   - getNetworkLogoPath(network)      → string (local PNG path | TMDB URL)
 *   - formatNextEpisode(nextEp, lang)  → { relative, absolute, label }
 */

import TR_BROADCAST_CATALOG from '../data/tr-broadcast-catalog.json';

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

/**
 * Is this TV series actively airing?
 *
 * Returns true when the show is marked "Returning Series" by TMDB OR has a
 * concrete next_episode_to_air payload. OR-logic is intentional: a series
 * marked "Ended" can still have a future next-episode (special, reunion).
 *
 * Movies always return false (status semantics differ).
 *
 * @param {object} details - TMDB details payload
 * @returns {boolean}
 */
export function isActivelyAiring(details) {
    if (!details || typeof details !== 'object') return false;
    // Movies don't have airing status — exclude up-front.
    if (details.media_type === 'movie' || details.title) return false;
    return details.status === 'Returning Series' || details.next_episode_to_air != null;
}

/**
 * Normalize a network name for the byNormalizedName lookup.
 */
function normalizeName(name) {
    return String(name || '').toLowerCase().trim();
}

/**
 * Resolve a network entry from the TR catalog.
 * Returns the catalog entry ({slug, name, logo, url}) or null if not found.
 */
function resolveCatalogEntry(network) {
    if (!network) return null;

    // Primary: TMDB ID lookup.
    if (network.id != null) {
        const byId = TR_BROADCAST_CATALOG.byId?.[String(network.id)];
        if (byId) return byId;
    }

    // Fallback: normalized-name lookup. Supports specialEntries indirection
    // (e.g. "trt 1" / "trt 2" → "trt" → specialEntries.trt).
    const norm = normalizeName(network.name);
    const ref = TR_BROADCAST_CATALOG.byNormalizedName?.[norm];
    if (ref) {
        if (TR_BROADCAST_CATALOG.byId?.[ref]) return TR_BROADCAST_CATALOG.byId[ref];
        if (TR_BROADCAST_CATALOG.specialEntries?.[ref]) return TR_BROADCAST_CATALOG.specialEntries[ref];
    }

    return null;
}

/**
 * Get a renderable logo path for a TMDB network object.
 *
 * @param {object} network - TMDB network ({id, name, logo_path, origin_country})
 * @returns {string} Local PNG path (TR overlay) or full TMDB URL.
 */
export function getNetworkLogoPath(network) {
    const entry = resolveCatalogEntry(network);
    if (entry?.logo) return entry.logo;
    // TMDB passthrough. logo_path may be null → return empty string so the
    // caller can decide to hide the <img>.
    if (network?.logo_path) return `${TMDB_LOGO_BASE}${network.logo_path}`;
    return '';
}

/**
 * Get the curated catalog entry for a network, if any (for deep-link URL).
 */
export function getNetworkCatalogEntry(network) {
    return resolveCatalogEntry(network);
}

/**
 * Format next-episode info for display.
 *
 * @param {object} nextEp - TMDB next_episode_to_air ({air_date, season_number, episode_number, name})
 * @param {string} lang - BCP-47 language tag (e.g. 'tr', 'en')
 * @returns {{ relative: string, absolute: string, label: string }}
 */
export function formatNextEpisode(nextEp, lang = 'tr') {
    if (!nextEp || !nextEp.air_date) {
        return { relative: '', absolute: '', label: '' };
    }

    const airDate = new Date(nextEp.air_date + 'T00:00:00Z');
    const now = new Date();

    // Whole-day diff (UTC) — avoids timezone drift.
    const msPerDay = 86400000;
    const startOfTodayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startOfAirUTC = Date.UTC(airDate.getUTCFullYear(), airDate.getUTCMonth(), airDate.getUTCDate());
    const diffDays = Math.round((startOfAirUTC - startOfTodayUTC) / msPerDay);

    let relative = '';
    try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        relative = rtf.format(diffDays, 'day');
    } catch (_) {
        relative = '';
    }

    let absolute = '';
    try {
        absolute = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(airDate);
    } catch (_) {
        absolute = nextEp.air_date;
    }

    const s = nextEp.season_number;
    const e = nextEp.episode_number;
    const label = (s != null && e != null) ? `S${s} E${e}` : '';

    return { relative, absolute, label };
}
