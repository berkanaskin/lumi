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

import { getLocale, setLocale, SUPPORTED_LANGS } from '../lib/locale.js';
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

// Only TR + EN are launch-ready; the rest are "coming soon" placeholders.
const LAUNCH_LANGS = ['tr', 'en'];

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
        // Filter: provider must be available in `cc` per display_priorities map.
        // (TMDB returns global list; presence of cc key = available in region.)
        const inRegion = results.filter((p) => {
            if (!p || typeof p !== 'object') return false;
            const dp = p.display_priorities;
            if (!dp || typeof dp !== 'object') return true; // shape unknown → keep
            return typeof dp[cc] === 'number';
        });
        return inRegion
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

// Global popular provider IDs — used as an allowlist for non-TR regions.
// Priority order matches array order (Netflix first → most universal).
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

    // Non-TR: pull TMDB, filter by allowlist, sort by allowlist priority.
    const raw = await fetchProviders(cc);
    const priorityIndex = new Map(GLOBAL_POPULAR_PROVIDER_IDS.map((id, i) => [id, i]));

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

    return filtered.slice(0, 10);
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

const AUDIO_PREF_KEY = 'lumi_onboarding_audio';
let _audioCtx = null;
function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    if (_audioCtx) return _audioCtx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { _audioCtx = new Ctor(); } catch { return null; }
    return _audioCtx;
}

function shouldPlayAudio() {
    if (prefersReducedMotion()) return false;
    try {
        return localStorage.getItem(AUDIO_PREF_KEY) === 'on';
    } catch { return false; }
}

/** 35ms sine "tick" at 880 Hz with rapid envelope. Default OFF. */
function playTick() {
    if (!shouldPlayAudio()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    } catch { /* ignore */ }
}

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
const COUNTRY_MAP_COORDS = {
    TR: { x: 56, y: 36 }, US: { x: 22, y: 38 }, GB: { x: 47, y: 28 },
    DE: { x: 51, y: 30 }, FR: { x: 49, y: 33 }, ES: { x: 46, y: 36 },
    IT: { x: 51, y: 35 }, NL: { x: 50, y: 28 }, BE: { x: 50, y: 30 },
    SE: { x: 53, y: 22 }, NO: { x: 51, y: 21 }, DK: { x: 52, y: 26 },
    FI: { x: 56, y: 21 }, PL: { x: 54, y: 30 }, RU: { x: 65, y: 26 },
    JP: { x: 86, y: 39 }, KR: { x: 84, y: 39 }, CN: { x: 78, y: 40 },
    TW: { x: 84, y: 45 }, HK: { x: 81, y: 46 }, AU: { x: 84, y: 73 },
    NZ: { x: 93, y: 79 }, CA: { x: 22, y: 27 }, MX: { x: 19, y: 50 },
    BR: { x: 33, y: 65 }, AR: { x: 30, y: 78 }, CL: { x: 28, y: 76 },
    AE: { x: 63, y: 47 }, SA: { x: 60, y: 44 }, IN: { x: 70, y: 47 },
    ZA: { x: 55, y: 76 },
};

