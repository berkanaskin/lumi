/**
 * Phase 04.6-01 — Per-region curated streaming platform lists.
 *
 * Single source of truth for which platforms appear in onboarding S2 and the
 * detail-page "Where to watch" overlay. Locked from
 * .planning/decisions/REGION-PLATFORMS-DRAFT.md (2026-05-15).
 *
 * Cross-reference logic (providers-resolver.js):
 *   curated  ──► presence + display order + preSelected flag    (this file)
 *   SA       ──► liveness annotation (does the country still have it?)
 *   TMDB     ──► last-resort fallback when both curated & SA empty
 *
 * Entry shape:
 *   {
 *     tmdb_id:    number — TMDB provider id (used to dedupe vs api/tmdb)
 *     sa_id:      string|null — Streaming-Availability slug (null = skip SA layer)
 *     name:       string — display name
 *     slug:       string — stable kebab id (matches /img/providers/{slug}.{png,svg})
 *     logo_path:  string — '/img/providers/...'
 *     preSelected: boolean — checked by default on S2 first render (≤ 4 per region)
 *     free?:      boolean — optional free-tier flag (currently unused in UI)
 *   }
 *
 * preSelected guard: ≤ 4 per region (UX). Enforced by tests/region-platforms.test.js.
 */

// Shared atoms reused across regions (Netflix/Disney+/Prime/Apple TV+/MUBI/Crunchyroll).
const NETFLIX     = { tmdb_id: 8,    sa_id: 'netflix',     name: 'Netflix',     slug: 'netflix',     logo_path: '/img/providers/netflix.png' };
const DISNEY_PLUS = { tmdb_id: 337,  sa_id: 'disney',      name: 'Disney+',     slug: 'disney-plus', logo_path: '/img/providers/disney-plus.png' };
const PRIME       = { tmdb_id: 119,  sa_id: 'prime',       name: 'Amazon Prime Video', slug: 'prime-video', logo_path: '/img/providers/prime-video.png' };
const APPLE_TV    = { tmdb_id: 350,  sa_id: 'apple',       name: 'Apple TV+',   slug: 'apple-tv-plus', logo_path: '/img/providers/apple-tv-plus.png' };
const MUBI        = { tmdb_id: 11,   sa_id: 'mubi',        name: 'MUBI',        slug: 'mubi',        logo_path: '/img/providers/mubi.svg' };
const CRUNCHYROLL = { tmdb_id: 283,  sa_id: 'crunchyroll', name: 'Crunchyroll', slug: 'crunchyroll', logo_path: '/img/providers/crunchyroll.png' };
const MAX_GLOBAL  = { tmdb_id: 1899, sa_id: 'hbo',         name: 'Max',         slug: 'max',         logo_path: '/img/providers/max.png' };
const PARAMOUNT   = { tmdb_id: 531,  sa_id: 'paramount',   name: 'Paramount+',  slug: 'paramount-plus', logo_path: '/img/providers/paramount-plus.png' };
const HULU        = { tmdb_id: 15,   sa_id: 'hulu',        name: 'Hulu',        slug: 'hulu',        logo_path: '/img/providers/hulu.png' };
const PEACOCK     = { tmdb_id: 386,  sa_id: 'peacock',     name: 'Peacock',     slug: 'peacock',     logo_path: '/img/providers/peacock.png' };

/**
 * 13 regions × ordered platform lists.
 * Order = display priority. Pre-selected ≤ 4 per region.
 */
