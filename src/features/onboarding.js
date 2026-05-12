/**
 * Phase 04-04 — Onboarding wizard.
 *
 * 3-step full-screen first-launch wizard:
 *   1. Confirm/choose language     (pre-filled from getLocale().lang)
 *   2. Confirm/choose country      (pre-filled from getLocale().country)
 *   3. Pick owned streaming platforms (TMDB watch/providers/tv for the chosen country)
 *
 * Persistence:
 *   - localStorage.lumi_onboarding         JSON { lang, country, ownedPlatforms[], completedAt, skipped[] }
 *   - localStorage.lumi_onboarding_seen    'true' once the wizard is rendered (or skipped)
 *   - localStorage.lumi_onboarding_completed 'true' once step 3 is submitted or skipOnboarding fires
 *   - For authenticated users: same shape mirrored to Firestore users/{uid}.preferences (with version=1)
 *
 * Cross-device: shouldShowOnboarding({user, db}) checks Firestore prefs.version>=1
 * before rendering; if present it hydrates localStorage and returns false.
 *
 * All three steps are skippable. Skipping any step still flips both flags so the
 * wizard never reappears.
 */

import { getLocale, setLocale, SUPPORTED_LANGS } from '../lib/locale.js';

// 31 top-watching countries — shortlist for v1. Defer TMDB /configuration/countries.
export const COUNTRY_SHORTLIST = [
    'TR', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'SE',
    'NO', 'DK', 'FI', 'PL', 'RU', 'JP', 'KR', 'CN', 'TW', 'HK',
    'AU', 'NZ', 'CA', 'MX', 'BR', 'AR', 'CL', 'AE', 'SA', 'IN', 'ZA',
];

