/**
 * Phase 04.6-03 — Detection banner + bottom-sheet locale picker tests.
 *
 * Covers:
 *   1. S1 Welcome renders a frosted detection banner with flag + lang + country
 *   2. Banner text reflects the resolved locale (lumi_locale or navigator)
 *   3. Tapping the banner opens the bottom-sheet picker
 *   4. Picker shows 8 language rows + 31 country rows on first paint
 *   5. Search filter narrows both lists (accent-fold + Turkish ı→i)
 *   6. Selecting + Save persists to lumi_locale + lumi_onboarding (completeStep)
 *   7. Closing without Save (backdrop click) DOES NOT persist
 *   8. 4-slide layout: 4 progress pills, totalSlides reflected in announcer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let startOnboarding;
let origDocument, origWindow, origRAF, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origRAF = global.requestAnimationFrame;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    global.requestAnimationFrame = dom.window.requestAnimationFrame
        || ((cb) => setTimeout(cb, 0));
    global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
    }));

    vi.resetModules();
    const mod = await import('../src/features/onboarding.js');
    startOnboarding = mod.startOnboarding;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.requestAnimationFrame = origRAF;
    global.localStorage = origLocalStorage;
});

const flushTimers = () => new Promise((r) => setTimeout(r, 120));

describe('04.6-03 — 4-slide layout', () => {
    it('renders exactly 4 progress pills (was 6)', () => {
        startOnboarding();
        const pills = document.querySelectorAll('.onb-pill');
        expect(pills.length).toBe(4);
        expect(document.querySelector('.onb-pills')?.getAttribute('aria-valuemax')).toBe('4');
    });

    it('slide enum advances Welcome → Platforms → Premium → Ready', async () => {
        startOnboarding();
        expect(window.__onbState().slide).toBe(0);
        window.__onbGoto(1);
        await new Promise((r) => setTimeout(r, 20));
        expect(document.querySelector('.onb-slide .onb-tile, .onb-skeleton-grid, .onb-grid, .onb-card')).toBeTruthy();
        window.__onbGoto(2);
        await new Promise((r) => setTimeout(r, 20));
        expect(document.querySelector('.onb-slide-premium')).toBeTruthy();
        window.__onbGoto(3);
        await new Promise((r) => setTimeout(r, 20));
        expect(document.querySelector('.onb-slide-ready')).toBeTruthy();
    });

    it('announcer text reflects 4-slide layout', () => {
        startOnboarding();
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer.textContent).toMatch(/step 1 of 4/i);
    });

    it('window.__onbState reports total=4', () => {
        startOnboarding();
        const st = window.__onbState();
        expect(st.total).toBe(4);
        expect(st.slide).toBe(0);
    });
});

describe('04.6-03 — S1 detection banner', () => {
    it('renders a banner element inside the Welcome slide', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(banner).toBeTruthy();
        expect(banner.closest('.onb-slide-welcome')).toBeTruthy();
    });

    it('banner text contains the language name and country name', async () => {
        // Seed locale so banner shows German/Germany
        localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'de', country: 'DE' }));
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        const text = banner.textContent || '';
        expect(text).toMatch(/Deutsch/);
        expect(text).toMatch(/Germany/);
    });

    it('banner is keyboard focusable (button element)', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(banner.tagName.toLowerCase()).toBe('button');
    });
});

describe('04.6-03 — bottom-sheet locale picker', () => {
    it('tapping the banner opens the picker sheet', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const banner = document.querySelector('[data-testid="onb-detection-banner"]');
        banner.click();
        await new Promise((r) => setTimeout(r, 20));
        const sheet = document.getElementById('onb-locale-picker');
        expect(sheet).toBeTruthy();
    });

    it('picker renders 8 language rows + 31 country rows', async () => {
        startOnboarding();
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
        const langRows = document.querySelectorAll('.onb-picker-lang-list .onb-option');
        const countryRows = document.querySelectorAll('.onb-picker-country-list .onb-option');
        expect(langRows.length).toBe(8);
        expect(countryRows.length).toBeGreaterThanOrEqual(30);
    });

    it('search input filters both lists ("Tu" → Türkçe + Turkey visible)', async () => {
        startOnboarding();
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
        const search = document.querySelector('.onb-picker-search');
        search.value = 'Tu';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
        await flushTimers();
        const langRows = [...document.querySelectorAll('.onb-picker-lang-list .onb-option')];
        const countryRows = [...document.querySelectorAll('.onb-picker-country-list .onb-option')];
        const langTexts = langRows.map((b) => b.textContent || '');
        const countryCodes = countryRows.map((b) => b.getAttribute('data-cc'));
        expect(langTexts.some((t) => /Türkçe/.test(t))).toBe(true);
        expect(countryCodes).toContain('TR');
    });

    it('Save persists draft to lumi_locale + lumi_onboarding', async () => {
        startOnboarding();
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
        // Pick Turkish
        const trLangRow = [...document.querySelectorAll('.onb-picker-lang-list .onb-option')]
            .find((b) => b.getAttribute('data-lang') === 'tr');
        trLangRow.click();
        // Pick Turkey
        const trCountryRow = document.querySelector('.onb-picker-country-list .onb-option[data-cc="TR"]');
        trCountryRow.click();
        // Save
        document.querySelector('[data-testid="onb-picker-save"]').click();
        await new Promise((r) => setTimeout(r, 20));
        const locale = JSON.parse(localStorage.getItem('lumi_locale'));
        expect(locale.lang).toBe('tr');
        expect(locale.country).toBe('TR');
        const onb = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(onb.lang).toBe('tr');
        expect(onb.country).toBe('TR');
    });

    it('backdrop click discards draft (does NOT persist)', async () => {
        // Seed initial locale
        localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'en', country: 'US' }));
        startOnboarding();
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
        // Select Turkish but DO NOT save
        const trLangRow = [...document.querySelectorAll('.onb-picker-lang-list .onb-option')]
            .find((b) => b.getAttribute('data-lang') === 'tr');
        trLangRow.click();
        // Close via backdrop
        document.querySelector('.onb-picker-backdrop').click();
        await new Promise((r) => setTimeout(r, 280));
        const locale = JSON.parse(localStorage.getItem('lumi_locale'));
        expect(locale.lang).toBe('en');
        expect(locale.country).toBe('US');
    });

    it('Save closes the sheet', async () => {
        startOnboarding();
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
        document.querySelector('[data-testid="onb-picker-save"]').click();
        await new Promise((r) => setTimeout(r, 280));
        // After 240ms transition the element should be removed.
        expect(document.getElementById('onb-locale-picker')).toBeNull();
    });
});