export const REGION_PLATFORMS = {
    // ---------------- 🇹🇷 Türkiye ----------------
    TR: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 1899, sa_id: 'hbo',     name: 'HBO Max',     slug: 'hbo-max',     logo_path: '/img/providers/hbo-max.png', preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { ...MUBI,       preSelected: false },
        { tmdb_id: 1968, sa_id: 'gain',    name: 'Gain',        slug: 'gain',        logo_path: '/img/providers/gain.svg',    preSelected: false },
        { tmdb_id: 1888, sa_id: 'exxen',   name: 'Exxen',       slug: 'exxen',       logo_path: '/img/providers/exxen.png',   preSelected: false },
        { tmdb_id: 1855, sa_id: 'tabii',   name: 'Tabii',       slug: 'tabii',       logo_path: '/img/providers/tabii.svg',   preSelected: false },
        { tmdb_id: 2895, sa_id: 'tod',     name: 'TOD',         slug: 'tod',         logo_path: '/img/providers/tod.png',     preSelected: false },
        { tmdb_id: 2864, sa_id: 'puhutv',  name: 'Puhu TV',     slug: 'puhutv',      logo_path: '/img/providers/puhutv.png',  preSelected: false },
    ],

    // ---------------- 🇺🇸 United States ----------------
    US: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { ...MAX_GLOBAL,  preSelected: false },
        { ...APPLE_TV,    preSelected: false },
        { ...HULU,        preSelected: false },
        { ...PARAMOUNT,   preSelected: false },
        { ...PEACOCK,     preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
        { ...MUBI,        preSelected: false },
    ],

    // ---------------- 🇬🇧 United Kingdom ----------------
    GB: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 38,   sa_id: 'iplayer',   name: 'BBC iPlayer', slug: 'bbc-iplayer', logo_path: '/img/providers/bbc-iplayer.png', preSelected: false },
        { tmdb_id: 39,   sa_id: 'now',       name: 'NOW TV',      slug: 'now-tv',      logo_path: '/img/providers/now-tv.png',      preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { tmdb_id: 29,   sa_id: 'sky',       name: 'Sky Go',      slug: 'sky-go',      logo_path: '/img/providers/sky-go.png',      preSelected: false },
        { tmdb_id: 1796, sa_id: 'itvx',      name: 'ITVX',        slug: 'itvx',        logo_path: '/img/providers/itvx.png',        preSelected: false },
        { tmdb_id: 151,  sa_id: 'britbox',   name: 'BritBox',     slug: 'britbox',     logo_path: '/img/providers/britbox.png',     preSelected: false },
        { ...MUBI,       preSelected: false },
        { tmdb_id: 524,  sa_id: 'discovery', name: 'Discovery+',  slug: 'discovery-plus', logo_path: '/img/providers/discovery-plus.png', preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
    ],

    // ---------------- 🇩🇪 Deutschland ----------------
    DE: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 29,   sa_id: 'wow',     name: 'WOW',          slug: 'wow',         logo_path: '/img/providers/wow.png',         preSelected: false },
        { tmdb_id: 298,  sa_id: 'rtlplus', name: 'RTL+',         slug: 'rtl-plus',    logo_path: '/img/providers/rtl-plus.png',    preSelected: false },
        { tmdb_id: 178,  sa_id: 'joyn',    name: 'Joyn',         slug: 'joyn',        logo_path: '/img/providers/joyn.png',        preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { tmdb_id: 532,  sa_id: 'magenta', name: 'Magenta TV',   slug: 'magenta-tv',  logo_path: '/img/providers/magenta-tv.png',  preSelected: false },
        { ...MUBI,       preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
    ],

    // ---------------- 🇫🇷 France ----------------
    FR: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 381, sa_id: 'canalplus', name: 'Canal+',     slug: 'canal-plus',  logo_path: '/img/providers/canal-plus.png', preSelected: false },
        { tmdb_id: 78,  sa_id: 'mycanal',   name: 'myCANAL',    slug: 'mycanal',     logo_path: '/img/providers/mycanal.png',    preSelected: false },
        { tmdb_id: 56,  sa_id: 'ocs',       name: 'OCS',        slug: 'ocs',         logo_path: '/img/providers/ocs.svg',        preSelected: false },
        { ...APPLE_TV,  preSelected: false },
        { tmdb_id: 236, sa_id: 'francetv',  name: 'France TV',  slug: 'france-tv',   logo_path: '/img/providers/france-tv.png',  preSelected: false },
        { ...MUBI,      preSelected: false },
        { tmdb_id: 234, sa_id: 'arte',      name: 'Arte',       slug: 'arte',        logo_path: '/img/providers/arte.png',       preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
    ],

    // ---------------- 🇪🇸 España ----------------
    ES: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 149, sa_id: 'movistarplus', name: 'Movistar+',   slug: 'movistar-plus', logo_path: '/img/providers/movistar-plus.png', preSelected: false },
        { ...APPLE_TV,  preSelected: false },
        { tmdb_id: 1899, sa_id: 'hbo',     name: 'HBO Max',        slug: 'hbo-max',       logo_path: '/img/providers/hbo-max.png',        preSelected: false },
        { tmdb_id: 64,  sa_id: 'filmin',     name: 'Filmin',         slug: 'filmin',        logo_path: '/img/providers/filmin.png',         preSelected: false },
        { tmdb_id: 230, sa_id: 'atresplayer', name: 'Atresplayer Premium', slug: 'atresplayer', logo_path: '/img/providers/atresplayer.png', preSelected: false },
        { tmdb_id: 540, sa_id: 'rtve',       name: 'RTVE Play',      slug: 'rtve-play',     logo_path: '/img/providers/rtve-play.png',      preSelected: false },
        { ...MUBI,      preSelected: false },
        { tmdb_id: 568, sa_id: 'flixole',    name: 'FlixOlé',        slug: 'flixole',       logo_path: '/img/providers/flixole.png',        preSelected: false },
    ],

    // ---------------- 🇮🇹 Italia ----------------
    IT: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 39,   sa_id: 'now',      name: 'NOW',              slug: 'now-it',       logo_path: '/img/providers/now-tv.png',         preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { tmdb_id: 29,   sa_id: 'sky',      name: 'Sky Go Italia',    slug: 'sky-go-it',    logo_path: '/img/providers/sky-go.png',         preSelected: false },
        { tmdb_id: 110,  sa_id: 'raiplay',  name: 'RaiPlay',          slug: 'raiplay',      logo_path: '/img/providers/raiplay.png',        preSelected: false },
        { tmdb_id: 109,  sa_id: 'mediaset', name: 'Mediaset Infinity', slug: 'mediaset',    logo_path: '/img/providers/mediaset.png',       preSelected: false },
        { tmdb_id: 477,  sa_id: 'timvision', name: 'TIMVision',       slug: 'timvision',    logo_path: '/img/providers/timvision.png',      preSelected: false },
        { tmdb_id: 524,  sa_id: 'discovery', name: 'Discovery+',      slug: 'discovery-plus', logo_path: '/img/providers/discovery-plus.png', preSelected: false },
        { ...MUBI,       preSelected: false },
    ],

    // ---------------- 🇯🇵 Japan ----------------
    JP: [
        { ...NETFLIX,     preSelected: true },
        { ...PRIME,       preSelected: true },
        { ...DISNEY_PLUS, preSelected: false },
        { tmdb_id: 84,   sa_id: 'unext',  name: 'U-NEXT',      slug: 'u-next',       logo_path: '/img/providers/u-next.png',       preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { tmdb_id: 191,  sa_id: 'hulu',   name: 'Hulu Japan',  slug: 'hulu-japan',   logo_path: '/img/providers/hulu-japan.png',   preSelected: false },
        { tmdb_id: 415,  sa_id: 'fod',    name: 'FOD',         slug: 'fod',          logo_path: '/img/providers/fod.png',          preSelected: false },
        { tmdb_id: 502,  sa_id: 'lemino', name: 'Lemino',      slug: 'lemino',       logo_path: '/img/providers/lemino.png',       preSelected: false },
        { tmdb_id: 2241, sa_id: 'abema',  name: 'ABEMA',       slug: 'abema',        logo_path: '/img/providers/abema.png',        preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
    ],

    // ---------------- 🇰🇷 Korea ----------------
    KR: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { tmdb_id: 356,  sa_id: 'wavve',       name: 'Wavve',        slug: 'wavve',        logo_path: '/img/providers/wavve.png',        preSelected: false },
        { tmdb_id: 1947, sa_id: 'tving',       name: 'TVING',        slug: 'tving',        logo_path: '/img/providers/tving.png',        preSelected: false },
        { tmdb_id: 1597, sa_id: 'coupang',     name: 'Coupang Play', slug: 'coupang-play', logo_path: '/img/providers/coupang-play.png', preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { tmdb_id: 97,   sa_id: 'watcha',      name: 'Watcha',       slug: 'watcha',       logo_path: '/img/providers/watcha.png',       preSelected: false },
        { ...PRIME,      preSelected: false },
        { ...MUBI,       preSelected: false },
    ],

    // ---------------- 🇨🇦 Canada ----------------
    CA: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 230, sa_id: 'crave',  name: 'Crave',      slug: 'crave',      logo_path: '/img/providers/crave.png',      preSelected: false },
        { ...APPLE_TV,  preSelected: false },
        { tmdb_id: 419, sa_id: 'cbcgem', name: 'CBC Gem',    slug: 'cbc-gem',    logo_path: '/img/providers/cbc-gem.png',    preSelected: false },
        { ...PARAMOUNT, preSelected: false },
        { ...HULU,      preSelected: false },
        { tmdb_id: 188, sa_id: 'tubi',   name: 'Tubi',       slug: 'tubi',       logo_path: '/img/providers/tubi.png',       preSelected: false, free: true },
        { tmdb_id: 2255, sa_id: 'citytv', name: 'Citytv+',   slug: 'citytv-plus', logo_path: '/img/providers/citytv-plus.png', preSelected: false },
        { ...MUBI,      preSelected: false },
    ],

    // ---------------- 🇦🇺 Australia ----------------
    AU: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 132, sa_id: 'stan',     name: 'Stan',           slug: 'stan',           logo_path: '/img/providers/stan.png',           preSelected: false },
        { tmdb_id: 87,  sa_id: 'binge',    name: 'Binge',          slug: 'binge',          logo_path: '/img/providers/binge.png',          preSelected: false },
        { ...APPLE_TV,  preSelected: false },
        { tmdb_id: 1968, sa_id: 'foxtel',  name: 'Foxtel Now',     slug: 'foxtel-now',     logo_path: '/img/providers/foxtel-now.png',     preSelected: false },
        { tmdb_id: 660, sa_id: 'abciview', name: 'ABC iView',      slug: 'abc-iview',      logo_path: '/img/providers/abc-iview.png',      preSelected: false },
        { tmdb_id: 661, sa_id: 'sbs',      name: 'SBS On Demand',  slug: 'sbs-on-demand',  logo_path: '/img/providers/sbs-on-demand.png',  preSelected: false },
        { ...MUBI,      preSelected: false },
        { ...PARAMOUNT, preSelected: false },
    ],

    // ---------------- 🇧🇷 Brasil ----------------
    BR: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 307, sa_id: 'globoplay', name: 'Globoplay',   slug: 'globoplay',  logo_path: '/img/providers/globoplay.png',  preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { ...MAX_GLOBAL, preSelected: false },
        { tmdb_id: 167, sa_id: 'telecine',  name: 'Telecine',    slug: 'telecine',   logo_path: '/img/providers/telecine.png',   preSelected: false },
        { ...PARAMOUNT,  preSelected: false },
        { tmdb_id: 47,  sa_id: 'looke',     name: 'Looke',       slug: 'looke',      logo_path: '/img/providers/looke.png',      preSelected: false },
        { ...MUBI,       preSelected: false },
    ],

    // ---------------- 🇲🇽 México ----------------
    MX: [
        { ...NETFLIX,     preSelected: true },
        { ...DISNEY_PLUS, preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 1959, sa_id: 'vix',   name: 'Vix',          slug: 'vix',         logo_path: '/img/providers/vix.png',         preSelected: false },
        { ...APPLE_TV,   preSelected: false },
        { ...MAX_GLOBAL, preSelected: false },
        { ...PARAMOUNT,  preSelected: false },
        { tmdb_id: 144,  sa_id: 'clarovideo', name: 'Claro Video', slug: 'claro-video', logo_path: '/img/providers/claro-video.png', preSelected: false },
        { tmdb_id: 188,  sa_id: 'tubi',  name: 'Tubi',         slug: 'tubi',        logo_path: '/img/providers/tubi.png',        preSelected: false, free: true },
        { ...MUBI,       preSelected: false },
    ],

    // ---------------- 🇮🇳 India ----------------
    IN: [
        { ...NETFLIX,     preSelected: true },
        { ...PRIME,       preSelected: true },
        { tmdb_id: 122, sa_id: 'hotstar',  name: 'Disney+ Hotstar', slug: 'hotstar',  logo_path: '/img/providers/hotstar.png',   preSelected: false },
        { tmdb_id: 232, sa_id: 'zee5',     name: 'Zee5',            slug: 'zee5',     logo_path: '/img/providers/zee5.png',      preSelected: false },
        { tmdb_id: 237, sa_id: 'sonyliv',  name: 'SonyLIV',         slug: 'sonyliv',  logo_path: '/img/providers/sonyliv.png',   preSelected: false },
        { tmdb_id: 220, sa_id: 'jiocinema', name: 'JioCinema',      slug: 'jiocinema', logo_path: '/img/providers/jiocinema.svg', preSelected: false },
        { ...APPLE_TV,  preSelected: false },
        { ...CRUNCHYROLL, preSelected: false },
        { ...MUBI,      preSelected: false },
    ],
};

