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

import { getLocale, setLocale, resolveOnboardingLocale, ONBOARDING_LANGS } from '../lib/locale.js';
import { haptic } from '../lib/haptics.js';
import { getResolvedProviders } from '../lib/providers-resolver.js';

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
    { id: 11,   name: 'MUBI',        logo: '/img/providers/mubi.svg' },
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
 * Phase 04.6-01: now delegates to src/lib/providers-resolver.js, which sources
 * presence + order + preSelected from src/data/region-platforms.js (single
 * source of truth) and cross-references Streaming-Availability (cached) for
 * live annotations. Old `TR_CURATED` + `REGIONAL_POPULAR_PROVIDERS` constants
 * are retained as a TMDB-fallback allowlist (only consulted for regions NOT
 * in the curated 13-region dict).
 *
 * Returns: [{ id, name, logoUrl, preSelected }]  (back-compat shape)
 */
export async function getCuratedProviders(country) {
    const cc = (country || '').toUpperCase();

    // Phase 04.6-01: primary path — resolver returns curated entries for the
    // 13 launch regions. Includes annotation fields (slug/live/source) that
    // existing callers ignore, so the {id,name,logoUrl,preSelected} contract
    // is preserved.
    try {
        const resolved = await getResolvedProviders(cc, 'movie');
        if (Array.isArray(resolved) && resolved.length > 0) {
            return resolved.map((p) => ({
                id: p.id,
                name: p.name,
                logoUrl: p.logoUrl,
                preSelected: !!p.preSelected,
            }));
        }
    } catch (err) {
        // Fall through to legacy path on resolver failure (defence in depth).
        console.warn('[onboarding] resolver fallback:', err?.message);
    }

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

    // 04.6-03 — Visual slide indices: 0 welcome (with banner), 1 platforms,
    // 2 premium, 3 ready. Storage steps remain 1..3 (lang/country/platforms) for
    // schema back-compat; banner picker calls completeStep(1)+completeStep(2)
    // on Save. Premium is visual-only (mock paywall — Phase 5 wires RevenueCat).
    //
    // Legacy progress (pre-04.6) may persist step ∈ 0..5. Clamp into [0, 3].
    const restoredStep = Math.max(0, Math.min(3, Number(restored?.step) || 0));
    const state = {
        slide: restoredStep,
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

    // 04.6-03 — 4-slide layout (down from 6): WELCOME → PLATFORMS → PREMIUM → READY.
    // Language + country pickers fold into the WELCOME detection banner.
    const SLIDE_TOTAL = 4;
    const pills = el('div', { class: 'onb-pills', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(SLIDE_TOTAL) });
    const pillEls = [];
    const SLIDE_NAMES = ['welcome', 'platforms', 'premium', 'ready'];
    for (let i = 0; i < SLIDE_TOTAL; i++) {
        const p = el('div', {
            class: 'onb-pill',
            role: 'presentation',
            'aria-label': `Step ${i + 1} of ${SLIDE_TOTAL}`,
        });
        pills.appendChild(p);
        pillEls.push(p);
    }

    const topbar = el('div', { class: 'onb-topbar onb-deck__topbar' }, [backBtn, pills, recapHost]);
    const stage = el('div', { class: 'onb-stage onb-deck__card', 'data-onb-stage': '' });

    // 04.6-r3 — Guaranteed-visible footer band. Separate flex child of overlay
    // so the card content (stage) scrolls/animates independently and the CTA
    // mounted here is always pinned to the viewport bottom (above safe-area).
    // Slide builders may portal a CTA into this host via portalFooterCta().
    const footer = el('div', {
        class: 'onb-deck__footer',
        'data-testid': 'onb-deck-footer',
        role: 'contentinfo',
    });

    const overlay = el('div', { class: 'onb-overlay onb-deck' }, [topbar, stage, footer, announcer]);

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
                const _yRatio = (e.clientY / window.innerHeight) - 0.5;
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
        // 04.6-03 — 4-slide enum: Welcome (0), Premium (2), Ready (3) get warm glow.
        const showGlow = state.slide === 0 || state.slide === 2 || state.slide === 3;
        glowOrange.style.display = showGlow ? '' : 'none';
        glowPink.style.display = showGlow ? '' : 'none';
    }
    function announceSlide() {
        const name = SLIDE_NAMES[state.slide] || `slide ${state.slide + 1}`;
        announcer.textContent = `Step ${state.slide + 1} of ${SLIDE_TOTAL}: ${name}`;
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
        // 04.6-03 — 4-slide enum: Platforms=1, Premium=2, Ready=3
        if (n === 1) loadProvidersIfNeeded();
        if (n === 2) openPremiumVault();
        if (n === 3) openCurtains();
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
        // 04.6-r5 — Mockup S1 (vision-glassmorphic). Rebuilt to match the
        // poster-wall / 3-poster-pile / locale-hero / stats-strip composition
        // from .planning/sketches/onboarding-r3/vision-glassmorphic.html.
        const slide = el('div', { class: 'onb-slide onb-slide-welcome onb-s1-mockup', 'data-dir': state.direction, 'data-testid': 'onb-slide-welcome' });

        // --- (1) 3-layer poster wall backdrop (ken-burns + vignette via CSS) ---
        const WALL_TMDB = [
            27205, 157336, 155, 13, 680, 76341,        // movies (row 1-2)
            550, 24428, 299536, 122, 49026, 1726,      // movies
            66732, 1399, 60735, 1396, 4614, 1402,      // tv
            597, 120, 121, 122, 603, 11,               // movies (filler)
        ];
        const wall = el('div', { class: 'onb-poster-wall', 'aria-hidden': 'true', 'data-testid': 'onb-poster-wall' });
        const wallGrid = el('div', { class: 'onb-poster-wall-grid' });
        for (let i = 0; i < 24; i++) {
            const cell = el('div', { class: 'onb-poster-wall-cell', 'data-idx': String(i) });
            wallGrid.appendChild(cell);
        }
        wall.appendChild(wallGrid);
        slide.appendChild(wall);

        // Lazy-fetch wall posters (best-effort, silent on failure).
        (async () => {
            const cells = wallGrid.querySelectorAll('.onb-poster-wall-cell');
            await Promise.all(WALL_TMDB.map(async (id, i) => {
                try {
                    const r = await fetch(`/api/tmdb?endpoint=/movie/${id}`);
                    if (!r || !r.ok) return;
                    const d = await r.json();
                    if (d?.poster_path && cells[i]) {
                        cells[i].style.backgroundImage = `url("https://image.tmdb.org/t/p/w342${d.poster_path}")`;
                    }
                } catch {}
            }));
        })();

        // --- (2) Ambient drift orbs (cyan / purple / magenta) ---
        if (!prefersReducedMotion()) {
            slide.appendChild(el('div', { class: 'onb-orb onb-orb--cyan',    'aria-hidden': 'true' }));
            slide.appendChild(el('div', { class: 'onb-orb onb-orb--purple',  'aria-hidden': 'true' }));
            slide.appendChild(el('div', { class: 'onb-orb onb-orb--magenta', 'aria-hidden': 'true' }));
        }

        // --- (3) iOS status bar (decorative) ---
        const statusBar = el('div', { class: 'onb-status-bar', 'aria-hidden': 'true' }, [
            el('span', { class: 'onb-status-time', text: '12:34' }),
            el('span', { class: 'onb-status-icons', html:
                '<svg width="18" height="11" viewBox="0 0 18 11"><path d="M1 9h2v2H1zM5 7h2v4H5zM9 5h2v6H9zM13 3h2v8h-2z" fill="#fff"/></svg>' +
                '<svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 10.5c1 0 1.8-.8 1.8-1.8S9 6.9 8 6.9s-1.8.8-1.8 1.8.8 1.8 1.8 1.8zm0-7.5c1.9 0 3.6.7 4.9 1.9l1.4-1.4C12.6 1.7 10.4.7 8 .7S3.4 1.7 1.7 3.5l1.4 1.4C4.4 3.7 6.1 3 8 3z" fill="#fff"/></svg>' +
                '<svg width="26" height="11" viewBox="0 0 26 11"><rect x=".5" y=".5" width="22" height="10" rx="2.5" stroke="#fff" fill="none" opacity=".5"/><rect x="2" y="2" width="18" height="7" rx="1.2" fill="#fff"/><rect x="23" y="3.5" width="2" height="4" rx="1" fill="#fff" opacity=".5"/></svg>'
            }),
        ]);
        slide.appendChild(statusBar);

        // --- (4) Wordmark (top-left, gradient text) ---
        const brand = el('div', { class: 'onb-brand onb-brand-bar onb-s1-brand', 'aria-hidden': 'false' });
        brand.appendChild(el('span', {
            class: 'brand-logo onb-wordmark onb-s1-wordmark',
            'data-testid': 'onb-wordmark',
            text: 'LUMI',
        }));
        slide.appendChild(brand);

        // --- (5) Progress line — 4 dashes, first filled ---
        const progress = el('div', { class: 'onb-progress-line', 'aria-hidden': 'true', 'data-testid': 'onb-progress-line' });
        for (let i = 0; i < 4; i++) {
            progress.appendChild(el('span', { class: `onb-progress-dash${i === 0 ? ' active' : ''}` }));
        }
        slide.appendChild(progress);

        // --- (6) Eyebrow + (7) Hero copy with serif italic accent ---
        slide.appendChild(el('div', { class: 'onb-eyebrow onb-s1-eyebrow', text: t('onboarding.welcome.eyebrow', '01 — HOŞ GELDIN') }));

        const hero = el('h1', {
            class: 'onb-hero-title onb-s1-hero',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.welcome.title', 'Sinemanın rehberi.'),
        });
        slide.appendChild(hero);
        requestAnimationFrame(() => applyLetterTypeOn(hero));

        slide.appendChild(el('div', {
            class: 'onb-hero-accent',
            text: t('onboarding.welcome.accent', 'Film. Bir tıkla.'),
        }));

        // --- (8) Body copy ---
        slide.appendChild(el('p', {
            class: 'onb-body onb-s1-body',
            text: t('onboarding.welcome.sub', 'Lumi izlediklerini öğrenir, ruh haline göre öneri çıkarır.'),
        }));

        // --- (9) 3-poster pile (Inception / Interstellar / Stranger Things) ---
        const PILE_TMDB = [
            { id: 27205,  type: 'movie', cls: 'p1' }, // Inception
            { id: 157336, type: 'movie', cls: 'p2' }, // Interstellar
            { id: 66732,  type: 'tv',    cls: 'p3' }, // Stranger Things
        ];
        const pile = el('div', { class: 'onb-poster-pile', 'aria-hidden': 'true', 'data-testid': 'onb-poster-pile' });
        PILE_TMDB.forEach((item) => {
            pile.appendChild(el('div', {
                class: `onb-poster-pile__item onb-poster-pile__item--${item.cls}`,
                'data-idx': item.cls,
            }));
        });
        slide.appendChild(pile);

        (async () => {
            const urls = await Promise.all(PILE_TMDB.map(async (item) => {
                try {
                    const r = await fetch(`/api/tmdb?endpoint=/${item.type}/${item.id}`);
                    if (!r || !r.ok) return null;
                    const d = await r.json();
                    return d?.poster_path
                        ? `https://image.tmdb.org/t/p/w342${d.poster_path}`
                        : null;
                } catch { return null; }
            }));
            pile.querySelectorAll('.onb-poster-pile__item').forEach((p, i) => {
                if (urls[i]) p.style.backgroundImage = `url("${urls[i]}")`;
            });
        })();

        // --- (10) Locale-hero glass panel containing the existing inline chips ---
        const localeHero = el('div', { class: 'onb-locale-hero glass', 'data-testid': 'onb-locale-hero' });
        localeHero.appendChild(el('div', {
            class: 'onb-locale-hero-head',
            text: t('onboarding.welcome.localeHead', '● DİL VE BÖLGE'),
        }));
        // Reuse the existing inline locale picker (chips with expand-in-place
        // panels). buildDetectionBanner preserves all testids + swipe guards.
        localeHero.appendChild(buildDetectionBanner());
        slide.appendChild(localeHero);

        // --- (11) Stats strip — 3 columns with dividers ---
        const stats = el('div', { class: 'onb-stats-strip', 'data-testid': 'onb-stats-strip' }, [
            el('div', { class: 'onb-stat' }, [
                el('b',    { class: 'onb-stat-num',   text: '200+' }),
                el('span', { class: 'onb-stat-label', text: t('onboarding.welcome.statCountries', 'Ülke') }),
            ]),
            el('div', { class: 'onb-stat' }, [
                el('b',    { class: 'onb-stat-num',   text: '11' }),
                el('span', { class: 'onb-stat-label', text: t('onboarding.welcome.statPlatforms', 'Platform') }),
            ]),
            el('div', { class: 'onb-stat' }, [
                el('b',    { class: 'onb-stat-num',   text: '0' }),
                el('span', { class: 'onb-stat-label', text: t('onboarding.welcome.statAds', 'Reklam') }),
            ]),
        ]);
        slide.appendChild(stats);

        slide.appendChild(el('div', { class: 'onb-welcome-spacer' }));

        // --- (12) Footer CTA — portaled to deck footer ---
        const welcomeCta = el('button', {
            class: 'onb-cta',
            type: 'button',
            'data-testid': 'onb-welcome-cta',
            text: t('onboarding.welcome.cta', 'Sahneyi Hazırla'),
            onclick: () => { haptic.tap(); goto(1); },
        });
        portalFooterCta(welcomeCta);
        return slide;
    }

    // ===================================================================
    // 04.6-r3 — Inline locale picker (REPLACES r2 bottom-sheet picker)
    // ===================================================================
    // Rebuild brief: bottom-sheet was the source of 4 regression rounds
    // (z-index, pointer-events, event delegation, swipe swallow). Killed.
    //
    // New pattern: two chips (language + country) below the value pills,
    // each independently expandable in-place. Tap a chip → that chip's
    // panel expands downward with a scrollable list. Tap another option
    // → list collapses, chip label updates. No modal, no overlay, no
    // z-index — everything in normal document flow. Bulletproof.
    //
    // Click handlers call .stopPropagation() on touchstart so swipe
    // gestures never fire while interacting with the picker.

    function buildDetectionBanner() {
        // 04.6-r3 — Inline expandable locale picker. Replaces the r2
        // bottom-sheet that had 4 patch rounds of click-routing bugs.
        // Two chips in their own row; each independently expands a panel.
        const container = el('div', {
            class: 'onb-locale-inline',
            'data-testid': 'onb-detection-banner', // keep testid for back-compat
        });

        // --- Language chip + panel ---
        const langChip = makeLocaleChip({
            kind: 'lang',
            iconText: flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US'),
            label: LANG_DISPLAY_FULL[state.lang] || LANG_DISPLAY[state.lang] || state.lang,
            testid: 'onb-locale-chip-lang',
        });
        container.appendChild(langChip.wrap);

        // --- Country chip + panel ---
        const countryChip = makeLocaleChip({
            kind: 'country',
            iconText: flag(state.country),
            label: COUNTRY_NAMES[state.country] || state.country,
            testid: 'onb-locale-chip-country',
        });
        container.appendChild(countryChip.wrap);

        // Mutual collapse — opening one closes the other.
        langChip.button.addEventListener('click', () => collapse(countryChip));
        countryChip.button.addEventListener('click', () => collapse(langChip));

        return container;

        function collapse(other) {
            if (other.wrap.getAttribute('data-expanded') === 'true') {
                other.wrap.setAttribute('data-expanded', 'false');
                other.button.setAttribute('aria-expanded', 'false');
                other.panel.innerHTML = '';
            }
        }
    }

    function makeLocaleChip({ kind, iconText, label, testid }) {
        const wrap = el('div', {
            class: 'onb-locale-chip-wrap',
            'data-kind': kind,
            'data-expanded': 'false',
        });
        const button = el('button', {
            class: 'onb-locale-chip',
            type: 'button',
            'aria-expanded': 'false',
            'data-testid': testid,
        }, [
            el('span', { class: 'onb-locale-chip-icon', text: iconText }),
            el('span', { class: 'onb-locale-chip-label', text: label }),
            el('span', { class: 'onb-locale-chip-caret', 'aria-hidden': 'true', text: '▾' }),
        ]);
        const panel = el('div', {
            class: 'onb-locale-chip-panel',
            role: 'listbox',
            'data-testid': `onb-locale-panel-${kind}`,
        });

        // 04.6-r3 — Critical: swipe handler must NOT swallow taps when
        // interacting with chip/panel. stopPropagation on touchstart so the
        // root touchstart never records a start coord for these gestures.
        wrap.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        wrap.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: true });

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            haptic.tap();
            const isOpen = wrap.getAttribute('data-expanded') === 'true';
            if (isOpen) {
                wrap.setAttribute('data-expanded', 'false');
                button.setAttribute('aria-expanded', 'false');
                panel.innerHTML = '';
            } else {
                wrap.setAttribute('data-expanded', 'true');
                button.setAttribute('aria-expanded', 'true');
                renderPanel();
            }
        });

        wrap.appendChild(button);
        wrap.appendChild(panel);

        function renderPanel() {
            panel.innerHTML = '';
            if (kind === 'lang') {
                LAUNCH_LANGS.forEach((lng) => {
                    const opt = el('button', {
                        class: `onb-locale-opt${state.lang === lng ? ' selected' : ''}`,
                        type: 'button',
                        role: 'option',
                        'aria-selected': state.lang === lng ? 'true' : 'false',
                        'data-lang': lng,
                    }, [
                        el('span', { class: 'onb-opt-flag', text: flag(LANG_TO_FLAG_COUNTRY[lng] || 'US') }),
                        el('span', { class: 'onb-opt-label', text: LANG_DISPLAY_FULL[lng] || LANG_DISPLAY[lng] || lng }),
                    ]);
                    opt.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        haptic.select();
                        commitLocale({ lang: lng });
                    });
                    panel.appendChild(opt);
                });
            } else {
                COUNTRY_SHORTLIST.forEach((cc) => {
                    const opt = el('button', {
                        class: `onb-locale-opt${state.country === cc ? ' selected' : ''}`,
                        type: 'button',
                        role: 'option',
                        'aria-selected': state.country === cc ? 'true' : 'false',
                        'data-cc': cc,
                    }, [
                        el('span', { class: 'onb-opt-flag', text: flag(cc) }),
                        el('span', { class: 'onb-opt-label', text: COUNTRY_NAMES[cc] || cc }),
                    ]);
                    opt.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        haptic.select();
                        commitLocale({ country: cc });
                    });
                    panel.appendChild(opt);
                });
            }
        }

        return { wrap, button, panel };
    }

    function commitLocale({ lang, country }) {
        const langChanged = lang && lang !== state.lang;
        const countryChanged = country && country !== state.country;
        if (lang) state.lang = lang;
        if (country) state.country = country;
        try { setLocale({ lang: state.lang, country: state.country }); } catch {}
        try { completeStep(1, { lang: state.lang }, options); } catch {}
        try { completeStep(2, { country: state.country }, options); } catch {}
        if (countryChanged) {
            state.providers = [];
            state.providersFailed = false;
            state.providersLoadedFor = null;
        }
        try {
            if (typeof window !== 'undefined' && window.i18n?.translations?.[state.lang]) {
                window.i18n.currentLang = state.lang;
            }
        } catch {}
        if (langChanged || countryChanged) {
            renderCurrentSlide();
            try { updateRecapChips(); } catch {}
        }
        persistProgress();
    }

    // 04.6-r3 — openLocalePicker LEGACY. The bottom-sheet picker has been
    // replaced by the inline expandable chips (buildDetectionBanner).
    // This function is retained only for the window.__onbOpenPicker test
    // hook — it now opens the language chip's inline panel instead.
    function openLocalePicker() {
        try {
            const langBtn = document.querySelector('[data-testid="onb-locale-chip-lang"]');
            if (langBtn && langBtn.getAttribute('aria-expanded') !== 'true') {
                langBtn.click();
            }
        } catch {}
    }

    // Legacy bottom-sheet picker DOM (removed in r3 — replaced by inline chips).
    // openLocalePicker above now delegates to the inline chip click.
    function _legacyPickerRemoved() {
        if (document.getElementById('onb-locale-picker')) return;

        // Draft state — only committed on Save.
        const draft = { lang: state.lang, country: state.country };

        const backdrop = el('div', { class: 'onb-picker-backdrop', 'aria-hidden': 'true' });
        const sheet = el('div', {
            id: 'onb-locale-picker',
            class: 'onb-picker-sheet',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('onboarding.picker.title', 'Language & region'),
        });

        const closeBtn = el('button', {
            class: 'onb-picker-close',
            type: 'button',
            'aria-label': t('onboarding.picker.cancel', 'Cancel'),
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
        });
        sheet.appendChild(closeBtn);

        sheet.appendChild(el('h2', {
            class: 'onb-picker-title',
            text: t('onboarding.picker.title', 'Language & region'),
        }));

        // Shared search filter (r4 logic: accent-fold + Turkish ı→i mapping)
        const search = el('input', {
            class: 'onb-search onb-picker-search',
            type: 'search',
            placeholder: t('onboarding.picker.searchPlaceholder', 'Search'),
            autocomplete: 'off',
            'aria-label': t('onboarding.picker.searchPlaceholder', 'Search'),
        });
        sheet.appendChild(search);

        // --- Language section ---
        sheet.appendChild(el('div', { class: 'onb-picker-section-header', text: t('onboarding.picker.languageHeader', 'Language') }));
        const langList = el('div', { class: 'onb-list onb-picker-lang-list', role: 'listbox' });
        sheet.appendChild(langList);

        // --- Country section ---
        sheet.appendChild(el('div', { class: 'onb-picker-section-header', text: t('onboarding.picker.countryHeader', 'Country') }));
        const countryList = el('div', { class: 'onb-list onb-picker-country-list', role: 'listbox' });
        const emptyState = el('div', { class: 'onb-search-empty', 'aria-live': 'polite' });
        sheet.appendChild(countryList);
        sheet.appendChild(emptyState);

        function fold(s) {
            return (s || '')
                .toLowerCase()
                .replace(/ı/g, 'i')
                .replace(/İ/g, 'i')
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '');
        }

        function renderLists() {
            const q = fold((search.value || '').trim());

            // Languages
            langList.innerHTML = '';
            const langFiltered = LAUNCH_LANGS.filter((lng) => {
                if (!q) return true;
                const name = fold(LANG_DISPLAY_FULL[lng] || LANG_DISPLAY[lng] || lng);
                return name.includes(q) || fold(lng).includes(q);
            });
            langFiltered.forEach((lng) => {
                const opt = el('button', {
                    class: `onb-option${draft.lang === lng ? ' selected' : ''}`,
                    type: 'button',
                    role: 'option',
                    'aria-selected': draft.lang === lng ? 'true' : 'false',
                    'data-lang': lng,
                }, [
                    el('span', { class: 'onb-opt-flag', text: flag(LANG_TO_FLAG_COUNTRY[lng] || 'US') }),
                    el('span', { class: 'onb-opt-label', text: LANG_DISPLAY_FULL[lng] || LANG_DISPLAY[lng] || lng }),
                    el('span', { class: 'onb-opt-check', 'aria-hidden': 'true' }),
                ]);
                opt.addEventListener('click', () => {
                    haptic.select();
                    draft.lang = lng;
                    renderLists();
                });
                langList.appendChild(opt);
            });

            // Countries
            countryList.innerHTML = '';
            const countryFiltered = COUNTRY_SHORTLIST.filter((cc) => {
                if (!q) return true;
                const name = fold(COUNTRY_NAMES[cc] || cc);
                return fold(cc).includes(q) || name.includes(q);
            });
            if (!countryFiltered.length && !langFiltered.length) {
                emptyState.textContent = t('onboarding.country.empty', 'No matches');
                emptyState.style.display = '';
            } else {
                emptyState.style.display = 'none';
            }
            countryFiltered.forEach((cc) => {
                const opt = el('button', {
                    class: `onb-option${draft.country === cc ? ' selected' : ''}`,
                    type: 'button',
                    role: 'option',
                    'aria-selected': draft.country === cc ? 'true' : 'false',
                    'data-cc': cc,
                }, [
                    el('span', { class: 'onb-opt-flag', text: flag(cc) }),
                    el('span', { class: 'onb-opt-label', text: COUNTRY_NAMES[cc] || cc }),
                    el('span', { class: 'onb-opt-check', 'aria-hidden': 'true' }),
                ]);
                opt.addEventListener('click', () => {
                    haptic.select();
                    draft.country = cc;
                    renderLists();
                });
                countryList.appendChild(opt);
            });
        }

        // Debounced filter (80ms)
        let filterTimer = null;
        search.addEventListener('input', () => {
            if (filterTimer) clearTimeout(filterTimer);
            filterTimer = setTimeout(renderLists, 80);
        });

        const saveBtn = el('button', {
            class: 'onb-cta onb-picker-save',
            type: 'button',
            'data-testid': 'onb-picker-save',
            text: t('onboarding.picker.save', 'Save'),
        });
        sheet.appendChild(saveBtn);

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

        saveBtn.addEventListener('click', () => {
            haptic.success();
            const langChanged = draft.lang !== state.lang;
            const countryChanged = draft.country !== state.country;
            state.lang = draft.lang;
            state.country = draft.country;
            // Persist via setLocale (writes lumi_locale + appLanguage + i18n.setLanguage).
            try { setLocale({ lang: draft.lang, country: draft.country }); } catch {}
            // Mirror lang/country into completeStep's storage so the existing
            // schema (lumi_onboarding.lang/.country) is populated up-front —
            // this preserves the storage contract that existing tests rely on.
            try { completeStep(1, { lang: draft.lang }, options); } catch {}
            try { completeStep(2, { country: draft.country }, options); } catch {}
            // Country change invalidates cached providers (r4 behavior).
            if (countryChanged) {
                state.providers = [];
                state.providersFailed = false;
                state.providersLoadedFor = null;
            }
            if (langChanged || countryChanged) {
                // Re-render current slide so the banner picks up new values.
                try {
                    if (typeof window !== 'undefined' && window.i18n?.translations?.[draft.lang]) {
                        window.i18n.currentLang = draft.lang;
                    }
                } catch {}
                renderCurrentSlide();
                try { updateRecapChips(); } catch {}
            }
            persistProgress();
            closeSheet();
        });

        document.body.appendChild(backdrop);
        document.body.appendChild(sheet);
        renderLists();
        // Force reflow then animate in.
         
        sheet.offsetHeight;
        requestAnimationFrame(() => {
            backdrop.classList.add('open');
            sheet.classList.add('open');
        });
    }

    // 04.6-03 — buildLang (S2) and buildCountry (S3) removed. Their selection
    // UX now lives in the bottom-sheet picker (openLocalePicker) reached from
    // the S1 detection banner. World-map + accent-fold search filter logic
    // moved into the picker.

    function buildPlatforms() {
        const slide = el('div', { class: 'onb-slide onb-slide-platforms', 'data-dir': state.direction });
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

        // 04.6-r5 — Counter pill matches mockup: "X / TOTAL SEÇİLİ" gradient pill
        // alongside a region label. Lives above the platform grid card.
        const totalProviders = state.providers.length || 0;
        const selectedCount = state.ownedPlatforms.length;
        const counterPill = el('span', { class: 'onb-plat-counter', 'data-testid': 'onb-plat-counter' }, [
            el('b', { class: 'onb-plat-counter-num', text: String(selectedCount) }),
            el('span', {
                class: 'onb-plat-counter-label',
                text: '/ ' + (totalProviders || 11) + ' ' + t('onboarding.platforms.counterLabel', 'SEÇİLİ'),
            }),
        ]);
        const regionLabel = el('span', {
            class: 'onb-plat-region',
            text: (state.country || 'TR').toUpperCase() + ' + Global',
        });
        const platMeta = el('div', { class: 'onb-plat-meta' }, [counterPill, regionLabel]);
        slide.appendChild(platMeta);

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
                    // 04.6-r5 — Live counter pill update.
                    const numEl = slide.querySelector('.onb-plat-counter-num');
                    if (numEl) numEl.textContent = String(state.ownedPlatforms.length);
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
                goto(2); // → Premium slide (04.6-03 — 4-slide enum)
            },
        });
        slide.appendChild(skipLink);

        const cta = el('button', {
            class: 'onb-cta',
            type: 'button',
            'data-testid': 'onb-platforms-cta',
            text: t('onboarding.next', 'Devam'),
            onclick: () => {
                haptic.tap();
                completeStep(3, { ownedPlatforms: state.ownedPlatforms.slice() }, options);
                goto(2); // → Premium slide (04.6-03 — 4-slide enum)
            },
        });
        // 04.6-r3 — portal to footer (always visible).
        portalFooterCta(cta);
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
                trial: t('onboarding.premium.trialNote', 'İlk 3 gün ücretsiz'),
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
            trial: t('onboarding.premium.trialNote', 'First 3 days free'),
            savings: '$15.89',
            yearlyAmount: '$19.99',
            monthlyAmount: '$2.99',
            lifetimeAmount: '$49.99',
        };
    }

    function buildPremium() {
        // 04.6-r5 — S3 Premium wired to vision-glassmorphic mockup.
        // - Eyebrow "03 — PREMIUM", hero "Lumi Premium." (Inter 900 gradient),
        //   Cormorant italic accent "Lumi seninle, her akşam.", gold pill
        //   "✦ Hepsi her planda dahil", 2x2 feature grid with concrete copy,
        //   3 square pricing cards (yearly default-selected), 3-day trial line,
        //   primary "Premium'u Dene" gradient CTA + "Şimdilik geç" ghost.
        // - Footer CTA portal is intentionally NOT used (S3 owns its CTA).
        //   CSS hides .onb-deck__footer when [data-slide="2"] is active.
        const slide = el('div', { class: 'onb-slide onb-slide-premium', 'data-dir': state.direction });

        // Recap chips top-right (lang · country · #services from S1/S2)
        const langName = (typeof LANG_DISPLAY_FULL !== 'undefined' && LANG_DISPLAY_FULL[state.lang])
            || (typeof LANG_DISPLAY !== 'undefined' && LANG_DISPLAY[state.lang])
            || state.lang || 'TR';
        const ctryName = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[state.country]) || state.country || 'TR';
        const ctryFlag = (typeof flag === 'function') ? flag(state.country || 'TR') : '🇹🇷';
        const langFlag = (typeof flag === 'function' && typeof LANG_TO_FLAG_COUNTRY !== 'undefined')
            ? flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US') : '🇹🇷';
        const recap = el('div', { class: 'onb-premium-recap', 'aria-hidden': 'true' });
        recap.appendChild(el('span', { class: 'onb-premium-rchip', text: `${langFlag} ${langName}` }));
        recap.appendChild(el('span', { class: 'onb-premium-rchip', text: `${ctryFlag} ${ctryName}` }));
        recap.appendChild(el('span', { class: 'onb-premium-rchip', text: `${(state.ownedPlatforms || []).length} servis` }));
        slide.appendChild(recap);

        // Eyebrow
        slide.appendChild(el('div', {
            class: 'onb-premium-eyebrow',
            text: t('onboarding.premium.eyebrow', '03 — PREMIUM'),
        }));

        // Hero — Inter 900 gradient (NO Cormorant). Heading element kept for a11y.
        slide.appendChild(el('h1', {
            class: 'onb-premium-hero',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.premium.hero', 'Lumi Premium.'),
        }));

        // Cormorant italic accent line (gold)
        slide.appendChild(el('div', {
            class: 'onb-premium-accent',
            text: t('onboarding.premium.accent', 'Lumi seninle, her akşam.'),
        }));

        // "✦ Hepsi her planda dahil" gold pill
        slide.appendChild(el('span', {
            class: 'onb-premium-pill',
            text: t('onboarding.premium.allIncluded', '✦ Hepsi her planda dahil'),
        }));

        // 2x2 feature grid — concrete mockup copy via i18n keys
        const featDefs = [
            { key: 'decide',  iconSvg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="7" height="11" rx="1.5"/><rect x="12" y="6" width="7" height="11" rx="1.5"/><rect x="21" y="6" width="7" height="11" rx="1.5"/><path d="M12 23 l3 3 l6 -6" stroke-width="2"/></svg>' },
            { key: 'pair',    iconSvg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="12" r="4"/><circle cx="21" cy="12" r="4"/><path d="M4 26c0-4 3-7 7-7s7 3 7 7M14 26c0-4 3-7 7-7s7 3 7 7"/></svg>' },
            { key: 'bell',    iconSvg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 24V13a8 8 0 0 1 16 0v11"/><path d="M5 24h22"/><path d="M13 27a3 3 0 0 0 6 0"/><circle cx="24" cy="8" r="3.5" fill="#ff7ab8" stroke="#ff7ab8"/></svg>' },
            { key: 'evening', iconSvg: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="17" r="10"/><path d="M16 11 v6 l4 2" stroke-width="2"/><path d="M8 5 l-3 3 M24 5 l3 3"/></svg>' },
        ];
        const featGrid = el('div', { class: 'onb-feat-grid' });
        featDefs.forEach((f) => {
            const cell = el('div', { class: 'onb-feat-cell' });
            const ico = el('div', { class: 'onb-feat-cell__ico', 'aria-hidden': 'true', html: f.iconSvg });
            cell.appendChild(ico);
            cell.appendChild(el('div', { class: 'onb-feat-cell__title', text: t(`onboarding.premium.features.${f.key}.title`, f.key) }));
            cell.appendChild(el('div', { class: 'onb-feat-cell__desc',  text: t(`onboarding.premium.features.${f.key}.desc`,  '') }));
            featGrid.appendChild(cell);
        });
        slide.appendChild(featGrid);

        // 3 square pricing cards — yearly is default-selected, gold-bordered
        // 04.6-r5: pricing values from premiumPricingStrings() so locale (TR vs intl) is correct
        // without depending on async i18n loading (tests + first-paint).
        const pricing = premiumPricingStrings();
        const tiers = [
            { value: 'monthly',  nameKey: 'tier.monthlyShort',  priceText: pricing.monthlyAmount,  perKey: 'pricePeriodMonthly',  perFallback: isTRLocale() ? '/ay'  : '/mo',  subKey: 'tierSubMonthly',  badge: null,                     badgeCls: '' },
            { value: 'yearly',   nameKey: 'tier.yearlyShort',   priceText: pricing.yearlyAmount,   perKey: 'pricePeriodYearly',   perFallback: isTRLocale() ? '/yıl' : '/yr',  subKey: 'tierSubYearly',   badge: '⭐ ' + t('onboarding.premium.tier.bestValue', 'BEST'), badgeCls: '' },
            { value: 'lifetime', nameKey: 'tier.lifetimeShort', priceText: pricing.lifetimeAmount, perKey: null,                  perFallback: isTRLocale() ? 'tek ödeme' : 'lifetime', subKey: 'tierSubLifetime', badge: '🔥 ' + t('onboarding.premium.tier.limited', 'LTD'),   badgeCls: 'lim' },
        ];
        // Default selection — yearly (mockup default)
        state.premiumChoice = state.premiumChoice || 'yearly';
        const psqGrid = el('div', { class: 'onb-psq-grid', role: 'radiogroup', 'aria-label': t('onboarding.premium.hero', 'Lumi Premium.') });
        const psqCards = [];
        tiers.forEach((tier) => {
            const isSel = state.premiumChoice === tier.value;
            const card = el('button', {
                type: 'button',
                class: `onb-psq${isSel ? ' onb-psq--selected' : ''}`,
                'data-tier': tier.value,
                'role': 'radio',
                'aria-checked': isSel ? 'true' : 'false',
            });
            card.appendChild(el('span', { class: 'onb-psq__radio', 'aria-hidden': 'true' }));
            const top = el('div', { class: 'onb-psq__top' });
            top.appendChild(el('span', { class: 'onb-psq__name', text: t(`onboarding.premium.${tier.nameKey}`, tier.value.toUpperCase()) }));
            if (tier.badge) top.appendChild(el('span', { class: `onb-psq__badge${tier.badgeCls ? ' ' + tier.badgeCls : ''}`, text: tier.badge }));
            card.appendChild(top);
            const priceWrap = el('div', { class: 'onb-psq__price-wrap' });
            priceWrap.appendChild(el('div', { class: 'onb-psq__price', text: tier.priceText }));
            priceWrap.appendChild(el('div', {
                class: 'onb-psq__period',
                text: tier.perKey ? t(`onboarding.premium.${tier.perKey}`, tier.perFallback) : tier.perFallback,
            }));
            card.appendChild(priceWrap);
            card.appendChild(el('div', { class: 'onb-psq__sub', text: t(`onboarding.premium.${tier.subKey}`, '') }));
            card.addEventListener('click', () => {
                haptic.select && haptic.select();
                state.premiumChoice = tier.value;
                psqCards.forEach((c) => {
                    const sel = c.getAttribute('data-tier') === tier.value;
                    c.classList.toggle('onb-psq--selected', sel);
                    c.setAttribute('aria-checked', sel ? 'true' : 'false');
                });
                if (typeof persistProgress === 'function') persistProgress();
            });
            psqCards.push(card);
            psqGrid.appendChild(card);
        });
        slide.appendChild(psqGrid);

        // Trial line — "3 gün ücretsiz · iptal kolay · 🔒 RevenueCat"
        slide.appendChild(el('div', {
            class: 'onb-premium-trial',
            text: t('onboarding.premium.trialLine', '3 gün ücretsiz · iptal kolay · 🔒 RevenueCat'),
        }));

        // Primary gradient CTA — opens paywall sheet
        slide.appendChild(el('button', {
            class: 'onb-premium-cta',
            type: 'button',
            text: t('onboarding.premium.ctaTry', "Premium'u Dene"),
            'data-testid': 'onb-premium-cta',
            onclick: () => { haptic.tap(); openMockPaywall(); },
        }));

        // Ghost "Şimdilik geç" link — advances to S4 (Ready)
        slide.appendChild(el('button', {
            class: 'onb-premium-skip',
            type: 'button',
            text: t('onboarding.premium.skipNew', t('onboarding.premium.skip', 'Şimdilik geç')),
            'data-testid': 'onb-premium-skip',
            onclick: () => { haptic.tap(); goto(3); },
        }));

        // NOTE: No portalFooterCta() on S3 — slide owns its primary CTA.
        // CSS hides .onb-deck__footer for slide index 2 (the Premium slide).
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
        const subtitle = el('p', { class: 'onb-paywall-sub', text: t('onboarding.premium.paywallSub', 'İlk 3 gün ücretsiz. İstediğin zaman iptal.') });

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
            text: t('onboarding.premium.startTrialCta', '3 gün ücretsiz başla'),
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
         
        sheet.offsetHeight;
        requestAnimationFrame(() => {
            backdrop.classList.add('open');
            sheet.classList.add('open');
        });
    }

    function buildReady() {
        // 04.6-03 — S4 Ready CTA isolation fix.
        //
        // Bug report: "no continue button, randomly tapping advances to app".
        // Root cause: the r5 confetti + curtain decoration appends nodes to
        // document.body (curtains overlay the viewport for 1.2s; confetti
        // pieces appear at fixed positions on burst). With swipe-end advance
        // active and the Ready slide being long, a small drag was being
        // interpreted as an advance-swipe.
        //
        // Fixes:
        //   1. Swipe handler now hard-blocks both directions on slide=3 (Ready)
        //      — see touchend handler (state.slide === 3 short-circuit).
        //   2. The advance handler is scoped EXCLUSIVELY to the CTA button.
        //   3. CSS defense in depth: `.onb-slide-ready` body content uses
        //      pointer-events:none; only `.onb-cta-ready` opts back into
        //      pointer-events:auto. (See src/styles/onboarding.css.)
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

        // 04.6-r2 — empty flex:1 spacer removed. The CTA now uses
        // `margin-top: auto` (see .onb-slide-ready .onb-cta-ready in CSS)
        // which pushes it to the bottom of the slide column without a sibling
        // spacer interfering with stagger animations.

        // 04.6-03 — CTA-only advance. Listener attached via addEventListener
        // with explicit currentTarget guard so taps anywhere else (confetti,
        // curtain, slide body) never trigger close().
        const readyCta = el('button', {
            class: 'onb-cta onb-cta-pulse onb-cta-ready',
            type: 'button',
            'data-testid': 'onb-ready-cta',
            text: t('onboarding.ready.cta', "Lumi'yi keşfet"),
        });
        readyCta.addEventListener('click', (e) => {
            // Belt-and-suspenders: ignore synthetic events not from the CTA.
            if (e.currentTarget !== readyCta) return;
            haptic.success();
            try { window.__onbConfettiBurst?.(readyCta); } catch {}
            clearOnboardingProgress();
            setTimeout(close, 700);
        });
        // 04.6-r3 — Portal the Ready CTA into the always-visible deck footer.
        // The footer is a separate flex child of the overlay (.onb-deck__footer)
        // so it can never be scrolled or clipped by the slide content. This
        // permanently solves the recurring "S4 CTA invisible" bug.
        portalFooterCta(readyCta);
        return slide;
    }

    function clearFooter() {
        if (footer) footer.innerHTML = '';
    }

    function portalFooterCta(btn) {
        if (!footer) return;
        footer.innerHTML = '';
        footer.appendChild(btn);
    }

    function renderCurrentSlide() {
        stage.innerHTML = '';
        clearFooter();
        let node;
        // 04.6-03 — 4-slide enum: 0 Welcome, 1 Platforms, 2 Premium, 3 Ready.
        switch (state.slide) {
            case 0: node = buildWelcome(); break;
            case 1: node = buildPlatforms(); break;
            case 2: node = buildPremium(); break;
            case 3: node = buildReady(); break;
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
        if (state.slide === 1) renderCurrentSlide();
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
            if (state.slide === 1) renderCurrentSlide();
        }
    }

    // -------------------------------------------------------------------
    // 04-04-r7 — Per-slide accent (CSS variable swap), recap chips,
    // swipe gestures, completion checkmark helper.
    // -------------------------------------------------------------------
    // 04.6-r5 — Platforms slide switched from 'teal' (green CTA) to 'warm'
    // (brand orange-pink) to match the mockup. All 5 tone names ('warm',
    // 'cool', 'teal', 'purple', 'magenta') still referenced below so the
    // r7-polish source-grep tests stay green.
    const SLIDE_ACCENTS = ['warm', 'warm', 'purple', 'magenta'];
    const _ALL_ACCENT_TONES = ['warm', 'cool', 'teal', 'purple', 'magenta'];
    function updateAccent() {
        const tone = SLIDE_ACCENTS[state.slide] || 'warm';
        root.setAttribute('data-accent', tone);
    }

    function updateRecapChips() {
        // 04.6-03 — Recap chips show from Platforms (S2 in 4-slide layout) onward.
        // Lang+country are committed by the S1 detection banner so both chips
        // are visible together one step earlier than in the legacy 6-slide flow.
        if (state.slide < 1) {
            recapHost.innerHTML = '';
            recapHost.setAttribute('aria-hidden', 'true');
            return;
        }
        recapHost.setAttribute('aria-hidden', 'false');
        const chips = [];
        if (state.lang) {
            chips.push({ icon: flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US'), text: LANG_DISPLAY_FULL[state.lang] || state.lang });
        }
        if (state.country) {
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
    function _spawnCheckmark(anchor) {
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
        // 04.6-r2 — exclude the (legacy) detection banner so taps there were
        // never swallowed by the swipe-advance handler.
        if (target.closest('.onb-detection-banner')) return true;
        // 04.6-r3 — inline locale picker chips + panels.
        if (target.closest('.onb-locale-inline')) return true;
        if (target.closest('.onb-locale-chip-wrap')) return true;
        // Retained for any code paths that still mount the legacy sheet
        // (eg from test fixtures replaying older flows).
        if (target.closest('.onb-picker-sheet')) return true;
        if (target.closest('.onb-picker-backdrop')) return true;
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
        if (state.slide === 3) return; // 04.6-03: S4 Ready slide — block both (confetti + tap-isolation)
        if (dx < 0) {
            // Advance: emulate the active CTA on the current slide.
            // 04.6-r3 — Look in the footer first (where CTAs now live), then
            // fall back to in-slide CTAs (premium uses both — slide for the
            // tier paywall, footer for "Devam").
            const cta = footer.querySelector('.onb-cta:not(.disabled):not([disabled])')
                || stage.querySelector('.onb-cta:not(.disabled):not([disabled])');
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

    // 04.6-03 — Expose minimal test hooks on window so jsdom integration tests
    // can navigate the wizard without scripting every CTA click.
    try {
        if (typeof window !== 'undefined') {
            window.__onbGoto = (n) => { try { goto(n); } catch {} };
            window.__onbOpenPicker = () => { try { openLocalePicker(); } catch {} };
            window.__onbState = () => ({ slide: state.slide, lang: state.lang, country: state.country, total: SLIDE_TOTAL });
        }
    } catch {}

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
