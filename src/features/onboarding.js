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
// Sabit lib/constants.js'te yaşıyor: profile.js bu 1.650 satırlık modülü
// statik import etmeden flag'e erişebilsin (onboarding lazy chunk kalmalı).
export { ALWAYS_SHOW_FLAG } from '../lib/constants.js';
import { ALWAYS_SHOW_FLAG } from '../lib/constants.js';

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

const _BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

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
function _playTick() { /* removed in r7 */ }

/** Split text into per-letter spans for the type-on hero animation. */
function _applyLetterTypeOn(el_) {
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

    const locale = resolveOnboardingLocale();
    try {
        if (typeof window !== 'undefined' && window.i18n && window.i18n.translations?.[locale.lang]) {
            window.i18n.currentLang = locale.lang;
        }
    } catch {}

    const restored = readOnboardingProgress();
    const restoredStep = Math.max(0, Math.min(3, Number(restored?.step) || 0));
    const state = {
        slide: restoredStep,
        direction: 'fwd',
        lang: restored?.picks?.lang || locale.lang,
        country: restored?.picks?.country || locale.country || 'TR',
        ownedPlatforms: Array.isArray(restored?.picks?.platforms) ? restored.picks.platforms.slice() : [],
        premiumChoice: restored?.picks?.premiumChoice || 'Yıllık',
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

    // ============================================================
    // 04.6-r7 WHOLESALE PORT — Vision Glassmorphic mockup.
    // DOM vocab matches .planning/sketches/onboarding-r3/vision-glassmorphic.html
    // ============================================================
    const root = document.createElement('div');
    root.id = 'onboarding-root';
    root.className = 'onboarding-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'onb-slide-heading');

    const announcer = el('div', { class: 'onb-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });

    // ----- Poster wall (Ken Burns) -----
    const wall = el('div', { class: 'wall', 'aria-hidden': 'true' });
    const wallGrid = el('div', { class: 'grid' });
    wall.appendChild(wallGrid);
    for (let i = 0; i < 24; i++) {
        wallGrid.appendChild(el('img', { alt: '', loading: 'lazy', decoding: 'async' }));
    }

    // ----- Ambient orbs -----
    const orbA = el('div', { class: 'orb a', 'aria-hidden': 'true' });
    const orbB = el('div', { class: 'orb b', 'aria-hidden': 'true' });
    const orbC = el('div', { class: 'orb c', 'aria-hidden': 'true' });

    // ----- Stage shell -----
    const stage = el('div', { class: 'stage s0', id: 'onb-stage' });

    // top: wordmark + dots
    const wordmark = el('div', { class: 'wordmark', text: 'L U M I' });
    const dots = el('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': '4' });
    const dotEls = [];
    for (let i = 0; i < 4; i++) {
        const d = el('div', { class: 'dot' + (i === 0 ? ' active' : ''), 'data-i': String(i) });
        d.addEventListener('click', () => { haptic.tap(); goto(i); });
        dots.appendChild(d);
        dotEls.push(d);
    }
    const top = el('div', { class: 'top' }, [wordmark, dots]);
    stage.appendChild(top);

    // progress line
    const progressLine = el('div', { class: 'progress-line', 'aria-hidden': 'true' });
    stage.appendChild(progressLine);

    // slides host
    const slidesHost = el('div', { class: 'slides', id: 'onb-slides' });
    stage.appendChild(slidesHost);

    // footer (cta lives here)
    const footer = el('div', { class: 'footer', role: 'contentinfo', 'data-testid': 'onb-deck-footer' });
    stage.appendChild(footer);

    root.appendChild(wall);
    root.appendChild(orbA);
    root.appendChild(orbB);
    root.appendChild(orbC);
    root.appendChild(stage);
    root.appendChild(announcer);
    document.body.appendChild(root);

    // ----- Focus trap -----
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
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    }
    root.addEventListener('keydown', onKeydown);

    // ----- Poster wall paint -----
    fetchPosterWall().then((urls) => {
        if (!urls.length) return;
        state.posters = urls;
        const imgs = wallGrid.querySelectorAll('img');
        imgs.forEach((im, i) => { im.src = urls[i % urls.length]; });
    });

    // ----- Helpers -----
    function updateDots() {
        dotEls.forEach((d, i) => {
            d.classList.toggle('active', i === state.slide);
            if (i === state.slide) d.setAttribute('aria-current', 'step');
            else d.removeAttribute('aria-current');
        });
    }
    function updateStageClass() {
        stage.classList.remove('s0', 's1', 's2', 's3');
        stage.classList.add('s' + state.slide);
    }
    function announceSlide() {
        const names = ['welcome', 'platforms', 'premium', 'ready'];
        announcer.textContent = `Step ${state.slide + 1} of 4: ${names[state.slide] || ''}`;
    }
    function focusSlideHeading() {
        requestAnimationFrame(() => {
            const heading = slidesHost.querySelector('[data-onb-heading], h1, h2');
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
    function clearFooter() { if (footer) footer.innerHTML = ''; }
    function portalFooterCta(btn) {
        if (!footer) return;
        clearFooter();
        footer.appendChild(btn);
    }

    function goto(n) {
        state.direction = n > state.slide ? 'fwd' : 'back';
        state.slide = n;
        updateDots();
        updateStageClass();
        try { updateRecapChips(); } catch {}
        renderCurrentSlide();
        announceSlide();
        focusSlideHeading();
        persistProgress();
        if (n === 1) loadProvidersIfNeeded();
    }

    dotEls.forEach((_d) => {/* listener attached above */});

    // ----- Slide renderers -----

    function buildWelcome() {
        // Mockup S1 (stage class .s0). Per-slide hero, poster pile, locale-hero glass, stats strip.
        const slide = el('section', {
            class: 'slide active onb-slide onb-slide-welcome',
            'data-dir': state.direction,
            'data-testid': 'onb-slide-welcome',
        });

        // s1-head: eyebrow + hero + accent + pile
        const head = el('div', { class: 's1-head' });
        head.appendChild(el('div', { class: 'eyebrow', text: t('onboarding.welcome.eyebrow', '01 — Hoş geldin') }));
        const hero = el('h1', {
            class: 'hero',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
        });
        hero.innerHTML = `<span class="grad">${t('onboarding.welcome.titleA', 'Sinemanın')}</span><br/>${t('onboarding.welcome.titleB', 'rehberi.')}`;
        head.appendChild(hero);
        head.appendChild(el('div', { class: 'accent-line serif', text: t('onboarding.welcome.accent', 'Film. Bir tıkla.') }));

        const pile = el('div', { class: 'pile', 'aria-hidden': 'true' });
        pile.appendChild(el('img', { class: 'p1', src: 'https://image.tmdb.org/t/p/w342/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', alt: '', loading: 'lazy' }));
        pile.appendChild(el('img', { class: 'p2', src: 'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', alt: '', loading: 'lazy' }));
        pile.appendChild(el('img', { class: 'p3', src: 'https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', alt: '', loading: 'lazy' }));
        head.appendChild(pile);
        slide.appendChild(head);

        slide.appendChild(el('p', { class: 'sub', text: t('onboarding.welcome.sub', 'Lumi izlediklerini öğrenir, ruh haline göre öneri çıkarır.') }));

        // Locale hero glass — replaces buildDetectionBanner
        const localeHero = el('div', { class: 'glass loc-hero', 'data-testid': 'onb-detection-banner' });
        localeHero.appendChild(el('div', { class: 'loc-hero-head', text: t('onboarding.welcome.localeHead', 'Dil ve Bölge') }));
        const locRow = el('div', { class: 'loc-row' });
        locRow.appendChild(makeLocaleChip('lang'));
        locRow.appendChild(makeLocaleChip('country'));
        localeHero.appendChild(locRow);
        slide.appendChild(localeHero);

        // Stats strip
        const stats = el('div', { class: 'stats-strip' });
        const mkStat = (n, lbl) => el('div', { class: 'stat' }, [el('b', { text: n }), el('span', { text: lbl })]);
        stats.appendChild(mkStat('200+', t('onboarding.welcome.statCountries', 'Ülke')));
        stats.appendChild(mkStat('11',   t('onboarding.welcome.statPlatforms', 'Platform')));
        stats.appendChild(mkStat('0',    t('onboarding.welcome.statAds', 'Reklam')));
        slide.appendChild(stats);

        // Swipe hint (one-time)
        try {
            if (!localStorage.getItem('lumi_onboarding_swipe_hint_seen')) {
                const hint = el('div', { class: 'swipe-hint' }, [
                    el('span', { text: t('onboarding.swipe', 'Kaydır') }),
                    el('span', { class: 'arrow', text: '→' }),
                ]);
                slide.appendChild(hint);
                localStorage.setItem('lumi_onboarding_swipe_hint_seen', '1');
            }
        } catch {}

        // Footer CTA
        const cta = el('button', {
            class: 'cta',
            type: 'button',
            'data-testid': 'onb-welcome-cta',
            text: t('onboarding.welcome.cta', 'Sahneyi Hazırla'),
        });
        cta.addEventListener('click', () => { haptic.tap(); goto(1); });
        portalFooterCta(cta);

        return slide;
    }

    function makeLocaleChip(kind) {
        const isLang = kind === 'lang';
        const initialIcon = isLang
            ? flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US')
            : flag(state.country);
        const initialLabel = isLang
            ? (LANG_DISPLAY_FULL[state.lang] || LANG_DISPLAY[state.lang] || state.lang)
            : (COUNTRY_NAMES[state.country] || state.country);
        const lbl = isLang
            ? t('onboarding.locale.lang', 'Dil')
            : t('onboarding.locale.country', 'Ülke');

        const card = el('div', {
            class: 'loc-card',
            'data-kind': kind,
        });

        const valSpan = el('div', { class: 'val' }, [
            el('span', { class: 'flag', text: initialIcon }),
            el('span', { class: 'name', text: initialLabel }),
            el('span', { class: 'chev', text: '▾' }),
        ]);

        const head = el('button', {
            class: 'loc-card-head',
            type: 'button',
            'aria-expanded': 'false',
            'data-testid': isLang ? 'onb-locale-chip-lang' : 'onb-locale-chip-country',
            style: 'background:transparent;border:none;padding:0;width:100%;text-align:left;cursor:pointer;font-family:inherit;color:inherit',
        }, [
            el('div', { class: 'lbl', text: lbl }),
            valSpan,
        ]);

        const list = el('div', {
            class: 'loc-list',
            role: 'listbox',
            'data-testid': `onb-locale-panel-${isLang ? 'lang' : 'country'}`,
        });

        // Block swipe gestures while interacting with chip/panel.
        card.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        card.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });

        head.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            haptic.tap();
            // 04.6-r7 fix: chips are independent + mutually exclusive.
            // 1) Snapshot whether *this* card is currently open.
            // 2) Close ALL panels first (sibling + self) — clean slate.
            // 3) If this card was NOT open before, open it + populate its list.
            const wasOpen = card.classList.contains('open');
            const allCards = slidesHost.querySelectorAll('.loc-card');
            allCards.forEach((c) => {
                c.classList.remove('open');
                const h = c.querySelector('.loc-card-head');
                if (h) h.setAttribute('aria-expanded', 'false');
            });
            if (!wasOpen) {
                renderList(); // populate BEFORE adding .open so anim plays with content
                card.classList.add('open');
                head.setAttribute('aria-expanded', 'true');
            }
        });

        function renderList() {
            list.innerHTML = '';
            if (isLang) {
                LAUNCH_LANGS.forEach((lng) => {
                    const sel = state.lang === lng;
                    const opt = el('button', {
                        class: 'loc-opt' + (sel ? ' sel' : ''),
                        type: 'button',
                        role: 'option',
                        'aria-selected': sel ? 'true' : 'false',
                        'data-lang': lng,
                    }, [
                        el('span', { class: 'flag', text: flag(LANG_TO_FLAG_COUNTRY[lng] || 'US') }),
                        el('span', { text: LANG_DISPLAY_FULL[lng] || LANG_DISPLAY[lng] || lng }),
                    ]);
                    opt.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        haptic.select();
                        commitLocale({ lang: lng });
                    });
                    list.appendChild(opt);
                });
            } else {
                COUNTRY_SHORTLIST.forEach((cc) => {
                    const sel = state.country === cc;
                    const opt = el('button', {
                        class: 'loc-opt' + (sel ? ' sel' : ''),
                        type: 'button',
                        role: 'option',
                        'aria-selected': sel ? 'true' : 'false',
                        'data-cc': cc,
                    }, [
                        el('span', { class: 'flag', text: flag(cc) }),
                        el('span', { text: COUNTRY_NAMES[cc] || cc }),
                    ]);
                    opt.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        haptic.select();
                        commitLocale({ country: cc });
                    });
                    list.appendChild(opt);
                });
            }
        }

        card.appendChild(head);
        card.appendChild(list);
        return card;
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

    function openLocalePicker() {
        try {
            const langBtn = document.querySelector('[data-testid="onb-locale-chip-lang"]');
            if (langBtn && langBtn.getAttribute('aria-expanded') !== 'true') langBtn.click();
        } catch {}
    }

    function buildPlatforms() {
        const slide = el('section', {
            class: 'slide active onb-slide onb-slide-platforms',
            'data-dir': state.direction,
            'data-testid': 'onb-slide-platforms',
        });

        // Recap chips at top-right
        const chips = el('div', { class: 'recap-chips', id: 'chipsS2' });
        slide.appendChild(chips);

        slide.appendChild(el('div', { class: 'eyebrow', text: t('onboarding.platforms.eyebrow', '02 — Platformların') }));
        const h1 = el('h1', { class: 'hero', id: 'onb-slide-heading', 'data-onb-heading': '' });
        h1.innerHTML = `<span class="grad">${t('onboarding.platforms.titleA', 'Aboneliklerini')}</span><br/>${t('onboarding.platforms.titleB', 'seç.')}`;
        slide.appendChild(h1);
        const accent = el('div', { class: 'accent-line serif', text: t('onboarding.platforms.accent', 'Senin dünya, senin kütüphane.') });
        accent.style.marginBottom = '10px';
        slide.appendChild(accent);
        slide.appendChild(el('p', { class: 'sub', text: t('onboarding.platforms.sub', 'Sadece izleyebildiklerini önerelim. İstediğin zaman değiştirebilirsin.') }));

        // plat-meta: counter + region
        const selectedCount = state.ownedPlatforms.length;
        const totalProviders = state.providers.length || 11;
        const counter = el('span', { class: 'plat-counter' }, [
            el('b', { text: String(selectedCount), 'data-counter': 'num' }),
            el('span', { text: '/ ' + totalProviders + ' ' + t('onboarding.platforms.counterLabel', 'SEÇİLİ') }),
        ]);
        const regionLabel = el('span', { text: (state.country || 'TR').toUpperCase() + ' + Global' });
        slide.appendChild(el('div', { class: 'plat-meta' }, [counter, regionLabel]));

        // plat grid
        const grid = el('div', { class: 'plat-grid', id: 'plats' });
        if (state.providersLoading || (!state.providersFailed && !state.providers.length)) {
            // Skeleton — 6 tiles
            for (let i = 0; i < 6; i++) {
                const sk = el('div', { class: 'plat', 'aria-busy': 'true' });
                sk.style.opacity = '0.4';
                grid.appendChild(sk);
            }
        } else if (state.providersFailed) {
            const fail = el('div', { class: 'plat', text: t('onboarding.providers.loadError', 'Şu an yükleyemedik.') });
            fail.style.gridColumn = 'span 3';
            grid.appendChild(fail);
        } else {
            state.providers.forEach((p) => {
                const selected = state.ownedPlatforms.includes(p.id);
                const tile = el('div', {
                    class: 'plat glass' + (selected ? ' sel' : '') + (p.preSelected && !selected ? ' preselect' : ''),
                    'data-n': p.name,
                    'data-id': String(p.id),
                    role: 'button',
                    tabindex: '0',
                    'aria-pressed': selected ? 'true' : 'false',
                    'aria-label': p.name,
                });
                tile.innerHTML = `
                    <div class="ring"><svg viewBox="0 0 16 16"><polyline points="3,8 7,12 13,4"/></svg></div>
                    <div class="logo"><img src="${p.logoUrl}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${(p.name || '?').charAt(0)}'}))"></div>
                    <div class="nm">${p.name}</div>`;
                const toggle = () => {
                    haptic.select();
                    const idx = state.ownedPlatforms.indexOf(p.id);
                    if (idx >= 0) state.ownedPlatforms.splice(idx, 1);
                    else state.ownedPlatforms.push(p.id);
                    tile.classList.toggle('sel');
                    tile.classList.remove('preselect');
                    tile.classList.add('popping');
                    setTimeout(() => tile.classList.remove('popping'), 400);
                    tile.setAttribute('aria-pressed', tile.classList.contains('sel') ? 'true' : 'false');
                    const numEl = slide.querySelector('[data-counter="num"]');
                    if (numEl) numEl.textContent = String(state.ownedPlatforms.length);
                    persistProgress();
                };
                tile.addEventListener('click', toggle);
                tile.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                });
                grid.appendChild(tile);
            });
        }
        slide.appendChild(grid);

        // ghost skip link (mockup uses "Daha sonra eklerim →")
        const skip = el('button', {
            class: 'ghost',
            type: 'button',
            text: t('onboarding.platforms.skipForNow', 'Daha sonra eklerim →'),
        });
        skip.addEventListener('click', () => {
            haptic.tap();
            state.ownedPlatforms = [];
            completeStep(3, { ownedPlatforms: [] }, options);
            goto(2);
        });
        slide.appendChild(skip);

        // Footer CTA (continues to Premium)
        const cta = el('button', {
            class: 'cta',
            type: 'button',
            'data-testid': 'onb-platforms-cta',
            text: t('onboarding.next', 'Devam'),
        });
        cta.addEventListener('click', () => {
            haptic.tap();
            completeStep(3, { ownedPlatforms: state.ownedPlatforms.slice() }, options);
            goto(2);
        });
        portalFooterCta(cta);

        return slide;
    }

    function isTRLocale() { return (state.country || '').toUpperCase() === 'TR'; }

    function buildPremium() {
        const slide = el('section', {
            class: 'slide active onb-slide onb-slide-premium',
            'data-dir': state.direction,
            'data-testid': 'onb-slide-premium',
        });

        // recap chips top-right
        slide.appendChild(el('div', { class: 'recap-chips', id: 'chipsS3' }));

        slide.appendChild(el('div', { class: 'eyebrow', text: t('onboarding.premium.eyebrow', '03 — Premium') }));
        const premHero = el('div', {
            class: 'premium-hero',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
        });
        premHero.innerHTML = `<span class="grad">${t('onboarding.premium.titleA', 'Lumi')}</span> ${t('onboarding.premium.titleB', 'Premium.')}`;
        slide.appendChild(premHero);
        slide.appendChild(el('div', { class: 'accent-line serif', text: t('onboarding.premium.accent', 'Lumi seninle, her akşam.') }));

        slide.appendChild(el('span', { class: 'feat-panel-pill', text: '✦ ' + t('onboarding.premium.featPill', 'Hepsi her planda dahil') }));

        // 2x2 feat-grid
        const fg = el('div', { class: 'feat-grid' });
        const mkFeat = (svg, title, desc) => {
            const cell = el('div', { class: 'feat-cell' });
            const ico = el('div', { class: 'fc-ico' });
            ico.innerHTML = svg;
            cell.appendChild(ico);
            cell.appendChild(el('div', { class: 'fc-title', text: title }));
            cell.appendChild(el('div', { class: 'fc-desc', text: desc }));
            return cell;
        };
        fg.appendChild(mkFeat(
            '<svg viewBox="0 0 32 32"><rect x="3" y="6" width="7" height="11" rx="1.5"/><rect x="12" y="6" width="7" height="11" rx="1.5"/><rect x="21" y="6" width="7" height="11" rx="1.5"/><path d="M12 23 l3 3 l6 -6" stroke-width="2"/></svg>',
            t('onboarding.premium.feat1Title', 'Decide-for-Me'),
            t('onboarding.premium.feat1Desc', '30 saniyede karar — Lumi senin için seçer.'),
        ));
        fg.appendChild(mkFeat(
            '<svg viewBox="0 0 32 32"><circle cx="11" cy="12" r="4"/><circle cx="21" cy="12" r="4"/><path d="M4 26c0-4 3-7 7-7s7 3 7 7M14 26c0-4 3-7 7-7s7 3 7 7"/></svg>',
            t('onboarding.premium.feat2Title', 'Pair Mode'),
            t('onboarding.premium.feat2Desc', 'İkiniz için ortak liste, ortak karar.'),
        ));
        fg.appendChild(mkFeat(
            '<svg viewBox="0 0 32 32"><path d="M8 24V13a8 8 0 0 1 16 0v11"/><path d="M5 24h22"/><path d="M13 27a3 3 0 0 0 6 0"/><circle cx="24" cy="8" r="3.5" fill="#ff7ab8" stroke="#ff7ab8"/></svg>',
            t('onboarding.premium.feat3Title', 'Akıllı Bildirimler'),
            t('onboarding.premium.feat3Desc', 'ST5 çıktığında ilk sen bil.'),
        ));
        fg.appendChild(mkFeat(
            '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="10"/><path d="M16 11 v6 l4 2" stroke-width="2"/><path d="M8 5 l-3 3 M24 5 l3 3"/></svg>',
            t('onboarding.premium.feat4Title', 'Akşam Asistanı'),
            t('onboarding.premium.feat4Desc', '20:00 çağrı — her gün tek doğru öneri.'),
        ));
        slide.appendChild(fg);

        // 3 pricing square cards
        const tr = isTRLocale();
        const TIERS = tr ? [
            { name: 'Aylık',    price: '₺49',  per: '/ay',         sub: '3 gün ücretsiz', key: 'monthly' },
            { name: 'Yıllık',   price: '₺299', per: '/yıl',        sub: '₺289 tasarruf',  key: 'yearly',   badge: '⭐ BEST' },
            { name: 'Ömürlük',  price: '₺799', per: 'tek ödeme',   sub: 'Sonsuza dek',    key: 'lifetime', badge: '🔥 LTD', limited: true },
        ] : [
            { name: 'Monthly',  price: '$2.99',  per: '/mo',       sub: '3 days free',    key: 'monthly' },
            { name: 'Yearly',   price: '$19.99', per: '/yr',       sub: 'Save $15',       key: 'yearly',   badge: '⭐ BEST' },
            { name: 'Lifetime', price: '$49.99', per: 'one-time',  sub: 'Forever',        key: 'lifetime', badge: '🔥 LTD', limited: true },
        ];

        const psqGrid = el('div', { class: 'psq-grid', id: 'ppills' });
        TIERS.forEach((tier) => {
            const isSelected = state.premiumChoice === tier.name || (state.premiumChoice == null && tier.key === 'yearly');
            if (isSelected) state.premiumChoice = tier.name;
            const card = el('div', {
                class: 'psq' + (isSelected ? ' sel' : ''),
                'data-n': tier.name,
                'data-key': tier.key,
                role: 'button',
                tabindex: '0',
            });
            const topRow = el('div', { class: 'psq-top' }, [
                el('span', { class: 'psq-name', text: tier.name }),
            ]);
            if (tier.badge) topRow.appendChild(el('span', { class: 'psq-badge' + (tier.limited ? ' lim' : ''), text: tier.badge }));
            const priceBlock = el('div', {}, [
                el('div', { class: 'psq-price', text: tier.price }),
                el('div', { class: 'psq-per', text: tier.per }),
            ]);
            card.appendChild(el('span', { class: 'psq-radio' }));
            card.appendChild(topRow);
            card.appendChild(priceBlock);
            card.appendChild(el('div', { class: 'psq-sub', text: tier.sub }));

            const select = () => {
                haptic.select();
                state.premiumChoice = tier.name;
                psqGrid.querySelectorAll('.psq').forEach((p) => {
                    p.classList.remove('sel');
                    p.classList.remove('popping');
                });
                card.classList.add('sel');
                card.classList.add('popping');
                setTimeout(() => card.classList.remove('popping'), 400);
                persistProgress();
            };
            card.addEventListener('click', select);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
            });
            psqGrid.appendChild(card);
        });
        slide.appendChild(psqGrid);

        slide.appendChild(el('div', { class: 'price-intro', html: '<b>' + t('onboarding.premium.trial', '3 gün ücretsiz') + '</b> · ' + t('onboarding.premium.cancel', 'iptal kolay') + ' · 🔒 RevenueCat' }));

        // Footer: primary CTA + ghost skip
        const cta = el('button', {
            class: 'cta',
            type: 'button',
            'data-testid': 'onb-premium-cta',
            text: t('onboarding.premium.cta', 'Sahneyi Hazırla'),
        });
        cta.addEventListener('click', () => {
            haptic.tap();
            goto(3);
        });

        const ghost = el('button', {
            class: 'ghost',
            type: 'button',
            'data-testid': 'onb-premium-skip',
            text: t('onboarding.premium.skip', 'Şimdilik geç'),
        });
        ghost.addEventListener('click', () => {
            haptic.tap();
            goto(3);
        });

        clearFooter();
        footer.appendChild(cta);
        footer.appendChild(ghost);

        return slide;
    }

    function buildReady() {
        const slide = el('section', {
            class: 'slide active onb-slide onb-slide-ready',
            'data-dir': state.direction,
            'data-testid': 'onb-slide-ready',
        });

        // Constellation
        const starsEl = el('div', { class: 'stars', 'aria-hidden': 'true' });
        for (let i = 0; i < 14; i++) {
            const s = el('div', { class: 'star' + (i % 4 === 0 ? ' big' : '') });
            s.style.left = (5 + Math.random() * 90) + '%';
            s.style.top  = (Math.random() * 70) + '%';
            s.style.animationDelay    = (Math.random() * 2.5) + 's';
            s.style.animationDuration = (2 + Math.random() * 2) + 's';
            starsEl.appendChild(s);
        }
        slide.appendChild(starsEl);

        // Shards
        const sh = el('div', { class: 'shards', 'aria-hidden': 'true' });
        for (let i = 0; i < 14; i++) {
            const d = el('div', { class: 'shard' });
            d.style.left = (Math.random() * 100) + '%';
            d.style.animationDelay    = (Math.random() * 4) + 's';
            d.style.animationDuration = (3 + Math.random() * 3) + 's';
            sh.appendChild(d);
        }
        slide.appendChild(sh);

        slide.appendChild(el('div', { class: 'recap-chips', id: 'chipsS4' }));

        slide.appendChild(el('div', { class: 'eyebrow', text: t('onboarding.ready.eyebrow', '04 — Hazırsın') }));
        const h1 = el('h1', {
            class: 'hero',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            style: 'font-size:44px;line-height:.98',
        });
        h1.innerHTML = `<span class="grad">${t('onboarding.ready.titleA', 'Işıklar.')}</span><br/>${t('onboarding.ready.titleB', 'Kamera.')}<br/>${t('onboarding.ready.titleC', 'Lumi.')}`;
        slide.appendChild(h1);
        slide.appendChild(el('div', { class: 'accent-line serif', text: t('onboarding.ready.accent', 'Sahne hazır. Perdeyi aç.') }));
        slide.appendChild(el('p', { class: 'sub', text: t('onboarding.ready.sub', 'Tercihlerin kaydedildi. İlk önerin 5 saniye sonra.') }));

        // Recap glass
        const recap = el('div', { class: 'glass recap' });
        recap.appendChild(el('div', { class: 'rh', text: t('onboarding.ready.recapHead', 'Sahne Özeti') }));

        const langName = LANG_DISPLAY_FULL[state.lang] || LANG_DISPLAY[state.lang] || state.lang;
        const countryName = COUNTRY_NAMES[state.country] || state.country;
        const idToName = new Map((state.providers || []).map((p) => [p.id, p.name]));
        const pickedNames = state.ownedPlatforms.map((id) => idToName.get(id)).filter(Boolean);
        const platformLine = pickedNames.length === 0
            ? t('onboarding.ready.noPlatforms', 'Henüz yok')
            : (pickedNames.length <= 3
                ? pickedNames.join(' · ')
                : `${pickedNames.slice(0, 3).join(' · ')} +${pickedNames.length - 3}`);

        const mkRow = (lbl, val) => {
            const r = el('div', { class: 'recap-row' });
            r.appendChild(el('span', { text: lbl }));
            r.appendChild(el('span', { text: val }));
            return r;
        };
        recap.appendChild(mkRow(t('onboarding.ready.langLabel', 'Dil'), langName));
        recap.appendChild(mkRow(t('onboarding.ready.countryLabel', 'Ülke'), countryName));
        recap.appendChild(mkRow(t('onboarding.ready.servicesLabel', 'Servisler'), platformLine));
        if (state.premiumChoice) {
            recap.appendChild(mkRow(t('onboarding.ready.planLabel', 'Plan'), state.premiumChoice));
        }
        slide.appendChild(recap);

        // Footer CTA — "Lumi'yi keşfet" (r7: .onb-cta-ready kept for s4 isolation hooks)
        const cta = el('button', {
            class: 'cta onb-cta-ready',
            type: 'button',
            'data-testid': 'onb-ready-cta',
            text: t('onboarding.ready.cta', "Lumi'yi keşfet"),
        });
        cta.addEventListener('click', (e) => {
            // 04.6-03 — Belt-and-suspenders: ignore synthetic events not from the CTA.
            if (e.currentTarget !== cta) return;
            haptic.success();
            try { window.__onbConfettiBurst?.(cta); } catch {}
            clearOnboardingProgress();
            try { localStorage.setItem('lumi_onboarding_seen', 'true'); } catch {}
            setTimeout(close, 700);
        });
        portalFooterCta(cta);

        return slide;
    }

    function renderCurrentSlide() {
        slidesHost.innerHTML = '';
        clearFooter();
        let node;
        switch (state.slide) {
            case 0: node = buildWelcome(); break;
            case 1: node = buildPlatforms(); break;
            case 2: node = buildPremium(); break;
            case 3: node = buildReady(); break;
            default: node = buildWelcome();
        }
        slidesHost.appendChild(node);
    }

    async function loadProvidersIfNeeded() {
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

    function updateRecapChips() {
        const hosts = root.querySelectorAll('.recap-chips');
        hosts.forEach((host) => {
            host.innerHTML = '';
            if (state.slide < 1) return;
            const mkChip = (txt, accent) => el('span', { class: 'rchip' + (accent ? ' accent' : '') }, [
                el('span', { text: txt }),
            ]);
            const langTxt = `${flag(LANG_TO_FLAG_COUNTRY[state.lang] || 'US')} ${LANG_DISPLAY_FULL[state.lang] || state.lang}`;
            const ctryTxt = `${flag(state.country)} ${COUNTRY_NAMES[state.country] || state.country}`;
            host.appendChild(mkChip(langTxt));
            host.appendChild(mkChip(ctryTxt));
            if (state.slide >= 2 && state.ownedPlatforms.length) {
                host.appendChild(mkChip(`${state.ownedPlatforms.length} ` + t('onboarding.recap.platforms', 'platform'), true));
            }
        });
    }

    // ---- Swipe gestures (with live drag feedback — 04.6-r7) ----
    let touchStartX = 0, touchStartY = 0, touchStartT = 0, swipeBlocked = false;
    let dragActiveSlide = null, dragAxisLocked = false, dragIsHorizontal = false;
    function isInScrollable(target) {
        if (!target || typeof target.closest !== 'function') return false;
        if (target.closest('.loc-card')) return true;
        if (target.closest('.loc-list')) return true;
        if (target.closest('.plat-grid')) return true;
        if (target.closest('.psq-grid')) return true;
        if (target.closest('.recap')) return true;
        return false;
    }
    function clearDrag() {
        if (dragActiveSlide) {
            dragActiveSlide.classList.remove('dragging');
            dragActiveSlide.style.removeProperty('--tx');
            dragActiveSlide = null;
        }
        if (slidesHost) slidesHost.classList.remove('dragging-active');
        dragAxisLocked = false; dragIsHorizontal = false;
    }
    root.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches.length) return;
        swipeBlocked = isInScrollable(e.target);
        const t0 = e.touches[0];
        touchStartX = t0.clientX; touchStartY = t0.clientY; touchStartT = Date.now();
        dragActiveSlide = slidesHost ? slidesHost.querySelector('.slide.active') : null;
        dragAxisLocked = false; dragIsHorizontal = false;
    }, { passive: true });
    root.addEventListener('touchmove', (e) => {
        if (swipeBlocked || !dragActiveSlide || !e.touches || !e.touches.length) return;
        if (state.slide === 3) return;
        const t0 = e.touches[0];
        const dx = t0.clientX - touchStartX;
        const dy = t0.clientY - touchStartY;
        if (!dragAxisLocked) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            dragIsHorizontal = Math.abs(dx) > Math.abs(dy);
            dragAxisLocked = true;
            if (dragIsHorizontal) {
                dragActiveSlide.classList.add('dragging');
                slidesHost.classList.add('dragging-active');
            }
        }
        if (!dragIsHorizontal) return;
        // Resistance at the boundaries (S1, S4)
        let tx = dx;
        if (dx > 0 && state.slide === 0) tx = dx * 0.25;
        if (dx < 0 && state.slide >= 3) tx = dx * 0.25;
        dragActiveSlide.style.setProperty('--tx', tx + 'px');
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
        if (swipeBlocked) { clearDrag(); return; }
        const t0 = (e.changedTouches && e.changedTouches[0]) || null;
        if (!t0) { clearDrag(); return; }
        const dx = t0.clientX - touchStartX;
        const dy = t0.clientY - touchStartY;
        const dt = Date.now() - touchStartT;
        clearDrag();
        if (dt > 800) return;
        if (Math.abs(dx) < 40 || Math.abs(dy) > 50) return;
        if (dx > 0 && state.slide === 0) return;
        // 04.6-03 — state.slide === 3 (Ready) hard-blocks both directions to
        // prevent confetti / curtain decorations from being read as swipes.
        if (state.slide === 3) return;
        if (dx < 0) {
            const cta = footer.querySelector('.cta:not(.disabled):not([disabled])');
            if (cta) { haptic.tap(); cta.click(); }
        } else {
            if (state.slide > 0) { haptic.tap(); goto(state.slide - 1); }
        }
    }, { passive: true });
    root.addEventListener('touchcancel', clearDrag, { passive: true });

    // Test hooks
    try {
        if (typeof window !== 'undefined') {
            window.__onbGoto = (n) => { try { goto(n); } catch {} };
            window.__onbOpenPicker = () => { try { openLocalePicker(); } catch {} };
            window.__onbState = () => ({ slide: state.slide, lang: state.lang, country: state.country, total: 4 });
        }
    } catch {}

    // Initial paint
    updateDots();
    updateStageClass();
    updateRecapChips();
    renderCurrentSlide();
    announceSlide();
    focusSlideHeading();
    persistProgress();
    if (state.slide === 1) loadProvidersIfNeeded();
}

// Map onboarding lang → country code for the recap flag chip.
const LANG_TO_FLAG_COUNTRY = { tr: 'TR', en: 'GB', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', ja: 'JP', ko: 'KR' };