/**
 * Fallback list shown when an unsupported country is selected.
 * Mirrors REGION-PLATFORMS-DRAFT.md "Fallback" section.
 */
export const FALLBACK_PLATFORMS = [
    { ...NETFLIX,     preSelected: true },
    { ...DISNEY_PLUS, preSelected: true },
    { ...PRIME,       preSelected: true },
    { ...APPLE_TV,    preSelected: false },
    { ...MUBI,        preSelected: false },
    { ...CRUNCHYROLL, preSelected: false },
];

/**
 * @param {string} cc — ISO-3166-1 alpha-2 country code, case-insensitive.
 * @returns {Array} curated platform list, or [] if region is not curated.
 */
export function getCuratedForCountry(cc) {
    if (!cc) return [];
    return REGION_PLATFORMS[String(cc).toUpperCase()] || [];
}

/**
 * @param {string} cc
 * @returns {Array} curated list with FALLBACK_PLATFORMS substituted for unsupported regions.
 */
export function getCuratedOrFallback(cc) {
    const list = getCuratedForCountry(cc);
    return list.length ? list : FALLBACK_PLATFORMS;
}

/**
 * Set of all unique slugs across all regions — used by logo smoke test.
 */
export function getAllSlugs() {
    const set = new Set();
    for (const list of Object.values(REGION_PLATFORMS)) {
        for (const p of list) set.add(p.slug);
    }
    for (const p of FALLBACK_PLATFORMS) set.add(p.slug);
    return set;
}
