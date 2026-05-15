/**
 * Phase 04-04 — Onboarding wizard.
 *
 * R1 (Cinematic redesign — Poster Wall + Ken Burns):
 *   Public API is unchanged (shouldShowOnboarding, startOnboarding, completeStep,
 *   skipOnboarding, fetchProviders, COUNTRY_SHORTLIST). The 19 tests in
 *   tests/onboarding*.test.js continue to pass.
 *
 *   Internal step numbers retained (1 lang, 2 country, 3 platforms) for storage
 *   compatibility. The DOM render adds 2 visual-only slides (Welcome at the
 *   start, Ready at the end) for a total of 5 slides — these do not touch
 *   storage or the state machine.
 *
 * Persistence (unchanged):
 *   - localStorage.lumi_onboarding         JSON { lang, country, ownedPlatforms[], completedAt, skipped[] }
 *   - localStorage.lumi_onboarding_seen    'true' once the wizard is rendered (or skipped)
 *   - localStorage.lumi_onboarding_completed 'true' once step 3 is submitted
 *   - For authenticated users: same shape mirrored to Firestore users/{uid}.preferences (with version=1)
 *
 * Cross-device: shouldShowOnboarding({user, db}) checks Firestore prefs.version>=1
 * before rendering; if present it hydrates localStorage and returns false.
 */

import { getLocale, setLocale, SUPPORTED_LANGS, resolveOnboardingLocale, ONBOARDING_LANGS } from '../lib/locale.js';
import { haptic } from '../lib/haptics.js';

// 31 top-watching countries — shortlist for v1. Defer TMDB /configuration/countries.
export const COUNTRY_SHORTLIST = [
    'TR', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'SE',
    'NO', 'DK', 'FI', 'PL', 'RU', 'JP', 'KR', 'CN', 'TW', 'HK',
    'AU', 'NZ', 'CA', 'MX', 'BR', 'AR', 'CL', 'AE', 'SA', 'IN', 'ZA',
];

const COUNTRY_NAMES = {
    TR: 'Türkiye', US: 'United States', GB: 'United Kingdom', DE: 'Germany',
    FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BE: 'Belgium',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
    RU: 'Russia', JP: 'Japan', KR: 'South Korea', CN: 'China', TW: 'Taiwan',
    HK: 'Hong Kong', AU: 'Australia', NZ: 'New Zealand', CA: 'Canada',
    MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', CL: 'Chile', AE: 'UAE',
    SA: 'Saudi Arabia', IN: 'India', ZA: 'South Africa',
};

const LANG_DISPLAY = {
    tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français',
    es: 'Español', ja: '日本語', ko: '한국어', zh: '中文',
};

// 04-04-r7: All 8 ONBOARDING_LANGS are now selectable. TR + EN are fully
// translated; DE/FR/ES/IT/JA/KO have skeletons that fall back to EN per-key
// via window.i18n.t()'s en fallback chain (public/i18n.js line 1146).
const LAUNCH_LANGS = ONBOARDING_LANGS;
const LANG_DISPLAY_FULL = { tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', ja: '日本語', ko: '한국어' };

const SEEN_FLAG = 'lumi_onboarding_seen';
const COMPLETED_FLAG = 'lumi_onboarding_completed';
const DATA_KEY = 'lumi_onboarding';
const SCHEMA_VERSION = 1;

// 04-04-r1 — Dev/QA override. When 'true', clear the seen+completed flags
// so the wizard re-appears on every launch. Toggle lives in profile settings.
export const ALWAYS_SHOW_FLAG = 'lumi_always_show_onboarding';

// 04-04-r2 — Mid-flow state persistence. If the user closes the app between
// slides, we restore where they left off (within 7 days).
export const PROGRESS_KEY = 'lumi_onboarding_progress';
const PROGRESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function readOnboardingProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.step !== 'number' || parsed.step <= 0) return null;
        const savedAt = parsed.savedAt ? Date.parse(parsed.savedAt) : NaN;
        if (!isFinite(savedAt)) return null;
        if (Date.now() - savedAt > PROGRESS_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeOnboardingProgress(progress) {
    try {
        const payload = {
            step: Number(progress?.step) || 0,
            picks: progress?.picks || {},
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
    } catch {
        /* quota / disabled / etc. */
    }
}

export function clearOnboardingProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch {}
}

function readData() {
    try { return JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); }
    catch { return {}; }
}

function writeData(next) {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(next)); } catch {}
}

/**
 * Decide whether to render the wizard.
 *  - completed flag set → false
 *  - seen flag set (abandoned) → false (don't pester)
 *  - authenticated + Firestore prefs.version>=1 → hydrate LS, return false
 *  - otherwise → true
 *
 * Fails *open* (returns true) on Firestore read error so the user can still
 * configure their profile rather than be blocked by transient network issues.
 */
export async function shouldShowOnboarding({ user, db } = {}) {
    // 04-04-r1 — Dev/QA "Always show onboarding" override. If set, clear the
    // seen+completed flags and short-circuit BEFORE the Firestore hydration
    // path (which would otherwise restore the flags and skip the wizard).
    let alwaysShow = false;
    try { alwaysShow = localStorage.getItem(ALWAYS_SHOW_FLAG) === 'true'; } catch {}
    if (alwaysShow) {
        try {
            localStorage.removeItem(SEEN_FLAG);
            localStorage.removeItem(COMPLETED_FLAG);
            localStorage.removeItem(PROGRESS_KEY);
        } catch {}
        return true;
    }
    try {
        if (localStorage.getItem(COMPLETED_FLAG) === 'true') return false;
        if (localStorage.getItem(SEEN_FLAG) === 'true') return false;
    } catch {}

    if (user?.uid && db) {
        try {
            const snap = await db.collection('users').doc(user.uid).get();
            const prefs = snap.exists ? snap.data()?.preferences : null;
            if (prefs && typeof prefs.version === 'number' && prefs.version >= 1) {
                writeData({
                    lang: prefs.lang,
                    country: prefs.country,
                    ownedPlatforms: prefs.ownedPlatforms || [],
                    completedAt: prefs.completedAt || Date.now(),
                });
                try {
                    localStorage.setItem(SEEN_FLAG, 'true');
                    localStorage.setItem(COMPLETED_FLAG, 'true');
                } catch {}
                if (prefs.lang || prefs.country) {
                    try { setLocale({ lang: prefs.lang, country: prefs.country }); } catch {}
                }
                return false;
            }
        } catch {
            // Firestore unavailable → fall through to true (fail-open).
        }
    }
    return true;
}

/**
 * Mark the wizard as seen and (in the DOM-mounted variant) render it.
 * Tests only need the flag-flip side effect.
 */
export function startOnboarding(options = {}) {
    try { localStorage.setItem(SEEN_FLAG, 'true'); } catch {}
    if (typeof document !== 'undefined' && document.body && typeof document.body.appendChild === 'function') {
        try { renderWizard(options); } catch (err) { console.error('[onboarding] render failed:', err); }
    }
}

/**
 * Persist a single step's payload.
 *   step 1 → { lang }      writes lang + setLocale(lang)
 *   step 2 → { country }   writes country + setLocale(country)
 *   step 3 → { ownedPlatforms } writes platforms + completedAt + sets completed flag
 *               + (if auth) mirrors to Firestore users/{uid}.preferences (merge)
 */
export function completeStep(stepNum, data = {}, options = {}) {
    const current = readData();
    const next = { ...current, ...data };
    writeData(next);

    if (stepNum === 1 && data.lang) {
        try { setLocale({ lang: data.lang }); } catch {}
    }
    if (stepNum === 2 && data.country) {
        try { setLocale({ country: data.country }); } catch {}
    }
    if (stepNum === 3) {
        next.completedAt = Date.now();
        writeData(next);
        try { localStorage.setItem(COMPLETED_FLAG, 'true'); } catch {}
        if (options.user?.uid && options.db) {
            try {
                options.db.collection('users').doc(options.user.uid).set(
                    { preferences: { ...next, version: SCHEMA_VERSION } },
                    { merge: true },
                ).catch?.((e) => console.error('[onboarding] firestore write failed:', e));
            } catch (err) {
                console.error('[onboarding] firestore call failed:', err);
            }
        }
    }
}

/**
 * Skip the wizard outright. Defaults applied from current locale; both flags
 * flipped so the wizard never re-shows. (R1: no longer reachable from UI — the
 * skip button has been removed — but kept on the API for backward-compat with
 * any consumers / tests.)
 */
export function skipOnboarding(options = {}) {
    const locale = getLocale();
    const defaults = {
        lang: locale.lang,
        country: locale.country,
        ownedPlatforms: [],
        completedAt: Date.now(),
        skipped: ['step1', 'step2', 'step3'],
    };
    writeData(defaults);
    try {
        localStorage.setItem(SEEN_FLAG, 'true');
        localStorage.setItem(COMPLETED_FLAG, 'true');
        localStorage.removeItem(PROGRESS_KEY);
    } catch {}
    if (options.user?.uid && options.db) {
        try {
            options.db.collection('users').doc(options.user.uid).set(
                { preferences: { ...defaults, version: SCHEMA_VERSION } },
                { merge: true },
            ).catch?.((e) => console.error('[onboarding] firestore skip-write failed:', e));
        } catch (err) {
            console.error('[onboarding] firestore skip-call failed:', err);
        }
    }
}

/**
 * Fetch TMDB watch providers for a region. Resolves with at most 20 entries
 * sorted by display_priority asc. Resolves with [] on any failure.
 *
 * NOTE: This is the raw TMDB pass-through used by tests and any consumer that
 * wants the unfiltered TMDB list. The onboarding UI uses getCuratedProviders()
 * below, which applies regional curation + pre-select hints.
 */