// Tiny inline world map (highly simplified continents). ~3KB.
const WORLD_MAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="none">
  <defs>
    <linearGradient id="onb-map-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3148"/>
      <stop offset="1" stop-color="#1a1626"/>
    </linearGradient>
  </defs>
  <rect width="100" height="50" fill="rgba(0,0,0,0)"/>
  <g fill="url(#onb-map-g)" stroke="rgba(255,255,255,0.06)" stroke-width="0.15">
    <!-- N America -->
    <path d="M8,16 L22,12 L30,18 L26,28 L18,30 L14,26 L10,22 Z"/>
    <!-- C/S America -->
    <path d="M22,30 L28,32 L32,42 L30,48 L26,46 L24,38 Z"/>
    <!-- Europe -->
    <path d="M44,16 L56,15 L58,22 L54,24 L48,22 L44,20 Z"/>
    <!-- Africa -->
    <path d="M46,26 L58,26 L60,38 L54,46 L48,40 Z"/>
    <!-- Asia -->
    <path d="M58,14 L84,14 L88,24 L82,30 L72,28 L62,24 Z"/>
    <!-- India -->
    <path d="M68,26 L74,26 L72,32 L70,32 Z"/>
    <!-- SE Asia/Indonesia -->
    <path d="M78,32 L86,32 L86,40 L80,38 Z"/>
    <!-- Australia -->
    <path d="M80,38 L92,38 L92,46 L82,46 Z"/>
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

    const locale = getLocale();

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

    // 04-04-r2 — Audio toggle (subtle, default OFF) — stored in localStorage.
    const SPEAKER_ON_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    const SPEAKER_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    let audioOn = false;
    try { audioOn = localStorage.getItem(AUDIO_PREF_KEY) === 'on'; } catch {}
    const audioBtn = el('button', {
        class: 'onb-audio-toggle' + (audioOn ? ' on' : ''),
        type: 'button',
        'aria-label': audioOn ? 'Sound on' : 'Sound off',
        'aria-pressed': audioOn ? 'true' : 'false',
        html: audioOn ? SPEAKER_ON_SVG : SPEAKER_OFF_SVG,
    });
    audioBtn.addEventListener('click', () => {
        audioOn = !audioOn;
        try { localStorage.setItem(AUDIO_PREF_KEY, audioOn ? 'on' : 'off'); } catch {}
        audioBtn.classList.toggle('on', audioOn);
        audioBtn.setAttribute('aria-pressed', audioOn ? 'true' : 'false');
        audioBtn.setAttribute('aria-label', audioOn ? 'Sound on' : 'Sound off');
        audioBtn.innerHTML = audioOn ? SPEAKER_ON_SVG : SPEAKER_OFF_SVG;
        haptic.tap();
        if (audioOn) { playTick(); }
    });

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

    const topbar = el('div', { class: 'onb-topbar' }, [backBtn, pills, audioBtn]);
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
        const hero = el('h1', {
            class: 'onb-hero-title onb-hero-typeon',
            id: 'onb-slide-heading',
            'data-onb-heading': '',
            text: t('onboarding.welcome.title', "Lumi'ye hoş geldin."),
        });
        slide.appendChild(hero);
        // 04-04-r2 — Letter-by-letter type-on (reduced-motion: skipped).
        requestAnimationFrame(() => applyLetterTypeOn(hero));
        slide.appendChild(el('p', { class: 'onb-hero-sub', text: t('onboarding.welcome.sub', "İzleyecek bir şey bulamadığında, biz buradayız.") }));
        slide.appendChild(el('div', { style: 'flex:1' })); // spacer
        slide.appendChild(el('button', {
            class: 'onb-cta',
            type: 'button',
            text: t('onboarding.welcome.cta', 'Başlayalım'),
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
                ? t('onboarding.platforms.subSelected', 'Seçim: ').replace('{n}', '') + state.ownedPlatforms.length
                : t('onboarding.platforms.sub', 'Birden fazla seçebilirsin.'),
        }));

        let body;
        if (state.providersLoading) {
            body = el('div', { class: 'onb-loading', text: t('loading', 'Yükleniyor') });
        } else if (state.providersFailed) {
            body = el('div', { class: 'onb-fail', text: t('onboarding.providers.loadError', 'Şu an yükleyemedik.') });
        } else if (!state.providers.length) {
            body = el('div', { class: 'onb-loading', text: t('loading', 'Yükleniyor') });
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

        const chips = el('div', { class: 'onb-recap' });
        chips.appendChild(el('span', { class: 'onb-chip', text: LANG_DISPLAY[state.lang] || state.lang }));
        chips.appendChild(el('span', { class: 'onb-chip', text: `${flag(state.country)} ${COUNTRY_NAMES[state.country] || state.country}` }));
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
        if (state.providers.length || state.providersLoading) return;
        state.providersLoading = true;
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

    // Initial paint
    updatePills();
    updateBackBtn();
    updateAtmosphere();
    renderCurrentSlide();
    announceSlide();
    focusSlideHeading();
    persistProgress();
}
