/**
 * LUMI — Smart Notifications detection core (Phase 05-05).
 *
 * Pure, framework-free, Node- and browser-safe. The cron (api/cron/detect-changes.js)
 * supplies the side-effects (Firestore reads/writes, SA/TMDB fetches); this module holds
 * the decision logic so it is fully unit-testable.
 *
 * Two signals, both cost-bounded:
 *  - PLATFORM gain: the user's REGION streaming catalogue (one cached SA fetch per
 *    country+type group) gained a service vs the per-item snapshot. We notify on GAINS
 *    only (a title becoming MORE available), never on losses.
 *  - EPISODE change: a watchlisted TV series' `next_episode_to_air.air_date` differs from
 *    the stored snapshot.
 *
 * First-run safety: when there is NO prior snapshot, we SEED silently (return null) so the
 * first cron pass never floods a user with a notification per watchlist item.
 *
 * NOTE on platform semantics: watchlist items carry only a TMDB id + media_type (no imdbId),
 * and the SA cache is region-wide, so "platform set" = the region catalogue snapshotted per
 * item. If imdbId is later added to items, swap the input source — this logic is unchanged.
 */

export const NOTIF_TYPES = {
    PLATFORM: 'platform_change',
    EPISODE: 'new_episode',
    EVENING: 'evening_pick',
};

const SERVICE_LABEL = {
    netflix: 'Netflix', prime: 'Prime Video', disney: 'Disney+', hbo: 'HBO Max', max: 'Max',
    apple: 'Apple TV+', hulu: 'Hulu', paramount: 'Paramount+', peacock: 'Peacock',
    mubi: 'MUBI', gain: 'Gain', blutv: 'BluTV', exxen: 'Exxen', tabii: 'tabii',
};
function serviceLabel(id) {
    return SERVICE_LABEL[String(id || '').toLowerCase()] || (id ? String(id) : 'bir platform');
}

/** Group watchlist items into `${country}:${movie|series}` buckets for batched SA lookups. */
export function groupItemsByRegionType(items, country) {
    const cc = String(country || '').toLowerCase();
    const groups = {};
    for (const item of items || []) {
        const type = item?.media_type === 'tv' ? 'series' : 'movie';
        const key = `${cc}:${type}`;
        (groups[key] = groups[key] || []).push(item);
    }
    return groups;
}

/**
 * Detect a platform GAIN for one item.
 * @param {string[]|null|undefined} priorIds  snapshot service-id array (null/undefined = first run)
 * @param {Set<string>} currIds               current region service-id set
 * @returns {object|null} a platform event, or null (no change / first-run seed / loss)
 */
export function detectPlatformGain(priorIds, currIds, item, country) {
    if (priorIds == null) return null;          // first run → seed silently
    const prior = new Set(priorIds.map((s) => String(s).toLowerCase()));
    for (const id of currIds) {
        if (!prior.has(id)) {
            return buildPlatformChangeEvent(item, id, country);
        }
    }
    return null;
}

/**
 * Detect a next-episode air-date change.
 * @param {{airDate?:string}|null|undefined} priorSnap  stored snapshot (null = first run)
 * @param {{air_date?:string}|null} nextEp               TMDB next_episode_to_air
 */
export function detectEpisodeChange(priorSnap, nextEp, item) {
    const newDate = nextEp && nextEp.air_date ? nextEp.air_date : null;
    if (!newDate) return null;                  // nothing upcoming
    if (priorSnap == null) return null;         // first run → seed silently
    if (priorSnap.airDate === newDate) return null;
    return buildNewEpisodeEvent(item, nextEp, item?.lang);
}

function isTRLang(lang) {
    return String(lang || '').toLowerCase().startsWith('tr');
}

/** Build a platform-gain inbox event (maps onto a Phase-6 push payload). */
export function buildPlatformChangeEvent(item, serviceId, country, lang) {
    const title = item?.title || item?.name || 'İzleme listendeki bir başlık';
    const svc = serviceLabel(serviceId);
    const tr = isTRLang(lang) || isTRLang(item?.lang) || true; // default TR for now (app is TR-primary)
    return {
        type: NOTIF_TYPES.PLATFORM,
        title: tr ? 'Yeni platformda!' : 'Now streaming!',
        body: tr ? `${title} artık ${svc} üzerinde izlenebilir.` : `${title} is now on ${svc}.`,
        payload: {
            tmdbId: item?.id ?? null,
            mediaType: item?.media_type || 'movie',
            service: String(serviceId || '').toLowerCase(),
            country: String(country || '').toLowerCase(),
        },
        read: false,
        source: 'detect-changes',
    };
}

/** Build a new-episode inbox event. */
export function buildNewEpisodeEvent(item, nextEp, lang) {
    const title = item?.title || item?.name || 'Bir dizi';
    const tr = isTRLang(lang);
    const s = nextEp?.season_number;
    const e = nextEp?.episode_number;
    const tag = (s != null && e != null) ? `S${s}B${e}` : '';
    return {
        type: NOTIF_TYPES.EPISODE,
        title: tr ? 'Yeni bölüm yolda!' : 'New episode coming!',
        body: tr
            ? `${title}${tag ? ' ' + tag : ''} ${nextEp?.air_date} tarihinde yayında.`
            : `${title}${tag ? ' ' + tag : ''} airs ${nextEp?.air_date}.`,
        payload: {
            tmdbId: item?.id ?? null,
            mediaType: 'tv',
            airDate: nextEp?.air_date || null,
            season: s ?? null,
            episode: e ?? null,
        },
        read: false,
        source: 'detect-changes',
    };
}