const SEEN_FLAG = 'lumi_onboarding_seen';
const COMPLETED_FLAG = 'lumi_onboarding_completed';
const DATA_KEY = 'lumi_onboarding';
const SCHEMA_VERSION = 1;

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
    try {
        if (localStorage.getItem(COMPLETED_FLAG) === 'true') return false;
        if (localStorage.getItem(SEEN_FLAG) === 'true') return false;
    } catch {}

    if (user?.uid && db) {
        try {
            const snap = await db.collection('users').doc(user.uid).get();
            const prefs = snap.exists ? snap.data()?.preferences : null;
            if (prefs && typeof prefs.version === 'number' && prefs.version >= 1) {
                // Hydrate LS so subsequent UX renders without another round-trip.
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
 * flipped so the wizard never re-shows.
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
 * sorted by display_priority asc. Resolves with [] on any failure so the UI
 * can fall back to the "Sonra eklersin" skip CTA.
 *
 * NB: api/tmdb.js uses `?endpoint=` (not `?path=`), so we follow the actual
 * proxy contract. The TMDB endpoint is /watch/providers/tv (Phase-04-04 truths
 * reference watch/providers/tv).
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

function renderWizard(options = {}) {
    if (typeof document === 'undefined') return;
    if (document.getElementById('onboarding-root')) return; // idempotent

    const locale = getLocale();
    const state = {
        step: 1,
        lang: locale.lang,
        country: locale.country,
        ownedPlatforms: [],
        providers: [],
        providersLoading: false,
        providersFailed: false,
    };

    const root = document.createElement('div');
    root.id = 'onboarding-root';
    root.className = 'onboarding-root';
    root.innerHTML = `
        <div class="onb-overlay">
            <button class="onb-skip-all" type="button" data-onb-skip-all>${t('onboarding.skip', 'Skip')}</button>
            <div class="onb-track" data-onb-track>
                <section class="onb-step" data-onb-step="1"></section>
                <section class="onb-step" data-onb-step="2"></section>
                <section class="onb-step" data-onb-step="3"></section>
            </div>
            <div class="onb-dots">
                <span class="onb-dot" data-onb-dot="1"></span>
                <span class="onb-dot" data-onb-dot="2"></span>
                <span class="onb-dot" data-onb-dot="3"></span>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    const trackEl = root.querySelector('[data-onb-track]');
    const stepEls = {
        1: root.querySelector('[data-onb-step="1"]'),
        2: root.querySelector('[data-onb-step="2"]'),
        3: root.querySelector('[data-onb-step="3"]'),
    };
    const dotEls = {
        1: root.querySelector('[data-onb-dot="1"]'),
        2: root.querySelector('[data-onb-dot="2"]'),
        3: root.querySelector('[data-onb-dot="3"]'),
    };

    function close() {
        if (root.parentNode) root.parentNode.removeChild(root);
    }

    function goto(n) {
        state.step = n;
        if (trackEl) trackEl.style.transform = `translateX(-${(n - 1) * 100}%)`;
        Object.values(dotEls).forEach((d) => d && d.classList.remove('active'));
        if (dotEls[n]) dotEls[n].classList.add('active');
        if (n === 3) loadProvidersIfNeeded();
    }

    function renderStep1() {
        const langName = (lang) => ({
            tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français',
            es: 'Español', ja: '日本語', ko: '한국어', zh: '中文',
        }[lang] || lang);
        stepEls[1].innerHTML = `
            <h2 class="onb-title">${t('onboarding.step1.title', 'Right language?')}</h2>
            <div class="onb-bigchoice">${langName(state.lang)}</div>
            <button class="onb-cta" type="button" data-onb-confirm-lang>${t('onboarding.step1.confirm', 'Yes, continue')}</button>
            <button class="onb-link" type="button" data-onb-toggle-langs>${t('onboarding.step1.chooseOther', 'Choose another')}</button>
            <div class="onb-lang-grid hidden" data-onb-lang-grid>
                ${SUPPORTED_LANGS.map((l) => `<button type="button" class="onb-lang-chip" data-onb-pick-lang="${l}">${langName(l)}</button>`).join('')}
            </div>
        `;
        stepEls[1].querySelector('[data-onb-confirm-lang]')?.addEventListener('click', () => {
            completeStep(1, { lang: state.lang }, options);
            goto(2);
            renderStep2();
        });
        stepEls[1].querySelector('[data-onb-toggle-langs]')?.addEventListener('click', () => {
            stepEls[1].querySelector('[data-onb-lang-grid]')?.classList.toggle('hidden');
        });
        stepEls[1].querySelectorAll('[data-onb-pick-lang]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.lang = btn.getAttribute('data-onb-pick-lang');
                completeStep(1, { lang: state.lang }, options);
                goto(2);
                renderStep2();
            });
        });
    }

    function renderStep2() {
        const display = `${flag(state.country)} ${state.country}`;
        stepEls[2].innerHTML = `
            <h2 class="onb-title">${t('onboarding.step2.title', 'Your country')}</h2>
            <div class="onb-bigchoice">${display}</div>
            <button class="onb-cta" type="button" data-onb-confirm-country>${t('onboarding.step2.confirm', 'Yes, continue')}</button>
            <button class="onb-link" type="button" data-onb-toggle-countries>${t('onboarding.step2.chooseOther', 'Choose another')}</button>
            <div class="onb-country-grid hidden" data-onb-country-grid>
                ${COUNTRY_SHORTLIST.map((cc) => `<button type="button" class="onb-country-chip" data-onb-pick-country="${cc}">${flag(cc)} ${cc}</button>`).join('')}
            </div>
        `;
        stepEls[2].querySelector('[data-onb-confirm-country]')?.addEventListener('click', () => {
            completeStep(2, { country: state.country }, options);
            goto(3);
            renderStep3();
        });
        stepEls[2].querySelector('[data-onb-toggle-countries]')?.addEventListener('click', () => {
            stepEls[2].querySelector('[data-onb-country-grid]')?.classList.toggle('hidden');
        });
        stepEls[2].querySelectorAll('[data-onb-pick-country]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.country = btn.getAttribute('data-onb-pick-country');
                completeStep(2, { country: state.country }, options);
                goto(3);
                renderStep3();
            });
        });
    }

    function renderStep3() {
        const loading = state.providersLoading
            ? `<div class="onb-loading">…</div>`
            : '';
        const fail = state.providersFailed
            ? `<div class="onb-fail">${t('onboarding.providers.loadError', 'Could not load providers')}</div>`
            : '';
        const grid = state.providers.length
            ? `<div class="onb-provider-grid">${state.providers.map((p) => `
                <button type="button" class="onb-provider${state.ownedPlatforms.includes(p.provider_id) ? ' selected' : ''}" data-onb-toggle-provider="${p.provider_id}">
                    <img alt="${p.provider_name}" src="https://image.tmdb.org/t/p/w92${p.logo_path}" loading="lazy" />
                    <span>${p.provider_name}</span>
                </button>`).join('')}</div>`
            : '';
        stepEls[3].innerHTML = `
            <h2 class="onb-title">${t('onboarding.step3.title', 'Which platforms?')}</h2>
            ${loading}${fail}${grid}
            <button class="onb-cta" type="button" data-onb-done>${t('onboarding.step3.done', 'Done')}</button>
            <button class="onb-link" type="button" data-onb-skip-step3>${t('onboarding.step3.skip', 'Add later')}</button>
        `;
        stepEls[3].querySelectorAll('[data-onb-toggle-provider]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const pid = parseInt(btn.getAttribute('data-onb-toggle-provider'), 10);
                const idx = state.ownedPlatforms.indexOf(pid);
                if (idx >= 0) state.ownedPlatforms.splice(idx, 1);
                else state.ownedPlatforms.push(pid);
                renderStep3();
            });
        });
        stepEls[3].querySelector('[data-onb-done]')?.addEventListener('click', () => {
            completeStep(3, { ownedPlatforms: state.ownedPlatforms }, options);
            close();
        });
        stepEls[3].querySelector('[data-onb-skip-step3]')?.addEventListener('click', () => {
            completeStep(3, { ownedPlatforms: [] }, options);
            close();
        });
    }

    async function loadProvidersIfNeeded() {
        if (state.providers.length || state.providersLoading) return;
        state.providersLoading = true;
        renderStep3();
        try {
            const list = await fetchProviders(state.country);
            state.providers = list;
            state.providersFailed = list.length === 0;
        } catch {
            state.providersFailed = true;
        } finally {
            state.providersLoading = false;
            renderStep3();
        }
    }

    root.querySelector('[data-onb-skip-all]')?.addEventListener('click', () => {
        skipOnboarding(options);
        close();
    });

    renderStep1();
    renderStep2();
    renderStep3();
    goto(1);
}