export async function fetchProviders(country) {
    try {
        const cc = (country || '').toUpperCase();
        const url = `/api/tmdb?endpoint=/watch/providers/tv&watch_region=${encodeURIComponent(cc)}`;
        const res = await fetch(url);
        if (!res || !res.ok) return [];
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        // 04-04-r4: TMDB already region-filters when `watch_region` is passed,
        // so the previous display_priorities[cc] filter was redundant AND could
        // drop entries when TMDB returns `display_priority` (singular) instead
        // of a per-region map. Trust the server-side filter; just sort.
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

// ---------------------------------------------------------------------------
// Curated platform catalog (Phase 04-04-r1)
//
// Replaces the unfiltered TMDB dump (Hoichoi, CaixaForum+, Dekkoo, etc.) with a
// regional allowlist. TR uses a hardcoded priority list (incl. BluTV→HBO Max
// consolidation per 03.2-r14b decision). Other regions filter TMDB by a global
// popular-IDs allowlist, sorted by allowlist priority (NOT display_priority).
// ---------------------------------------------------------------------------

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

// TR curated list — priority order, BluTV consolidated under HBO Max.
const TR_CURATED = [
    { id: 8,    name: 'Netflix',     logo: '/img/providers/netflix.png' },
    { id: 337,  name: 'Disney+',     logo: '/img/providers/disney-plus.png' },
    { id: 119,  name: 'Prime Video', logo: '/img/providers/prime-video.png' },
    { id: 1899, name: 'HBO Max',     logo: '/img/providers/hbo-max.png' },
    { id: 350,  name: 'Apple TV+',   logo: '/img/providers/apple-tv-plus.png' },
    { id: 11,   name: 'MUBI',        logo: '/img/providers/mubi.png' },
    { id: 1968, name: 'Gain',        logo: '/img/providers/gain.svg' },
    { id: 1888, name: 'Exxen',       logo: '/img/providers/exxen.svg' },
    { id: 1855, name: 'Tabii',       logo: '/img/providers/tabii.svg' },
    { id: 2895, name: 'TOD',         logo: '/img/providers/tod.svg' },
    { id: 2864, name: 'Puhu TV',     logo: '/img/providers/puhutv.svg' },
];

// Tier 1 — Universal popular provider IDs (work across most launch markets).
// Priority order matches array order (Netflix first → most universal). This is
// the baseline allowlist applied to every non-TR region; regional additions
// are layered on top via REGIONAL_POPULAR_PROVIDERS below.
const GLOBAL_POPULAR_PROVIDER_IDS = [
    8,    // Netflix
    337,  // Disney+
    119,  // Amazon Prime Video
    9,    //   alt Prime ID
    2100, //   alt Prime ID
    1899, // Max (global)
    384,  // HBO Max (US)
    350,  // Apple TV+
    531,  // Paramount+
    386,  // Peacock
    15,   // Hulu
    283,  // Crunchyroll
    11,   // MUBI
];

// Tier 2+ — Region-popular providers layered ON TOP of the universal set.
// Keys are ISO-3166-1 alpha-2 country codes (uppercase). Values are TMDB
// provider_ids known to be relevant in that market. IDs that overlap with the
// universal list (Netflix/Prime/etc.) are intentionally omitted.
//
// Notes / caveats:
//   - 1968 in TR_CURATED is "Gain". The global allowlist must NOT promote 1968
//     in non-TR regions (Foxtel Now would be a wrong fit anyway); we list 87
//     Binge + 132 Stan for AU instead.
//   - 415 Salto (FR) is defunct → skipped.
//   - Some IDs may not be present in TMDB's current response; filtering uses
//     the priorityIndex.has() guard so unknown entries are harmless no-ops.
const REGIONAL_POPULAR_PROVIDERS = {
    // 04-04-r7: TMDB-verified provider IDs (re-researched against live TMDB
    // /watch/providers endpoint). IDs that overlapped with the universal set
    // are still listed here for clarity/priority-ordering but harmless.
    US: [15, 386],                                              // Hulu, Peacock
    GB: [38, 39, 151, 1796],                                    // BBC iPlayer, NOW TV, BritBox, ITVX
    UK: [38, 39, 151, 1796],                                    // alias — TMDB sometimes returns UK
    DE: [298, 178, 29, 532],                                    // RTL+, Joyn, WOW, Magenta TV
    FR: [381, 56, 78, 236],                                     // Canal+, OCS Go, MyCanal, France TV
    ES: [149, 568, 230],                                        // Movistar+, FlixOlé, Atresplayer
    IT: [109, 110, 524],                                        // Mediaset Play, RaiPlay, Discovery+
    JP: [84, 415, 191, 1882],                                   // U-NEXT, FOD, Hulu Japan, DAZN
    KR: [356, 1947, 1597, 97],                                  // Wavve, TVING, Coupang Play, Watcha
    CA: [230, 188, 419],                                        // Crave, Tubi, CBC Gem
    AU: [87, 132],                                              // Binge, Stan (Foxtel 1968 blocked — conflicts with TR Gain)
    BR: [307, 167],                                             // Globoplay, Telecine
    MX: [1959, 144],                                            // Vix, Claro Video
    IN: [122, 232, 220],                                        // Hotstar, Zee5, JioCinema
};

// Default pre-selected provider IDs (top-3 universal).
const PRE_SELECTED_IDS = new Set([8, 337, 119]);

/**
 * Curated platform list for the onboarding UI.
 *
 * TR  → hardcoded priority list (11 entries, BluTV consolidated under HBO Max).
 * else → TMDB fetch, filtered by GLOBAL_POPULAR_PROVIDER_IDS allowlist, sorted
 *        by allowlist priority, capped at 10. Falls back to a static global set
 *        if TMDB returns nothing.
 *
 * Returns: [{ id, name, logoUrl, preSelected }]
 */
export async function getCuratedProviders(country) {
    const cc = (country || '').toUpperCase();

    if (cc === 'TR') {
        return TR_CURATED.map((p) => ({
            id: p.id,
            name: p.name,
            logoUrl: p.logo,
            preSelected: PRE_SELECTED_IDS.has(p.id),
        }));
    }

    // Non-TR: pull TMDB, filter by (universal ∪ regional), sort by priority.
    // 04-04-r6: regional allowlist additions surface BBC iPlayer in UK,
    // Canal+ in FR, U-NEXT in JP, etc. Universal IDs always rank first.
    const raw = await fetchProviders(cc);
    const regional = REGIONAL_POPULAR_PROVIDERS[cc] || [];
    const combinedOrder = [...GLOBAL_POPULAR_PROVIDER_IDS, ...regional];
    const priorityIndex = new Map(combinedOrder.map((id, i) => [id, i]));

    // 04-04-r7 QA aid: log any TMDB-returned provider NOT in our allowlist so
    // we can spot promising regional entries during QA.
    try {
        raw.forEach((p) => {
            if (!priorityIndex.has(p.provider_id)) {
                console.debug('[providers] unmatched:', p.provider_id, p.provider_name);
            }
        });
    } catch {}

    let filtered = raw
        .filter((p) => priorityIndex.has(p.provider_id))
        .sort((a, b) => priorityIndex.get(a.provider_id) - priorityIndex.get(b.provider_id))
        .map((p) => ({
            id: p.provider_id,
            name: p.provider_name,
            logoUrl: p.logo_path ? `${TMDB_LOGO_BASE}${p.logo_path}` : '',
            preSelected: PRE_SELECTED_IDS.has(p.provider_id),
        }));

    // Dedupe Prime Video variants (9 / 119 / 2100) — keep only the first.
    const seenPrime = { hit: false };
    filtered = filtered.filter((p) => {
        const isPrime = p.id === 9 || p.id === 119 || p.id === 2100;
        if (!isPrime) return true;
        if (seenPrime.hit) return false;
        seenPrime.hit = true;
        return true;
    });

    // Dedupe Max/HBO Max variants (1899 / 384) — keep only the first.
    const seenMax = { hit: false };
    filtered = filtered.filter((p) => {
        const isMax = p.id === 1899 || p.id === 384;
        if (!isMax) return true;
        if (seenMax.hit) return false;
        seenMax.hit = true;
        return true;
    });

    // Fallback: if TMDB returned nothing usable, show a minimal global default.
    if (!filtered.length) {
        return [
            { id: 8,   name: 'Netflix',     logoUrl: '/img/providers/netflix.png',       preSelected: true },
            { id: 337, name: 'Disney+',     logoUrl: '/img/providers/disney-plus.png',   preSelected: true },
            { id: 119, name: 'Prime Video', logoUrl: '/img/providers/prime-video.png',   preSelected: true },
            { id: 350, name: 'Apple TV+',   logoUrl: '/img/providers/apple-tv-plus.png', preSelected: false },
            { id: 531, name: 'Paramount+',  logoUrl: '/img/providers/paramount-plus.png', preSelected: false },
        ];
    }

    // 04-04-r7: cap raised 12 → 16 to make room for the expanded regional lists.
    return filtered.slice(0, 16);
}

/**
 * Test-only export: get the regional+universal allowlist for a given country.
 * Returns an ordered array of provider IDs that would be accepted from TMDB.
 * Used by tests to assert regional deltas without an actual fetch.
 */
export function _getAllowlistForCountry(country) {
    const cc = (country || '').toUpperCase();
    const regional = REGIONAL_POPULAR_PROVIDERS[cc] || [];
    return [...GLOBAL_POPULAR_PROVIDER_IDS, ...regional];
}

/**
 * Fetch ~24 trending posters for the Ken Burns wall. Resolves with array of
 * `w342` poster URLs. Resolves with [] on failure — the wall will then show
 * gradient placeholders (no jank).
 */
async function fetchPosterWall() {
    try {
        const res = await fetch('/api/tmdb?endpoint=/trending/all/week');
        if (!res || !res.ok) return [];
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        return results
            .map((r) => r.poster_path)
            .filter(Boolean)
            .slice(0, 24)
            .map((p) => `https://image.tmdb.org/t/p/w342${p}`);
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// DOM RENDER (browser-only; tests don't invoke this path)
// ---------------------------------------------------------------------------

function flag(cc) {
    try {
        return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1F1A5 + c.charCodeAt(0)));
    } catch { return cc; }
}

function t(key, fallback) {
    try {
        const i18n = (typeof window !== 'undefined') ? window.i18n : null;
        if (i18n && typeof i18n.t === 'function') {
            const v = i18n.t(key);
            if (v && v !== key) return v;
        }
        if (i18n) {
            const lang = i18n.currentLang || 'en';
            const dict = i18n.translations?.[lang];
            if (dict && dict[key]) return dict[key];
        }
    } catch {}
    return fallback;
}

function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}

const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

// ---------------------------------------------------------------------------
// 04-04-r2 — Cinema Grade visual helpers
// ---------------------------------------------------------------------------

function prefersReducedMotion() {
    try {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch { return false; }
}

// 04-04-r7: Audio toggle removed. Web Audio tick + speaker SVGs + the
// localStorage key for the audio pref are all gone. playTick() is kept as a
// no-op so existing call sites don't need surgery.
function playTick() { /* removed in r7 */ }

/** Split text into per-letter spans for the type-on hero animation. */
function applyLetterTypeOn(el_) {
    if (!el_ || prefersReducedMotion()) return;
    const text = el_.textContent;
    el_.textContent = '';
    let i = 0;
    for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'onb-typeon-letter' + (ch === ' ' ? ' space' : '');
        if (ch === ' ') span.innerHTML = '&nbsp;';
        else span.textContent = ch;
        span.style.setProperty('--i', String(i++));
        el_.appendChild(span);
    }
}

// Approximate lat/long → percent coords on a simplified equirectangular world map.
// (x: 0..100 left→right, y: 0..100 top→bottom)
// 04-04-r5: country pin coords are now computed from real lat/lng via
// equirectangular projection (matches the new world map's viewBox 0..1000 x
// 0..500). Pins use percent units so they overlay any aspect-stretched map.
// Format: [lat, lng]. Conversion in helper below.
const COUNTRY_LATLNG = {
    TR: [39.0, 35.0],  US: [38.0, -97.0], GB: [54.0, -2.5],
    DE: [51.0,  10.0], FR: [46.5,  2.5],  ES: [40.0, -4.0],
    IT: [42.5,  12.5], NL: [52.3,  5.5],  BE: [50.5,  4.5],
    SE: [62.0,  15.0], NO: [62.0,  10.0], DK: [56.0,  10.0],
    FI: [64.0,  26.0], PL: [52.0,  19.0], RU: [60.0,  90.0],
    JP: [36.0, 138.0], KR: [36.5, 128.0], CN: [35.0, 105.0],
    TW: [23.5, 121.0], HK: [22.3, 114.2], AU: [-25.0, 134.0],
    NZ: [-41.0, 174.0],CA: [56.0, -106.0],MX: [23.0, -102.0],
    BR: [-10.0, -55.0],AR: [-34.0, -64.0],CL: [-30.0, -71.0],
    AE: [24.0,  54.0], SA: [24.0,  45.0], IN: [22.0,  78.0],
    ZA: [-29.0, 24.0],
};

// Convert lat/lng to {x%, y%} for a 2:1 equirectangular viewBox.
function latLngToPct(lat, lng) {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
}

// Back-compat: callers expect COUNTRY_MAP_COORDS[cc] = {x%, y%}.
const COUNTRY_MAP_COORDS = Object.fromEntries(
    Object.entries(COUNTRY_LATLNG).map(([cc, [lat, lng]]) => [cc, latLngToPct(lat, lng)])
);

// 04-04-r7 — Hand-traced world map with more accurate continent vertices in
// equirectangular projection (viewBox 0..1000 x 0..500). Wikipedia Commons
// downloads were either too large (>40KB) or unavailable, so the r5 trace was
// expanded with finer vertices for North America (Florida + Baja), South
// America (Patagonia taper), Africa (horn + Cape), Asia (Korean peninsula +
// Indochina + Indonesian archipelago), and Australia (Cape York + Tasmania).
// Pin coords still use lat/lng → equirectangular via latLngToPct().
const WORLD_MAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="none">
  <defs>
    <linearGradient id="onb-map-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9683b8"/>
      <stop offset="1" stop-color="#5a4a73"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="500" fill="rgba(0,0,0,0)"/>
  <g fill="url(#onb-map-g)" stroke="rgba(255,255,255,0.22)" stroke-width="1.0" stroke-linejoin="round" opacity="0.85">
    <!-- Greenland -->
    <path d="M255,55 L320,50 L350,70 L355,100 L335,130 L295,138 L265,125 L250,100 L248,75 Z"/>
    <!-- Alaska -->
    <path d="M40,115 L90,108 L120,118 L115,138 L85,145 L55,140 L38,128 Z"/>
    <!-- North America (Canada+USA+Mexico) -->
    <path d="M115,140 L160,108 L210,100 L245,108 L268,125 L270,148 L258,170 L260,195 L252,215 L242,240 L228,255 L210,260 L198,275 L185,255 L168,242 L160,225 L155,210 L148,205 L132,202 L120,195 L108,180 L100,165 L98,148 Z"/>
    <!-- Florida + Gulf -->
    <path d="M232,245 L242,250 L245,275 L235,278 L228,260 Z"/>
    <!-- Central America -->
    <path d="M205,278 L228,278 L248,295 L260,312 L258,322 L242,318 L222,308 L210,295 Z"/>
    <!-- South America (Brazil bulge + Patagonia taper) -->
    <path d="M260,320 L295,315 L325,325 L348,348 L355,378 L348,408 L335,435 L318,455 L302,465 L292,470 L285,455 L278,432 L270,408 L262,380 L258,355 L256,338 Z"/>
    <!-- Iceland -->
    <path d="M458,118 L478,116 L485,128 L475,138 L460,132 Z"/>
    <!-- UK + Ireland -->
    <path d="M460,155 L478,148 L488,158 L495,175 L488,195 L472,198 L462,185 L458,170 Z"/>
    <!-- Scandinavia -->
    <path d="M515,80 L545,75 L568,85 L580,108 L578,135 L562,155 L540,158 L520,145 L510,125 L508,100 Z"/>
    <!-- Continental Europe -->
    <path d="M490,170 L515,162 L545,165 L578,170 L605,178 L612,195 L605,210 L585,218 L562,215 L540,212 L518,208 L500,200 L488,188 Z"/>
    <!-- Iberia -->
    <path d="M462,205 L488,200 L498,218 L488,232 L472,235 L460,225 Z"/>
    <!-- Italy peninsula -->
    <path d="M535,215 L545,215 L555,238 L552,255 L542,258 L538,238 Z"/>
    <!-- North Africa -->
    <path d="M488,230 L530,228 L575,232 L605,238 L625,250 L640,268 L640,295 L625,318 L605,335 L588,348 L572,358 L558,355 L545,335 L535,310 L525,288 L518,268 L508,250 L498,242 Z"/>
    <!-- East Africa horn + Sub-Saharan + Cape -->
    <path d="M620,275 L645,272 L665,288 L668,310 L658,332 L640,358 L625,388 L612,415 L598,432 L582,438 L572,430 L568,408 L572,385 L580,358 L590,335 L605,315 L615,295 Z"/>
    <!-- Madagascar -->
    <path d="M652,390 L665,388 L668,408 L662,425 L652,420 Z"/>
    <!-- Middle East / Arabia -->
    <path d="M608,228 L645,225 L670,238 L682,260 L678,288 L658,295 L640,290 L618,280 L608,262 Z"/>
    <!-- Russia + Siberia (top band) -->
    <path d="M578,80 L640,72 L720,72 L800,78 L880,88 L935,105 L948,125 L938,148 L908,158 L860,162 L800,162 L740,160 L680,155 L620,150 L590,142 L578,120 Z"/>
    <!-- Central Asia + China -->
    <path d="M620,160 L680,162 L740,168 L800,175 L848,188 L862,212 L850,238 L818,258 L780,260 L745,252 L712,248 L688,255 L668,250 L650,235 L632,218 L622,195 Z"/>
    <!-- Korean peninsula -->
    <path d="M850,200 L862,200 L865,222 L858,235 L850,228 L848,215 Z"/>
    <!-- Japan -->
    <path d="M880,178 L898,172 L910,188 L905,212 L890,220 L878,205 L875,190 Z"/>
    <!-- India peninsula -->
    <path d="M695,248 L730,252 L742,278 L735,305 L720,310 L708,288 L700,268 Z"/>
    <!-- Southeast Asia (Indochina + Malay) -->
    <path d="M775,258 L808,260 L825,278 L832,300 L818,318 L800,322 L788,305 L780,285 L778,272 Z"/>
    <!-- Indonesian archipelago -->
    <path d="M790,325 L835,322 L862,332 L878,348 L865,358 L838,358 L815,355 L798,348 L788,338 Z"/>
    <!-- Philippines -->
    <path d="M858,288 L870,285 L878,305 L872,320 L862,315 L858,302 Z"/>
    <!-- Australia (Cape York + Great Australian Bight) -->
    <path d="M810,358 L850,352 L885,355 L915,365 L928,385 L920,408 L895,418 L860,420 L832,415 L815,400 L805,385 L802,370 Z"/>
    <!-- Tasmania -->
    <path d="M888,425 L900,422 L905,435 L895,440 L888,435 Z"/>
    <!-- New Zealand -->
    <path d="M945,408 L960,405 L968,422 L962,438 L948,435 L942,422 Z"/>
    <!-- Antarctica strip -->
    <path d="M40,475 L140,468 L260,465 L400,468 L540,468 L680,468 L820,470 L940,475 L965,488 L800,492 L640,495 L480,495 L320,494 L160,490 L40,488 Z"/>
  </g>
</svg>`.trim();

// Register the pin-drop helper on window so the country slide can invoke it.
function ensurePinHelper() {
    if (typeof window === 'undefined' || window.__onbDropMapPin) return;
    window.__onbDropMapPin = (cc, mapHost) => {
        if (!mapHost || prefersReducedMotion()) return;
        const coords = COUNTRY_MAP_COORDS[cc];
        if (!coords) return;
        // Lazy-mount the map SVG once.
        if (!mapHost.querySelector('svg')) {
            mapHost.insertAdjacentHTML('afterbegin', WORLD_MAP_SVG);
        }
        // Remove old pin if any
        mapHost.querySelectorAll('.onb-map-pin').forEach((n) => n.remove());
        const pin = document.createElement('div');
        pin.className = 'onb-map-pin drop';
        pin.style.left = coords.x + '%';
        pin.style.top  = coords.y + '%';
        pin.innerHTML = '<svg viewBox="0 0 18 22" xmlns="http://www.w3.org/2000/svg">'
          + '<path d="M9 1c4 0 7 3 7 7c0 5-7 13-7 13S2 13 2 8c0-4 3-7 7-7z" fill="url(#pg)" stroke="#fff" stroke-width="0.8"/>'
          + '<circle cx="9" cy="8" r="2.4" fill="#fff"/>'
          + '<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">'
          + '<stop offset="0" stop-color="#f4a261"/><stop offset="1" stop-color="#ff5d8f"/>'
          + '</linearGradient></defs></svg>';
        mapHost.appendChild(pin);

        // Flash the country card
        const card = mapHost.parentElement?.querySelector('.onb-card');
        if (card) {
            card.classList.add('flash');
            setTimeout(() => card.classList.remove('flash'), 600);
        }
    };
}

function ensureConfettiHelper() {
    if (typeof window === 'undefined' || window.__onbConfettiBurst) return;
    window.__onbConfettiBurst = (anchor) => {
        if (prefersReducedMotion()) return;
        const rect = anchor && anchor.getBoundingClientRect
            ? anchor.getBoundingClientRect()
            : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const colors = ['#f4a261', '#e76f51', '#ff5d8f', '#ffb36b', '#c77dff'];
        const N = 36;
        for (let i = 0; i < N; i++) {
            const piece = document.createElement('div');
            piece.className = 'onb-confetti-piece';
            piece.style.left = cx + 'px';
            piece.style.top  = cy + 'px';
            piece.style.background = colors[i % colors.length];
            const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
            const dist = 120 + Math.random() * 180;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 80; // gravity offset upward burst
            piece.style.setProperty('--dx', dx + 'px');
            piece.style.setProperty('--dy', dy + 'px');
            piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
            document.body.appendChild(piece);
            setTimeout(() => { try { piece.remove(); } catch {} }, 1600);
        }
    };
}

function renderWizard(options = {}) {
    if (typeof document === 'undefined') return;
    if (document.getElementById('onboarding-root')) return; // idempotent

    ensurePinHelper();
    ensureConfettiHelper();

    // 04-04-r7: Onboarding boots in the user's NAVIGATOR language, not the
    // app-wide EN-first default. After S2 a `setLocale()` call persists the
    // user's pick and the rest of the app reads it via getLocale().
    const locale = resolveOnboardingLocale();
    // Sync window.i18n to the initial onboarding language so t() returns the
    // right strings on first paint (i18n's loadLanguage runs at boot and may
    // have settled on EN before we resolved the navigator language).
    try {
        if (typeof window !== 'undefined' && window.i18n && window.i18n.translations?.[locale.lang]) {
            window.i18n.currentLang = locale.lang;
        }
    } catch {}

    // 04-04-r2 — Hydrate from in-flight progress (≤7 days old).
    const restored = readOnboardingProgress();

    // Visual slide indices: 0 welcome, 1 lang, 2 country, 3 platforms, 4 premium, 5 ready
    // Storage steps remain 1..3 (lang/country/platforms); premium is visual-only
    // (mock paywall — Phase 5 wires the real RevenueCat purchase flow).
    const state = {
        slide: restored?.step || 0,
        direction: 'fwd',
        lang: restored?.picks?.lang || locale.lang,
        country: restored?.picks?.country || locale.country || 'TR',
        ownedPlatforms: Array.isArray(restored?.picks?.platforms) ? restored.picks.platforms.slice() : [],
        premiumChoice: restored?.picks?.premiumChoice || null,
        providers: [],
        providersLoading: false,
        providersFailed: false,
        countryQuery: '',
        posters: [],
    };

    function persistProgress() {
        writeOnboardingProgress({
            step: state.slide,
            picks: {
                lang: state.lang,
                country: state.country,
                platforms: state.ownedPlatforms.slice(),
                premiumChoice: state.premiumChoice,
            },
        });
    }

    // ----- DOM scaffold ----------------------------------------------------
    const root = document.createElement('div');
    root.id = 'onboarding-root';
    root.className = 'onboarding-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'onb-slide-heading');

    // ARIA live region — announces step changes ("Step 3 of 6: country").
    const announcer = el('div', {
        class: 'onb-sr-only',
        'aria-live': 'polite',
        'aria-atomic': 'true',
    });

    // Poster wall (24 tiles) — kept as fallback; r2 parallax layers below override it.
    const wall = el('div', { class: 'onb-wall', 'aria-hidden': 'true' });
    const wallTiles = [];
    for (let i = 0; i < 24; i++) {
        const tile = el('div', { class: 'onb-wall-tile' }, [el('img', { alt: '', loading: 'lazy', decoding: 'async' })]);
        wallTiles.push(tile);
        wall.appendChild(tile);
    }

    // 04-04-r2 — 3-layer parallax poster wall.
    // Back (6x8 small w92, 18px blur), Mid (4x6 w185, 8px blur), Front (3x4 w342).
    const reduced = prefersReducedMotion();
    const wallBack  = el('div', { class: 'onb-wall-layer back',  'aria-hidden': 'true' });
    const wallMid   = el('div', { class: 'onb-wall-layer mid',   'aria-hidden': 'true' });
    const wallFront = el('div', { class: 'onb-wall-layer front', 'aria-hidden': 'true' });
    const wallBackImgs  = [];
    const wallMidImgs   = [];
    const wallFrontImgs = [];
    for (let i = 0; i < 48; i++) {
        const im = el('img', { alt: '', loading: 'lazy', decoding: 'async' });
        wallBackImgs.push(im); wallBack.appendChild(im);
    }
    for (let i = 0; i < 24; i++) {
        const im = el('img', { alt: '', loading: 'lazy', decoding: 'async' });
        wallMidImgs.push(im); wallMid.appendChild(im);
    }
    for (let i = 0; i < 12; i++) {
        const im = el('img', { alt: '', loading: 'lazy', decoding: 'async' });
        wallFrontImgs.push(im); wallFront.appendChild(im);
    }

    const scrim = el('div', { class: 'onb-scrim', 'aria-hidden': 'true' });

    const glowOrange = el('div', { class: 'onb-glow onb-glow-orange', 'aria-hidden': 'true' });
    const glowPink = el('div', { class: 'onb-glow onb-glow-pink', 'aria-hidden': 'true' });

    // Overlay (back + pills + stage)
    const backBtn = el('button', { class: 'onb-back', type: 'button', 'aria-label': 'Back', html: BACK_SVG });

    // 04-04-r7: Audio toggle removed. Slot in the recap-chip host (top-right
    // on S3/S4/S5/S6) instead — keeps the chrome layout balanced.
    const recapHost = el('div', { class: 'onb-recap-chips', 'aria-hidden': 'true' });

    const pills = el('div', { class: 'onb-pills', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': '6' });
    const pillEls = [];
    const SLIDE_NAMES = ['welcome', 'language', 'country', 'platforms', 'premium', 'ready'];
    for (let i = 0; i < 6; i++) {
        const p = el('div', {
            class: 'onb-pill',
            role: 'presentation',
            'aria-label': `Step ${i + 1} of 6`,
        });
        pills.appendChild(p);
        pillEls.push(p);
    }

    const topbar = el('div', { class: 'onb-topbar' }, [backBtn, pills, recapHost]);
    const stage = el('div', { class: 'onb-stage', 'data-onb-stage': '' });

    const overlay = el('div', { class: 'onb-overlay' }, [topbar, stage, announcer]);

    root.classList.add('has-parallax');
    root.appendChild(wall); // legacy fallback (CSS hides when .has-parallax)
    root.appendChild(wallBack);
    root.appendChild(wallMid);
    root.appendChild(wallFront);
    root.appendChild(scrim);
    root.appendChild(glowOrange);
    root.appendChild(glowPink);
    root.appendChild(overlay);
    document.body.appendChild(root);

    // Pointer-driven parallax (desktop QA / devices with hover).
    if (!reduced && typeof window !== 'undefined' && window.matchMedia) {
        const hasHover = (() => { try { return window.matchMedia('(hover: hover)').matches; } catch { return false; } })();
        if (hasHover) {
            let lastShift = 0;
            window.addEventListener('mousemove', (e) => {
                if (Date.now() - lastShift < 16) return;
                lastShift = Date.now();
                const xRatio = (e.clientX / window.innerWidth) - 0.5;
                const yRatio = (e.clientY / window.innerHeight) - 0.5;
                root.style.setProperty('--onb-px-back',  (xRatio * -8)  + 'px');
                root.style.setProperty('--onb-px-mid',   (xRatio * -16) + 'px');
                root.style.setProperty('--onb-px-front', (xRatio * -28) + 'px');
            });
        }
    }

    // ----- Focus trap ------------------------------------------------------
    function getFocusable() {
        return Array.from(root.querySelectorAll(
            'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((n) => n.offsetParent !== null || n === document.activeElement);
    }
    function onKeydown(e) {
        if (e.key !== 'Tab') return;
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
    root.addEventListener('keydown', onKeydown);

    // ----- Poster wall load ------------------------------------------------
    function paintWall(urls) {
        if (!urls.length) return;
        // Legacy wall (kept for fallback paths)
        for (let i = 0; i < wallTiles.length; i++) {
            const url = urls[i % urls.length];
            const img = wallTiles[i].querySelector('img');
            if (!img) continue;
            img.addEventListener('load', () => wallTiles[i].classList.add('loaded'), { once: true });
            img.src = url;
        }
        // 04-04-r2 — Paint 3 parallax layers using SAME source posters (no new fetches).
        // Build the per-size URLs by mapping the /w342/ prefix down to /w185/ + /w92/.
        function reSize(url, size) {
            return url.replace(/\/w\d+\//, '/' + size + '/');
        }
        const paintLayer = (imgs, size) => {
            for (let i = 0; i < imgs.length; i++) {
                const im = imgs[i];
                im.addEventListener('load', () => im.classList.add('loaded'), { once: true });
                im.src = reSize(urls[i % urls.length], size);
            }
        };
        paintLayer(wallBackImgs,  'w92');
        paintLayer(wallMidImgs,   'w185');
        paintLayer(wallFrontImgs, 'w342');
    }
    fetchPosterWall().then((urls) => {
        state.posters = urls;
        paintWall(urls);
    });

    // ----- Helpers ---------------------------------------------------------
    function updatePills() {
        pillEls.forEach((p, i) => {
            p.classList.toggle('done', i < state.slide);
            const isActive = i === state.slide;
            p.classList.toggle('active', isActive);
            if (isActive) p.setAttribute('aria-current', 'step');
            else p.removeAttribute('aria-current');
        });
    }
    function updateBackBtn() {
        backBtn.toggleAttribute('disabled', state.slide === 0);
    }
    function updateAtmosphere() {
        // Welcome (0), Premium (4) and Ready (5) get the warm glow.
        const showGlow = state.slide === 0 || state.slide === 4 || state.slide === 5;
        glowOrange.style.display = showGlow ? '' : 'none';
        glowPink.style.display = showGlow ? '' : 'none';
    }
    function announceSlide() {
        const name = SLIDE_NAMES[state.slide] || `slide ${state.slide + 1}`;
        announcer.textContent = `Step ${state.slide + 1} of 6: ${name}`;
    }
    function focusSlideHeading() {
        // Defer to next frame so the slide is mounted.
        requestAnimationFrame(() => {
            const heading = stage.querySelector('[data-onb-heading]') || stage.querySelector('h1, h2');
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                try { heading.focus({ preventScroll: true }); } catch { try { heading.focus(); } catch {} }
            }
        });
    }
    function close() {
        try { root.removeEventListener('keydown', onKeydown); } catch {}
        if (root.parentNode) root.parentNode.removeChild(root);
    }

    function goto(n) {
        state.direction = n > state.slide ? 'fwd' : 'back';
        state.slide = n;
        updatePills();
        updateBackBtn();
        updateAtmosphere();
        try { updateAccent(); } catch {} // 04-04-r7
        try { updateRecapChips(); } catch {} // 04-04-r7
        renderCurrentSlide();
        announceSlide();
        focusSlideHeading();
        persistProgress();
        playTick();
        if (n === 3) loadProvidersIfNeeded();
        if (n === 4) openPremiumVault();
        if (n === 5) openCurtains();
    }

    // 04-04-r2 — Vault opening for premium slide. The two halves slide apart
    // 700ms after mount, revealing the feature stack underneath.
    function openPremiumVault() {
        if (reduced) return;
        requestAnimationFrame(() => {
            const slide = stage.querySelector('.onb-slide-premium');
            if (!slide || slide.querySelector('.onb-vault')) return;
            const vault = el('div', { class: 'onb-vault', 'aria-hidden': 'true' }, [
                el('div', { class: 'onb-vault-half left' }),
                el('div', { class: 'onb-vault-half right' }),
            ]);
            slide.appendChild(vault);
            requestAnimationFrame(() => vault.classList.add('open'));
            setTimeout(() => { try { vault.remove(); } catch {} }, 1200);
        });
    }

    // 04-04-r2 — Cinema letterbox curtains for Ready slide.
    function openCurtains() {
        if (reduced) return;
        const top = el('div', { class: 'onb-curtain top', 'aria-hidden': 'true' });
        const bot = el('div', { class: 'onb-curtain bottom', 'aria-hidden': 'true' });
        document.body.appendChild(top);
        document.body.appendChild(bot);
        requestAnimationFrame(() => {
            top.classList.add('open');
            bot.classList.add('open');
        });
        setTimeout(() => {
            try { top.remove(); bot.remove(); } catch {}
        }, 1200);
    }

    backBtn.addEventListener('click', () => {
        if (state.slide > 0) {
            haptic.tap();
            goto(state.slide - 1);
        }
    });

    // ----- Slide renderers -------------------------------------------------
    function buildWelcome() {
        const slide = el('div', { class: 'onb-slide onb-slide-welcome', 'data-dir': state.direction });

        // --- Top app-bar style brand (small, top-left). 04-04-r6:
        // The giant centered wordmark + tagline pair was replaced with a single
        // refined "lumi" mark anchored top-left, the way Apple TV / Netflix do.
        const brand = el('div', { class: 'onb-brand onb-brand-bar', 'aria-hidden': 'false' });
        const wordmark = el('div', { class: 'onb-wordmark onb-wordmark-bar', text: 'lumi' });
        brand.appendChild(wordmark);
        slide.appendChild(brand);

        // --- Asymmetric poster trio (foreground hero). 04-04-r6:
        // Single rotating poster replaced with a 3-poster "pile" — different
        // sizes, slight rotation, shadow-stacked. Posters resolve via TMDB.
        const TRIO_TMDB = [
            { id: 27205,  type: 'movie' }, // Inception (left, back)
            { id: 157336, type: 'movie' }, // Interstellar (center, front)
            { id: 66732,  type: 'tv' },    // Stranger Things (right, mid)
        ];
        const trio = el('div', { class: 'onb-poster-trio', 'aria-hidden': 'true' });
        TRIO_TMDB.forEach((_, idx) => {
            trio.appendChild(el('div', {
                class: `onb-trio-poster onb-trio-poster-${idx}`,
                'data-idx': String(idx),
            }));
        });
        slide.appendChild(trio);

        // Lazy-load poster paths via TMDB; gracefully no-op on failure.
        (async () => {
            const urls = await Promise.all(TRIO_TMDB.map(async (item) => {
                try {
                    const r = await fetch(`/api/tmdb?endpoint=/${item.type}/${item.id}`);
                    if (!r || !r.ok) return null;
                    const d = await r.json();
                    return d?.poster_path
                        ? `https://image.tmdb.org/t/p/w500${d.poster_path}`
                        : null;
                } catch { return null; }
            }));
            trio.querySelectorAll('.onb-trio-poster').forEach((p, i) => {
                if (urls[i]) p.style.backgroundImage = `url("${urls[i]}")`;
            });
        })();

        // --- Hero copy (mega headline + body) ---
        const hero = el('h1', {
            class: 'onb-hero-title onb-hero-typeon',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.welcome.title', 'What should we watch tonight?'),
        });
        slide.appendChild(hero);
        requestAnimationFrame(() => applyLetterTypeOn(hero));
        slide.appendChild(el('p', {
            class: 'onb-hero-sub',
            text: t('onboarding.welcome.sub', 'Lumi reads your mood and surfaces the right film in seconds. 200+ countries, 10+ languages, one perfect pick.'),
        }));

        // --- 3-up value props (frosted pills) ---
        const props = el('div', { class: 'onb-value-props', role: 'list' });
        const valueRows = [
            { icon: '🎯', title: t('onboarding.welcome.prop1.title', "Tonight's pick"),         body: t('onboarding.welcome.prop1.body', 'One right film') },
            { icon: '⚡', title: t('onboarding.welcome.prop2.title', 'In seconds'),             body: t('onboarding.welcome.prop2.body', 'Picked in 5s') },
            { icon: '🌍', title: t('onboarding.welcome.prop3.title', 'Anywhere, any language'), body: t('onboarding.welcome.prop3.body', '200+ countries, 10+ langs') },
        ];
        valueRows.forEach((row) => {
            const pill = el('div', { class: 'onb-value-pill', role: 'listitem' }, [
                el('span', { class: 'onb-value-icon', text: row.icon }),
                el('div', { class: 'onb-value-text' }, [
                    el('div', { class: 'onb-value-title', text: row.title }),
                    el('div', { class: 'onb-value-body',  text: row.body }),
                ]),
            ]);
            props.appendChild(pill);
        });
        slide.appendChild(props);

        // --- Particle dust field (decorative, low-intensity per r6 brief) ---
        if (!prefersReducedMotion()) {
            const dust = el('div', { class: 'onb-dust', 'aria-hidden': 'true' });
            for (let i = 0; i < 3; i++) {
                const m = el('span', { class: 'onb-dust-mote' });
                m.style.setProperty('--mx', (Math.random() * 100) + '%');
                m.style.setProperty('--dur', (8 + Math.random() * 6) + 's');
                m.style.setProperty('--delay', (Math.random() * 4) + 's');
                m.style.setProperty('--hue', i % 2 ? '#f4a261' : '#ff5d8f');
                dust.appendChild(m);
            }
            slide.appendChild(dust);
        }

        slide.appendChild(el('div', { class: 'onb-welcome-spacer' }));
        slide.appendChild(el('button', {
            class: 'onb-cta',
            type: 'button',
            text: t('onboarding.welcome.cta', 'Set the scene'),
            onclick: () => { haptic.tap(); goto(1); },
        }));
        return slide;
    }

    function buildLang() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h2', {
            class: 'onb-card-title',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.lang.title', 'Hangi dilde konuşalım?'),
        }));
        slide.appendChild(el('p', { class: 'onb-card-sub', text: t('onboarding.lang.sub', 'Daha fazla dil yakında.') }));

        const list = el('div', { class: 'onb-list' });
        SUPPORTED_LANGS.forEach((lng) => {
            const ready = LAUNCH_LANGS.includes(lng);
            const opt = el('button', {
                class: `onb-option${state.lang === lng ? ' selected' : ''}${ready ? '' : ' disabled'}`,
                type: 'button',
                disabled: !ready,
            }, [
                el('span', { class: 'onb-opt-label', text: LANG_DISPLAY[lng] || lng }),
                !ready ? el('span', { class: 'onb-opt-tag', text: t('common.comingSoon', 'Coming soon') }) : null,
                el('span', { class: 'onb-opt-check', 'aria-hidden': 'true' }),
            ]);
            if (ready) {
                opt.setAttribute('aria-label', `${t('onboarding.lang.title', 'Language')}: ${LANG_DISPLAY[lng] || lng}`);
                opt.addEventListener('click', () => {
                    haptic.select();
                    state.lang = lng;
                    list.querySelectorAll('.onb-option').forEach((n) => n.classList.remove('selected'));
                    opt.classList.add('selected');
                    cta.disabled = false;
                    cta.classList.remove('disabled');
                    persistProgress();
                    // 04-04-r7: live-rerender — flip i18n.currentLang + redraw the
                    // current slide so all visible copy switches to the picked lang.
                    try {
                        if (typeof window !== 'undefined' && window.i18n) {
                            if (window.i18n.translations?.[lng]) window.i18n.currentLang = lng;
                        }
                    } catch {}
                    // Completion checkmark (R7 polish item 3)
                    spawnCheckmark(opt);
                    // Rerender ONLY the lang slide so the option list/labels update.
                    // Defer a tick so haptic + checkmark spawn first.
                    requestAnimationFrame(() => renderCurrentSlide());
                });
            }
            list.appendChild(opt);
        });

        const card = el('div', { class: 'onb-card' }, [list]);
        slide.appendChild(card);

        const cta = el('button', {
            class: `onb-cta${state.lang ? '' : ' disabled'}`,
            type: 'button',
            text: t('onboarding.next', 'Devam'),
            disabled: !state.lang,
            onclick: () => {
                if (!state.lang) return;
                haptic.tap();
                // 04-04-r7: persist the picked language to app-wide locale so the
                // rest of the UI (post-onboarding) shows in the right language.
                try { setLocale({ lang: state.lang }); } catch {}
                completeStep(1, { lang: state.lang }, options);
                goto(2);
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    function buildCountry() {
        const slide = el('div', { class: 'onb-slide onb-slide-country', 'data-dir': state.direction });
        slide.appendChild(el('h2', {
            class: 'onb-card-title',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.country.title', 'Nereden izliyorsun?'),
        }));
        slide.appendChild(el('p', { class: 'onb-card-sub', text: t('onboarding.country.sub', 'Yayın platformlarını ülkene göre getiriyoruz.') }));

        // Optional world map (commit 2 inserts SVG via #onb-world-map placeholder)
        const mapHost = el('div', { class: 'onb-world-map', 'aria-hidden': 'true', id: 'onb-world-map' });

        const search = el('input', {
            class: 'onb-search',
            type: 'search',
            placeholder: t('onboarding.country.search', 'Ülke ara'),
            value: state.countryQuery,
            autocomplete: 'off',
            'aria-label': t('onboarding.country.search', 'Ülke ara'),
        });

        const list = el('div', { class: 'onb-list', role: 'listbox' });
        const emptyState = el('div', { class: 'onb-search-empty', 'aria-live': 'polite' });

        // Accent-insensitive normalization for Turkish + Latin diacritics.
        function fold(s) {
            return (s || '')
                .toLowerCase()
                .replace(/ı/g, 'i')
                .replace(/İ/g, 'i')
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '');
        }

        function renderCountryList() {
            list.innerHTML = '';
            const q = fold(state.countryQuery.trim());
            const filtered = COUNTRY_SHORTLIST.filter((cc) => {
                if (!q) return true;
                const name = fold(COUNTRY_NAMES[cc] || cc);
                const code = fold(cc);
                return code.includes(q) || name.includes(q);
            });
            if (!filtered.length) {
                emptyState.textContent = t('onboarding.country.empty', 'Sonuç yok');
                emptyState.style.display = '';
            } else {
                emptyState.style.display = 'none';
            }
            filtered.forEach((cc) => {
                const opt = el('button', {
                    class: `onb-option${state.country === cc ? ' selected' : ''}`,
                    type: 'button',
                    role: 'option',
                    'aria-selected': state.country === cc ? 'true' : 'false',
                    'aria-label': `${COUNTRY_NAMES[cc] || cc} (${cc})`,
                    'data-cc': cc,
                }, [
                    el('span', { class: 'onb-opt-flag', text: flag(cc) }),
                    el('span', { class: 'onb-opt-label', text: COUNTRY_NAMES[cc] || cc }),
                    el('span', { class: 'onb-opt-check', 'aria-hidden': 'true' }),
                ]);
                opt.addEventListener('click', () => {
                    haptic.select();
                    // 04-04-r4: country change invalidates cached providers so
                    // the platforms slide re-fetches with the new region.
                    if (state.country !== cc) {
                        state.providers = [];
                        state.providersFailed = false;
                        state.providersLoadedFor = null;
                    }
                    state.country = cc;
                    list.querySelectorAll('.onb-option').forEach((n) => {
                        n.classList.remove('selected');
                        n.setAttribute('aria-selected', 'false');
                    });
                    opt.classList.add('selected');
                    opt.setAttribute('aria-selected', 'true');
                    cta.disabled = false;
                    cta.classList.remove('disabled');
                    persistProgress();
                    // 04-04-r2 — Cinema: drop a pin onto the world map for the picked country.
                    try { window.__onbDropMapPin?.(cc, mapHost); } catch {}
                    spawnCheckmark(opt); // r7 — completion celebration
                });
                list.appendChild(opt);
            });
        }
        // Debounced filter (80ms)
        let filterTimer = null;
        search.addEventListener('input', () => {
            state.countryQuery = search.value;
            if (filterTimer) clearTimeout(filterTimer);
            filterTimer = setTimeout(renderCountryList, 80);
        });
        // Backdrop fade — when the search input is active, dim the poster wall.
        search.addEventListener('focus', () => root.classList.add('onb-search-focused'));
        search.addEventListener('blur', () => root.classList.remove('onb-search-focused'));

        renderCountryList();

        // 04-04-r4: eagerly mount the world map SVG so it's visible from
        // first paint (previously only mounted lazily on first pin-drop).
        // Also drop a pin for the currently-selected country (geo default or
        // restored progress) so the slide opens with a visual anchor.
        mapHost.insertAdjacentHTML('afterbegin', WORLD_MAP_SVG);
        if (state.country && COUNTRY_MAP_COORDS[state.country]) {
            // Defer to next frame so the drop animation plays after slide entry.
            requestAnimationFrame(() => {
                try { window.__onbDropMapPin?.(state.country, mapHost); } catch {}
            });
        }

        slide.appendChild(mapHost);
        slide.appendChild(el('div', { class: 'onb-card' }, [search, list, emptyState]));

        const cta = el('button', {
            class: `onb-cta${state.country ? '' : ' disabled'}`,
            type: 'button',
            text: t('onboarding.next', 'Devam'),
            disabled: !state.country,
            onclick: () => {
                if (!state.country) return;
                haptic.tap();
                completeStep(2, { country: state.country }, options);
                goto(3);
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    function buildPlatforms() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h2', {
            class: 'onb-card-title',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.platforms.title', 'Hangi platformların var?'),
        }));
        slide.appendChild(el('p', {
            class: 'onb-card-sub',
            text: state.ownedPlatforms.length
                ? t('onboarding.platforms.subSelected', '{n} seçildi').replace('{n}', String(state.ownedPlatforms.length))
                : t('onboarding.platforms.sub', 'Birden fazla seçebilirsin.'),
        }));

        let body;
        if (state.providersLoading || (!state.providersFailed && !state.providers.length)) {
            // 04-04-r7 — 6-tile shimmer skeleton instead of plain "Loading" text.
            body = el('div', { class: 'onb-grid onb-skeleton-grid', 'aria-busy': 'true' });
            for (let i = 0; i < 6; i++) body.appendChild(el('div', { class: 'onb-skeleton-tile' }));
        } else if (state.providersFailed) {
            body = el('div', { class: 'onb-fail', text: t('onboarding.providers.loadError', 'Şu an yükleyemedik.') });
        } else {
            body = el('div', { class: 'onb-grid' });
            state.providers.forEach((p) => {
                const selected = state.ownedPlatforms.includes(p.id);
                const children = [
                    el('img', { src: p.logoUrl, alt: p.name, loading: 'lazy', decoding: 'async' }),
                    el('span', { text: p.name }),
                    el('span', { class: 'onb-tile-check', 'aria-hidden': 'true' }),
                ];
                if (p.preSelected) {
                    children.push(el('span', {
                        class: 'platform-tile--recommended-badge',
                        text: t('onboarding.platforms.recommended', 'Önerilen'),
                    }));
                }
                const tile = el('button', {
                    class: `onb-tile${selected ? ' selected' : ''}`,
                    type: 'button',
                    'aria-pressed': selected ? 'true' : 'false',
                    'aria-label': p.name,
                }, children);
                tile.addEventListener('click', () => {
                    haptic.select();
                    const idx = state.ownedPlatforms.indexOf(p.id);
                    if (idx >= 0) state.ownedPlatforms.splice(idx, 1);
                    else state.ownedPlatforms.push(p.id);
                    tile.classList.toggle('selected');
                    tile.setAttribute('aria-pressed', tile.classList.contains('selected') ? 'true' : 'false');
                    persistProgress();
                });
                body.appendChild(tile);
            });
        }
        slide.appendChild(el('div', { class: 'onb-card' }, [body]));

        // Skip-for-now ghost button — completes step 3 with empty platforms.
        const skipLink = el('button', {
            class: 'onboarding-skip-link',
            type: 'button',
            text: t('onboarding.platforms.skipForNow', 'Daha sonra eklerim'),
            onclick: () => {
                haptic.tap();
                state.ownedPlatforms = [];
                completeStep(3, { ownedPlatforms: [] }, options);
                goto(4); // → Premium slide
            },
        });
        slide.appendChild(skipLink);

        const cta = el('button', {
            class: 'onb-cta',
            type: 'button',
            text: t('onboarding.next', 'Devam'),
            onclick: () => {
                haptic.tap();
                completeStep(3, { ownedPlatforms: state.ownedPlatforms.slice() }, options);
                goto(4); // → Premium slide
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    // ---- Premium teaser slide (S5) — Phase 04-04-r1 -----------------------
    //
    // Locale-aware pricing block. TR users see ₺ pricing, others see USD.
    // CTA opens a MOCK paywall sheet (Phase 5 will replace with real
    // RevenueCat purchase flow). Skip-for-now advances to Ready (slide 5).
    //
    // Locked decisions: see .planning/decisions/PREMIUM-PRICING.md.
    function isTRLocale() {
        // Pricing locale is determined by country (matches App Store / Play
        // Console behavior — storefront country drives currency, not UI lang).
        return (state.country || '').toUpperCase() === 'TR';
    }

    function premiumPricingStrings() {
        if (isTRLocale()) {
            return {
                monthly: '49 ₺/ay',
                yearly: '299 ₺/yıl',
                lifetime: '799 ₺ ömürlük',
                full: '49 ₺/ay • 299 ₺/yıl • 799 ₺ ömürlük',
                trial: t('onboarding.premium.trialNote', 'İlk 7 gün ücretsiz'),
                savings: '289 ₺',
                yearlyAmount: '299 ₺',
                monthlyAmount: '49 ₺',
                lifetimeAmount: '799 ₺',
            };
        }
        return {
            monthly: '$2.99/mo',
            yearly: '$19.99/yr',
            lifetime: '$49.99 lifetime',
            full: '$2.99/mo • $19.99/yr • $49.99 lifetime',
            trial: t('onboarding.premium.trialNote', 'First 7 days free'),
            savings: '$15.89',
            yearlyAmount: '$19.99',
            monthlyAmount: '$2.99',
            lifetimeAmount: '$49.99',
        };
    }

    function buildPremium() {
        const slide = el('div', { class: 'onb-slide onb-slide-premium', 'data-dir': state.direction });

        slide.appendChild(el('h1', {
            class: 'onb-hero-title onb-premium-title',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.premium.title', 'Lumi Premium'),
        }));
        slide.appendChild(el('p', { class: 'onb-hero-sub onb-premium-sub', text: t('onboarding.premium.sub', 'Film Gecesi Asistanın') }));

        // Feature rows
        const features = el('div', { class: 'onb-premium-features' });
        const featureDefs = [
            { emoji: '🎯', titleKey: 'onboarding.premium.feature.decide.title', titleDefault: 'Decide-for-Me', descKey: 'onboarding.premium.feature.decide.desc', descDefault: 'Karar veremediğinde Lumi versin' },
            { emoji: '👥', titleKey: 'onboarding.premium.feature.pair.title',   titleDefault: 'Pair Mode',     descKey: 'onboarding.premium.feature.pair.desc',   descDefault: 'İki kişi için ortak öneri' },
            { emoji: '🔔', titleKey: 'onboarding.premium.feature.notif.title',  titleDefault: 'Smart Notifications', descKey: 'onboarding.premium.feature.notif.desc', descDefault: 'Sevdiğin dizilere yeni bölüm geldiğinde haber' },
            { emoji: '🌙', titleKey: 'onboarding.premium.feature.evening.title', titleDefault: 'Evening Assistant', descKey: 'onboarding.premium.feature.evening.desc', descDefault: "Akşam 8'de bugünlük öneri" },
        ];
        featureDefs.forEach((f, idx) => {
            const icon = el('span', { class: 'onb-premium-feature-icon', text: f.emoji, 'aria-hidden': 'true' });
            // Varied pulse phase per row so the emojis don't all beat in sync.
            icon.style.setProperty('--pulse-delay', (idx * 0.4) + 's');
            const row = el('div', { class: 'onb-premium-feature' }, [
                icon,
                el('div', { class: 'onb-premium-feature-body' }, [
                    el('div', { class: 'onb-premium-feature-title', text: t(f.titleKey, f.titleDefault) }),
                    el('div', { class: 'onb-premium-feature-desc', text: t(f.descKey, f.descDefault) }),
                ]),
            ]);
            // 3D tilt-on-touch (pointer-aware).
            if (!reduced) {
                row.addEventListener('pointermove', (e) => {
                    const r = row.getBoundingClientRect();
                    const dx = ((e.clientX - r.left) / r.width) - 0.5;
                    const dy = ((e.clientY - r.top) / r.height) - 0.5;
                    row.style.transform = `perspective(600px) rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 8).toFixed(2)}deg)`;
                });
                row.addEventListener('pointerleave', () => { row.style.transform = ''; });
            }
            features.appendChild(row);
        });
        slide.appendChild(features);

        // Pricing block
        const p = premiumPricingStrings();
        const pricing = el('div', { class: 'onb-premium-pricing', 'data-locale': isTRLocale() ? 'tr' : 'intl' });
        pricing.appendChild(el('div', { class: 'onb-premium-pricing-line', text: p.full }));
        const lifeBadge = el('span', { class: 'onb-premium-limited-badge', text: t('onboarding.premium.limited', 'Limited') });
        pricing.appendChild(lifeBadge);
        pricing.appendChild(el('div', { class: 'onb-premium-trial-note', text: p.trial }));
        slide.appendChild(pricing);

        // Primary CTA — opens mock paywall sheet
        slide.appendChild(el('button', {
            class: 'onb-cta onb-cta-premium',
            type: 'button',
            text: t('onboarding.premium.cta', "Premium'u dene"),
            'data-testid': 'onb-premium-cta',
            onclick: () => { haptic.tap(); openMockPaywall(); },
        }));

        // Secondary skip ghost link
        slide.appendChild(el('button', {
            class: 'onboarding-skip-link onb-premium-skip',
            type: 'button',
            text: t('onboarding.premium.skip', 'Şimdilik geç'),
            'data-testid': 'onb-premium-skip',
            onclick: () => { haptic.tap(); goto(5); },
        }));

        return slide;
    }

    // Mock paywall bottom sheet — Phase 5 will replace with real RevenueCat flow.
    function openMockPaywall() {
        if (document.getElementById('onb-paywall-sheet')) return;

        const p = premiumPricingStrings();
        const backdrop = el('div', { class: 'onb-paywall-backdrop', 'aria-hidden': 'true' });
        const sheet = el('div', {
            id: 'onb-paywall-sheet',
            class: 'onb-paywall-sheet',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('onboarding.premium.title', 'Lumi Premium'),
        });

        // Close (X)
        const closeBtn = el('button', {
            class: 'onb-paywall-close',
            type: 'button',
            'aria-label': t('common.close', 'Kapat'),
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
        });

        const title = el('h2', { class: 'onb-paywall-title', text: t('onboarding.premium.title', 'Lumi Premium') });
        const subtitle = el('p', { class: 'onb-paywall-sub', text: t('onboarding.premium.sub', 'Film Gecesi Asistanın') });

        // Tier cards (radio group)
        const tiers = el('div', { class: 'onb-paywall-tiers', role: 'radiogroup' });
        const selected = { value: 'yearly' };

        const tierDefs = [
            {
                value: 'monthly',
                title: t('onboarding.premium.tier.monthly', 'Aylık'),
                price: p.monthlyAmount,
                period: isTRLocale() ? '/ay' : '/mo',
                badge: null,
                note: p.trial,
            },
            {
                value: 'yearly',
                title: t('onboarding.premium.tier.yearly', 'Yıllık'),
                price: p.yearlyAmount,
                period: isTRLocale() ? '/yıl' : '/yr',
                badge: t('onboarding.premium.bestValue', 'BEST VALUE'),
                note: t('onboarding.premium.savings', '{amount} saved vs monthly').replace('{amount}', p.savings),
            },
            {
                value: 'lifetime',
                title: t('onboarding.premium.tier.lifetime', 'Ömürlük'),
                price: p.lifetimeAmount,
                period: '',
                badge: t('onboarding.premium.limited', 'LIMITED'),
                badgeClass: 'limited',
                note: null,
            },
        ];

        const tierCards = [];
        tierDefs.forEach((t_) => {
            const card = el('label', {
                class: `onb-paywall-tier${selected.value === t_.value ? ' selected' : ''}${t_.badgeClass ? ' ' + t_.badgeClass : ''}`,
                'data-tier': t_.value,
            });
            const input = el('input', {
                type: 'radio',
                name: 'onb-paywall-tier',
                value: t_.value,
            });
            if (selected.value === t_.value) input.setAttribute('checked', '');
            input.addEventListener('change', () => {
                haptic.select();
                selected.value = t_.value;
                state.premiumChoice = t_.value;
                tierCards.forEach((c) => c.classList.toggle('selected', c.getAttribute('data-tier') === t_.value));
                persistProgress();
            });
            card.appendChild(input);

            const head = el('div', { class: 'onb-paywall-tier-head' }, [
                el('span', { class: 'onb-paywall-tier-title', text: t_.title }),
                t_.badge ? el('span', { class: `onb-paywall-tier-badge${t_.badgeClass ? ' ' + t_.badgeClass : ''}`, text: t_.badge }) : null,
            ]);
            card.appendChild(head);

            const price = el('div', { class: 'onb-paywall-tier-price' }, [
                el('span', { class: 'onb-paywall-tier-amount', text: t_.price }),
                t_.period ? el('span', { class: 'onb-paywall-tier-period', text: t_.period }) : null,
            ]);
            card.appendChild(price);

            if (t_.note) card.appendChild(el('div', { class: 'onb-paywall-tier-note', text: t_.note }));

            tiers.appendChild(card);
            tierCards.push(card);
        });

        // Bottom CTA — Phase 5 will wire real purchase. For now: notify-me toast.
        const notifyCta = el('button', {
            class: 'onb-cta onb-cta-premium onb-paywall-cta',
            type: 'button',
            text: t('onboarding.premium.notifyCta', 'Premium çıkınca haber ver'),
            'data-testid': 'onb-paywall-notify',
        });

        // Restore Purchases — Phase 5 wires.
        const restore = el('button', {
            class: 'onb-paywall-restore',
            type: 'button',
            text: t('onboarding.premium.restore', 'Satın alımları geri yükle'),
        });

        function closeSheet() {
            sheet.classList.remove('open');
            backdrop.classList.remove('open');
            setTimeout(() => {
                if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
                if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
            }, 240);
        }
        closeBtn.addEventListener('click', closeSheet);
        backdrop.addEventListener('click', closeSheet);
        notifyCta.addEventListener('click', () => {
            const toastMsg = t('onboarding.premium.notifyAdded', 'Eklendi');
            try {
                if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
                    window.showToast(toastMsg);
                }
            } catch {}
            // Visual confirmation inline as fallback (some apps don't expose showToast yet).
            notifyCta.textContent = '✓ ' + toastMsg;
            notifyCta.disabled = true;
            setTimeout(closeSheet, 700);
        });
        restore.addEventListener('click', () => {
            // Phase 5 will wire real RevenueCat.restorePurchases().
            try {
                if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
                    window.showToast(t('onboarding.premium.restoreSoon', 'Phase 5 ile aktif olacak'));
                }
            } catch {}
        });

        sheet.appendChild(closeBtn);
        sheet.appendChild(title);
        sheet.appendChild(subtitle);
        sheet.appendChild(tiers);
        sheet.appendChild(notifyCta);
        sheet.appendChild(restore);

        document.body.appendChild(backdrop);
        document.body.appendChild(sheet);
        // Force reflow then trigger slide-up animation.
        // eslint-disable-next-line no-unused-expressions
        sheet.offsetHeight;
        requestAnimationFrame(() => {
            backdrop.classList.add('open');
            sheet.classList.add('open');
        });
    }

    function buildReady() {
        const slide = el('div', { class: 'onb-slide onb-slide-ready', 'data-dir': state.direction });
        slide.appendChild(el('h1', {
            class: 'onb-hero-title',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.ready.title', 'Hazırız.'),
        }));
        slide.appendChild(el('p', { class: 'onb-hero-sub', text: t('onboarding.ready.sub', 'Sana özel seçimler hazır.') }));

        // 04-04-r7 — vertical 3-row recap card (replaces inline chip strip).
        const langName = LANG_DISPLAY_FULL[state.lang] || LANG_DISPLAY[state.lang] || state.lang;
        const countryName = COUNTRY_NAMES[state.country] || state.country;
        // Resolve picked provider names from the curated providers list.
        const idToName = new Map((state.providers || []).map((p) => [p.id, p.name]));
        const pickedNames = state.ownedPlatforms.map((id) => idToName.get(id)).filter(Boolean);
        const platformLine = pickedNames.length === 0
            ? t('onboarding.ready.noPlatforms', 'Not yet')
            : (pickedNames.length <= 3
                ? pickedNames.join(', ')
                : `${pickedNames.slice(0, 3).join(', ')} + ${pickedNames.length - 3} more`);

        const card = el('div', { class: 'onb-recap-card' });
        const row = (labelKey, labelDefault, icon, text) => {
            return el('div', { class: 'onb-recap-row' }, [
                el('div', { class: 'onb-recap-row-label', text: t(labelKey, labelDefault) }),
                el('div', { class: 'onb-recap-row-value' }, [
                    el('span', { class: 'onb-recap-row-icon', text: icon }),
                    el('span', { class: 'onb-recap-row-text', text }),
                ]),
            ]);
        };
        card.appendChild(row('onboarding.ready.langLabel', 'Language', flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US'), langName));
        card.appendChild(row('onboarding.ready.countryLabel', 'Country', flag(state.country), countryName));
        card.appendChild(row('onboarding.ready.servicesLabel', 'Services', '📺', platformLine));
        slide.appendChild(card);

        // Keep the inline chip strip for screen readers (hidden visually).
        const chips = el('div', { class: 'onb-recap onb-sr-only' });
        chips.appendChild(el('span', { class: 'onb-chip', text: langName }));
        chips.appendChild(el('span', { class: 'onb-chip', text: `${flag(state.country)} ${countryName}` }));
        const platTpl = t('onboarding.ready.platforms', '{n} platform');
        chips.appendChild(el('span', { class: 'onb-chip', text: platTpl.replace('{n}', state.ownedPlatforms.length) }));
        slide.appendChild(chips);

        slide.appendChild(el('div', { style: 'flex:1' }));

        slide.appendChild(el('button', {
            class: 'onb-cta onb-cta-pulse',
            type: 'button',
            text: t('onboarding.ready.cta', "Lumi'yi keşfet"),
            onclick: (e) => {
                haptic.success();
                // 04-04-r2 — Confetti burst before close (visual handler injected below).
                try { window.__onbConfettiBurst?.(e.currentTarget); } catch {}
                clearOnboardingProgress();
                setTimeout(close, 700);
            },
        }));
        return slide;
    }

    function renderCurrentSlide() {
        stage.innerHTML = '';
        let node;
        switch (state.slide) {
            case 0: node = buildWelcome(); break;
            case 1: node = buildLang(); break;
            case 2: node = buildCountry(); break;
            case 3: node = buildPlatforms(); break;
            case 4: node = buildPremium(); break;
            case 5: node = buildReady(); break;
            default: node = buildWelcome();
        }
        stage.appendChild(node);
    }

    async function loadProvidersIfNeeded() {
        // 04-04-r4: re-fetch when country changed since last load.
        const cc = (state.country || '').toUpperCase();
        if (state.providersLoading) return;
        if (state.providers.length && state.providersLoadedFor === cc) return;
        state.providersLoading = true;
        state.providersLoadedFor = cc;
        if (state.slide === 3) renderCurrentSlide();
        try {
            const list = await getCuratedProviders(state.country);
            state.providers = list;
            state.providersFailed = list.length === 0;
            // Auto-select the curated "Recommended" tiles on first paint.
            if (list.length && state.ownedPlatforms.length === 0) {
                state.ownedPlatforms = list.filter((p) => p.preSelected).map((p) => p.id);
            }
        } catch {
            state.providersFailed = true;
        } finally {
            state.providersLoading = false;
            if (state.slide === 3) renderCurrentSlide();
        }
    }

    // -------------------------------------------------------------------
    // 04-04-r7 — Per-slide accent (CSS variable swap), recap chips,
    // swipe gestures, completion checkmark helper.
    // -------------------------------------------------------------------
    const SLIDE_ACCENTS = ['warm', 'cool', 'teal', 'purple', 'magenta', 'warm'];
    function updateAccent() {
        const tone = SLIDE_ACCENTS[state.slide] || 'warm';
        root.setAttribute('data-accent', tone);
    }

    function updateRecapChips() {
        // Recap chips show on S3/S4/S5/S6 (indices 2..5).
        if (state.slide < 2) {
            recapHost.innerHTML = '';
            recapHost.setAttribute('aria-hidden', 'true');
            return;
        }
        recapHost.setAttribute('aria-hidden', 'false');
        const chips = [];
        // Language chip (after S2)
        if (state.slide >= 2 && state.lang) {
            chips.push({ icon: flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US'), text: LANG_DISPLAY_FULL[state.lang] || state.lang });
        }
        // Country chip (after S3)
        if (state.slide >= 3 && state.country) {
            chips.push({ icon: flag(state.country), text: COUNTRY_NAMES[state.country] || state.country });
        }
        recapHost.innerHTML = '';
        chips.forEach((c) => {
            const chip = el('span', { class: 'onb-recap-chip' }, [
                el('span', { class: 'onb-recap-chip-icon', text: c.icon }),
                el('span', { class: 'onb-recap-chip-text', text: c.text }),
            ]);
            recapHost.appendChild(chip);
        });
    }

    // Completion checkmark — slides in from top with scale punch.
    function spawnCheckmark(anchor) {
        if (!anchor) return;
        if (prefersReducedMotion()) return; // no animation when reduced
        try {
            const r = anchor.getBoundingClientRect();
            const badge = document.createElement('div');
            badge.className = 'onb-completion-check';
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            badge.style.left = (r.left + r.width - 18) + 'px';
            badge.style.top = (r.top - 8) + 'px';
            document.body.appendChild(badge);
            requestAnimationFrame(() => badge.classList.add('in'));
            setTimeout(() => { try { badge.remove(); } catch {} }, 700);
        } catch {}
    }

    // ---- Swipe gestures (touch only — pointer/mouse left alone) ----
    const SWIPE_HINT_KEY = 'lumi_onboarding_swipe_hint_seen';
    let touchStartX = 0, touchStartY = 0, touchStartT = 0, swipeBlocked = false;
    function isInScrollable(target) {
        if (!target || typeof target.closest !== 'function') return false;
        // Search input or scrollable lists should NOT trigger advance/back.
        if (target.closest('.onb-search')) return true;
        if (target.closest('.onb-list')) return true;
        if (target.closest('.onb-grid')) return true;
        if (target.closest('.onb-paywall-sheet')) return true;
        return false;
    }
    root.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches.length) return;
        swipeBlocked = isInScrollable(e.target);
        const t0 = e.touches[0];
        touchStartX = t0.clientX;
        touchStartY = t0.clientY;
        touchStartT = Date.now();
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
        if (swipeBlocked) return;
        const t0 = (e.changedTouches && e.changedTouches[0]) || null;
        if (!t0) return;
        const dx = t0.clientX - touchStartX;
        const dy = t0.clientY - touchStartY;
        const dt = Date.now() - touchStartT;
        if (dt > 800) return;
        if (Math.abs(dx) < 40 || Math.abs(dy) > 50) return;
        // Disable advance-swipe on S1 if the wizard is restoring (no back).
        if (dx > 0 && state.slide === 0) return; // S1 back-swipe blocked (no back)
        if (state.slide === 5) return; // S6 confetti slide — block both
        if (dx < 0) {
            // Advance: emulate the active CTA on the current slide.
            const cta = stage.querySelector('.onb-cta:not(.disabled):not([disabled])');
            if (cta) { haptic.tap(); cta.click(); }
        } else {
            if (state.slide > 0) { haptic.tap(); goto(state.slide - 1); }
        }
    }, { passive: true });

    // One-time wiggle hint on S1.
    function maybeShowSwipeHint() {
        if (state.slide !== 0) return;
        if (prefersReducedMotion()) return;
        try {
            if (localStorage.getItem(SWIPE_HINT_KEY)) return;
            localStorage.setItem(SWIPE_HINT_KEY, '1');
        } catch {}
        setTimeout(() => {
            const slide = stage.querySelector('.onb-slide');
            if (!slide) return;
            slide.classList.add('onb-swipe-hint');
            setTimeout(() => slide.classList.remove('onb-swipe-hint'), 700);
        }, 800);
    }

    // Initial paint
    updatePills();
    updateBackBtn();
    updateAtmosphere();
    updateAccent();
    updateRecapChips();
    renderCurrentSlide();
    announceSlide();
    focusSlideHeading();
    persistProgress();
    maybeShowSwipeHint();
}

// Map onboarding lang → country code for the recap flag chip.
const LANG_TO_FLAG_COUNTRY = { tr: 'TR', en: 'GB', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', ja: 'JP', ko: 'KR' };
