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
        const url = `/api/tmdb?endpoint=/watch/providers/tv&watch_region=${encodeURIComponent(country)}`;
        const res = await fetch(url);
        if (!res || !res.ok) return [];
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        return results
            .slice()
            .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
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
    { id: 8,    name: 'Netflix',     logo: `${TMDB_LOGO_BASE}/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg` },
    { id: 337,  name: 'Disney+',     logo: `${TMDB_LOGO_BASE}/97yvRBw1GzX7fXprcF80er19ot.jpg` },
    { id: 119,  name: 'Prime Video', logo: `${TMDB_LOGO_BASE}/68MNrwlkpF7WnmNPXLah69CR5cb.jpg` },
    { id: 1899, name: 'HBO Max',     logo: `${TMDB_LOGO_BASE}/jbe4gVSfRlbPTdESXhEKpornsfu.jpg` },
    { id: 350,  name: 'Apple TV+',   logo: `${TMDB_LOGO_BASE}/6uhKBfmtzFqOcLousHwZuzcrScK.jpg` },
    { id: 11,   name: 'MUBI',        logo: `${TMDB_LOGO_BASE}/lJ5mInhFXBeqndt0kc1xMtcWqUq.jpg` },
    { id: 1968, name: 'Gain',        logo: `${TMDB_LOGO_BASE}/3sJfizPV7lOiBM5kFW5pAFvX3uV.jpg` },
    { id: 1888, name: 'Exxen',       logo: `${TMDB_LOGO_BASE}/dkPEAEoFLNpQrPMu3IbY29Sevtv.jpg` },
    { id: 1855, name: 'Tabii',       logo: `${TMDB_LOGO_BASE}/3IhJgUSzqQ5wQlGqgZJJqx5KaaP.jpg` },
    { id: 2895, name: 'TOD',         logo: `${TMDB_LOGO_BASE}/i0OOFiztAQ2sNTdHRVy1y0HiwxR.jpg` },
    { id: 2864, name: 'Puhu TV',     logo: `${TMDB_LOGO_BASE}/abc.jpg` },
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
            { id: 8,   name: 'Netflix',     logoUrl: `${TMDB_LOGO_BASE}/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg`, preSelected: true },
            { id: 337, name: 'Disney+',     logoUrl: `${TMDB_LOGO_BASE}/97yvRBw1GzX7fXprcF80er19ot.jpg`, preSelected: true },
            { id: 119, name: 'Prime Video', logoUrl: `${TMDB_LOGO_BASE}/68MNrwlkpF7WnmNPXLah69CR5cb.jpg`, preSelected: true },
            { id: 350, name: 'Apple TV+',   logoUrl: `${TMDB_LOGO_BASE}/6uhKBfmtzFqOcLousHwZuzcrScK.jpg`, preSelected: false },
            { id: 531, name: 'Paramount+',  logoUrl: `${TMDB_LOGO_BASE}/fi83B1oztoS47xxcemFdPMhIzK.jpg`,  preSelected: false },
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

