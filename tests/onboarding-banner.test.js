/**
 * Phase 04.6-r3 — Inline locale picker (REPLACES bottom-sheet from 04.6-03).
 *
 * Architectural rebuild: the floating bottom-sheet picker was removed after
 * 4 rounds of click-routing regressions. The S1 Welcome slide now hosts two
 * inline chips (language + country) that expand in place. Tests now assert
 * the inline DOM shape, not the old `#onb-locale-picker` modal.
 *
 * Covers:
 *   1. 4-slide enum (Welcome → Platforms → Premium → Ready)
 *   2. Inline locale picker — 2 chips below value pills, no floating sheet
 *   3. Tap chip → aria-expanded=true + panel populated inline
 *   4. Tap an option → state updates + panel collapses
 *   5. window.__onbOpenPicker still works (legacy hook → opens lang chip)
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

describe('04.6-r3 — 4-slide layout', () => {
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

describe('04.6-r3 — S1 inline locale picker (replaces bottom sheet)', () => {
    it('renders inline picker container with both chips inside Welcome slide', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const container = document.querySelector('[data-testid="onb-detection-banner"]');
        expect(container).toBeTruthy();
        expect(container.classList.contains('onb-locale-inline')).toBe(true);
        expect(container.closest('.onb-slide-welcome')).toBeTruthy();
        // Both chips present (lang + country) in normal flow.
        expect(document.querySelector('[data-testid="onb-locale-chip-lang"]')).toBeTruthy();
        expect(document.querySelector('[data-testid="onb-locale-chip-country"]')).toBeTruthy();
    });

    it('NO floating bottom-sheet exists on initial render', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        expect(document.getElementById('onb-locale-picker')).toBeFalsy();
        expect(document.querySelector('.onb-picker-backdrop')).toBeFalsy();
    });

    it('lang chip label reflects detected language', async () => {
        localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'de', country: 'DE' }));
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        expect(langChip.textContent).toMatch(/Deutsch/);
        const countryChip = document.querySelector('[data-testid="onb-locale-chip-country"]');
        expect(countryChip.textContent).toMatch(/Germany/);
    });

    it('tap lang chip → aria-expanded=true and panel populated inline', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        expect(langChip.getAttribute('aria-expanded')).toBe('false');
        langChip.click();
        await new Promise((r) => setTimeout(r, 10));
        expect(langChip.getAttribute('aria-expanded')).toBe('true');
        const panel = document.querySelector('[data-testid="onb-locale-panel-lang"]');
        expect(panel).toBeTruthy();
        const opts = panel.querySelectorAll('.onb-locale-opt');
        expect(opts.length).toBe(8); // 8 ONBOARDING_LANGS
    });

    it('tap country chip → 31 country options listed inline', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const countryChip = document.querySelector('[data-testid="onb-locale-chip-country"]');
        countryChip.click();
        await new Promise((r) => setTimeout(r, 10));
        const panel = document.querySelector('[data-testid="onb-locale-panel-country"]');
        expect(panel).toBeTruthy();
        const opts = panel.querySelectorAll('.onb-locale-opt');
        expect(opts.length).toBeGreaterThanOrEqual(30);
        expect(panel.querySelector('[data-cc="TR"]')).toBeTruthy();
    });

    it('pick an option → state updates + lumi_locale persisted', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        langChip.click();
        await new Promise((r) => setTimeout(r, 10));
        const trOpt = document.querySelector('[data-testid="onb-locale-panel-lang"] [data-lang="tr"]');
        expect(trOpt).toBeTruthy();
        trOpt.click();
        await new Promise((r) => setTimeout(r, 10));
        expect(window.__onbState().lang).toBe('tr');
        const stored = JSON.parse(localStorage.getItem('lumi_locale') || '{}');
        expect(stored.lang).toBe('tr');
        // Onboarding storage also mirrored.
        const onb = JSON.parse(localStorage.getItem('lumi_onboarding') || '{}');
        expect(onb.lang).toBe('tr');
    });

    it('window.__onbOpenPicker legacy hook still expands the lang chip', async () => {
        startOnboarding();
        await new Promise((r) => setTimeout(r, 10));
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 10));
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        expect(langChip.getAttribute('aria-expanded')).toBe('true');
    });
});

describe('04.6-r3 — Footer CTA always visible', () => {
    it('deck footer exists with a CTA on S1/S2/S4 (S3 has in-slide primary CTA)', async () => {
        startOnboarding();
        // S3 (index 2) intentionally hides the footer — buildPremium renders its
        // own primary CTA (Premium'u Dene) + ghost skip link inside the slide body.
        for (const n of [0, 1, 3]) {
            window.__onbGoto(n);
            await new Promise((r) => setTimeout(r, 20));
            const footer = document.querySelector('[data-testid="onb-deck-footer"]');
            expect(footer, `footer missing on slide ${n}`).toBeTruthy();
            const cta = footer.querySelector('.onb-cta');
            expect(cta, `footer CTA missing on slide ${n}`).toBeTruthy();
        }
    });

    it('S4 footer CTA click finalizes (sets lumi_onboarding_seen)', async () => {
        startOnboarding();
        window.__onbGoto(3);
        await new Promise((r) => setTimeout(r, 20));
        const cta = document.querySelector('[data-testid="onb-deck-footer"] [data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        cta.click();
        // close() runs after 700ms confetti delay.
        await new Promise((r) => setTimeout(r, 800));
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        expect(document.getElementById('onboarding-root')).toBeNull();
    });
});