function renderWizard(options = {}) {
    if (typeof document === 'undefined') return;
    if (document.getElementById('onboarding-root')) return; // idempotent

    const locale = getLocale();

    // Visual slide indices: 0 welcome, 1 lang, 2 country, 3 platforms, 4 ready
    // These map to storage step nums via the input handlers below.
    const state = {
        slide: 0,
        direction: 'fwd',
        lang: locale.lang,
        country: locale.country || 'TR',
        ownedPlatforms: [],
        providers: [],
        providersLoading: false,
        providersFailed: false,
        countryQuery: '',
        posters: [],
    };

    // ----- DOM scaffold ----------------------------------------------------
    const root = document.createElement('div');
    root.id = 'onboarding-root';
    root.className = 'onboarding-root';

    // Poster wall (24 tiles)
    const wall = el('div', { class: 'onb-wall', 'aria-hidden': 'true' });
    const wallTiles = [];
    for (let i = 0; i < 24; i++) {
        const tile = el('div', { class: 'onb-wall-tile' }, [el('img', { alt: '', loading: 'lazy', decoding: 'async' })]);
        wallTiles.push(tile);
        wall.appendChild(tile);
    }

    const scrim = el('div', { class: 'onb-scrim', 'aria-hidden': 'true' });

    const glowOrange = el('div', { class: 'onb-glow onb-glow-orange', 'aria-hidden': 'true' });
    const glowPink = el('div', { class: 'onb-glow onb-glow-pink', 'aria-hidden': 'true' });

    // Overlay (back + pills + stage)
    const backBtn = el('button', { class: 'onb-back', type: 'button', 'aria-label': 'Back', html: BACK_SVG });

    const pills = el('div', { class: 'onb-pills', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': '5' });
    const pillEls = [];
    for (let i = 0; i < 5; i++) {
        const p = el('div', { class: 'onb-pill' });
        pills.appendChild(p);
        pillEls.push(p);
    }

    const topbar = el('div', { class: 'onb-topbar' }, [backBtn, pills]);
    const stage = el('div', { class: 'onb-stage', 'data-onb-stage': '' });

    const overlay = el('div', { class: 'onb-overlay' }, [topbar, stage]);

    root.appendChild(wall);
    root.appendChild(scrim);
    root.appendChild(glowOrange);
    root.appendChild(glowPink);
    root.appendChild(overlay);
    document.body.appendChild(root);

    // ----- Poster wall load ------------------------------------------------
    function paintWall(urls) {
        if (!urls.length) return;
        for (let i = 0; i < wallTiles.length; i++) {
            const url = urls[i % urls.length];
            const img = wallTiles[i].querySelector('img');
            if (!img) continue;
            img.addEventListener('load', () => wallTiles[i].classList.add('loaded'), { once: true });
            img.src = url;
        }
    }
    fetchPosterWall().then((urls) => {
        state.posters = urls;
        paintWall(urls);
    });

    // ----- Helpers ---------------------------------------------------------
    function updatePills() {
        pillEls.forEach((p, i) => {
            p.classList.toggle('done', i < state.slide);
            p.classList.toggle('active', i === state.slide);
        });
    }
    function updateBackBtn() {
        backBtn.toggleAttribute('disabled', state.slide === 0);
    }
    function updateAtmosphere() {
        const showGlow = state.slide === 0 || state.slide === 4;
        glowOrange.style.display = showGlow ? '' : 'none';
        glowPink.style.display = showGlow ? '' : 'none';
    }
    function close() {
        if (root.parentNode) root.parentNode.removeChild(root);
    }

    function goto(n) {
        state.direction = n > state.slide ? 'fwd' : 'back';
        state.slide = n;
        updatePills();
        updateBackBtn();
        updateAtmosphere();
        renderCurrentSlide();
        if (n === 3) loadProvidersIfNeeded();
    }

    backBtn.addEventListener('click', () => {
        if (state.slide > 0) goto(state.slide - 1);
    });

    // ----- Slide renderers -------------------------------------------------
    function buildWelcome() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h1', { class: 'onb-hero-title', text: t('onboarding.welcome.title', "Lumi'ye hoş geldin.") }));
        slide.appendChild(el('p', { class: 'onb-hero-sub', text: t('onboarding.welcome.sub', "İzleyecek bir şey bulamadığında, biz buradayız.") }));
        slide.appendChild(el('div', { style: 'flex:1' })); // spacer
        slide.appendChild(el('button', {
            class: 'onb-cta',
            type: 'button',
            text: t('onboarding.welcome.cta', 'Başlayalım'),
            onclick: () => goto(1),
        }));
        return slide;
    }

    function buildLang() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h2', { class: 'onb-card-title', text: t('onboarding.lang.title', 'Hangi dilde konuşalım?') }));
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
                opt.addEventListener('click', () => {
                    state.lang = lng;
                    list.querySelectorAll('.onb-option').forEach((n) => n.classList.remove('selected'));
                    opt.classList.add('selected');
                    cta.disabled = false;
                    cta.classList.remove('disabled');
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
                completeStep(1, { lang: state.lang }, options);
                goto(2);
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    function buildCountry() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h2', { class: 'onb-card-title', text: t('onboarding.country.title', 'Nereden izliyorsun?') }));
        slide.appendChild(el('p', { class: 'onb-card-sub', text: t('onboarding.country.sub', 'Yayın platformlarını ülkene göre getiriyoruz.') }));

        const search = el('input', {
            class: 'onb-search',
            type: 'search',
            placeholder: t('onboarding.country.search', 'Ülke ara'),
            value: state.countryQuery,
            autocomplete: 'off',
        });

        const list = el('div', { class: 'onb-list' });

        function renderCountryList() {
            list.innerHTML = '';
            const q = state.countryQuery.trim().toLowerCase();
            const filtered = COUNTRY_SHORTLIST.filter((cc) => {
                if (!q) return true;
                const name = (COUNTRY_NAMES[cc] || cc).toLowerCase();
                return cc.toLowerCase().includes(q) || name.includes(q);
            });
            filtered.forEach((cc) => {
                const opt = el('button', {
                    class: `onb-option${state.country === cc ? ' selected' : ''}`,
                    type: 'button',
                }, [
                    el('span', { class: 'onb-opt-flag', text: flag(cc) }),
                    el('span', { class: 'onb-opt-label', text: COUNTRY_NAMES[cc] || cc }),
                    el('span', { class: 'onb-opt-check', 'aria-hidden': 'true' }),
                ]);
                opt.addEventListener('click', () => {
                    state.country = cc;
                    list.querySelectorAll('.onb-option').forEach((n) => n.classList.remove('selected'));
                    opt.classList.add('selected');
                    cta.disabled = false;
                    cta.classList.remove('disabled');
                });
                list.appendChild(opt);
            });
        }
        search.addEventListener('input', () => {
            state.countryQuery = search.value;
            renderCountryList();
        });
        renderCountryList();

        slide.appendChild(el('div', { class: 'onb-card' }, [search, list]));

        const cta = el('button', {
            class: `onb-cta${state.country ? '' : ' disabled'}`,
            type: 'button',
            text: t('onboarding.next', 'Devam'),
            disabled: !state.country,
            onclick: () => {
                if (!state.country) return;
                completeStep(2, { country: state.country }, options);
                goto(3);
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    function buildPlatforms() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h2', { class: 'onb-card-title', text: t('onboarding.platforms.title', 'Hangi platformların var?') }));
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
                }, children);
                tile.addEventListener('click', () => {
                    const idx = state.ownedPlatforms.indexOf(p.id);
                    if (idx >= 0) state.ownedPlatforms.splice(idx, 1);
                    else state.ownedPlatforms.push(p.id);
                    tile.classList.toggle('selected');
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
                state.ownedPlatforms = [];
                completeStep(3, { ownedPlatforms: [] }, options);
                goto(4);
            },
        });
        slide.appendChild(skipLink);

        const cta = el('button', {
            class: 'onb-cta',
            type: 'button',
            text: t('onboarding.next', 'Devam'),
            onclick: () => {
                completeStep(3, { ownedPlatforms: state.ownedPlatforms.slice() }, options);
                goto(4);
            },
        });
        slide.appendChild(cta);
        return slide;
    }

    function buildReady() {
        const slide = el('div', { class: 'onb-slide', 'data-dir': state.direction });
        slide.appendChild(el('h1', { class: 'onb-hero-title', text: t('onboarding.ready.title', 'Hazırız.') }));
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
            onclick: () => close(),
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
            case 4: node = buildReady(); break;
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
}
