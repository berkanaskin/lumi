/**
 * Phase 04.6-r3 — A11y wiring + country list (inline picker).
 *
 * The r2 search filter (accent-fold + Turkish ı→i) lived in the floating
 * bottom-sheet picker which was deleted in r3. The inline picker shows the
 * full 31-country shortlist without a search box (acceptable: 31 items =
 * ~6 viewport screens, easily scannable). If/when we add search back, it
 * will be on the inline panel and these tests will be extended.
 *
 * Uses a fresh JSDOM per test to bypass tests/setup.js's body-less mock.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let startOnboarding;
let origDocument;
let origWindow;
let origRAF;
let origLocalStorage;

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
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }));

    vi.resetModules();
    const mod = await import('../src/features/onboarding.js');
    startOnboarding = mod.startOnboarding;

    localStorage.clear();
    document.body.innerHTML = '';
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    global.requestAnimationFrame = origRAF;
});

async function openCountryPicker() {
    startOnboarding();
    await new Promise((r) => setTimeout(r, 10));
    const countryChip = document.querySelector('[data-testid="onb-locale-chip-country"]');
    countryChip.click();
    await new Promise((r) => setTimeout(r, 20));
}

describe('04.6-r3 — inline country picker', () => {
    it('country chip expands to 31-country shortlist inline', async () => {
        await openCountryPicker();
        const panel = document.querySelector('[data-testid="onb-locale-panel-country"]');
        expect(panel).toBeTruthy();
        const items = panel.querySelectorAll('.onb-locale-opt');
        expect(items.length).toBeGreaterThanOrEqual(30);
    });

    it('country list includes major launch markets (TR, US, GB, DE, JP)', async () => {
        await openCountryPicker();
        const panel = document.querySelector('[data-testid="onb-locale-panel-country"]');
        for (const cc of ['TR', 'US', 'GB', 'DE', 'JP']) {
            expect(panel.querySelector(`[data-cc="${cc}"]`), `missing ${cc}`).toBeTruthy();
        }
    });

    it('country options have flag emoji + country name', async () => {
        await openCountryPicker();
        const trOpt = document.querySelector('[data-testid="onb-locale-panel-country"] [data-cc="TR"]');
        expect(trOpt).toBeTruthy();
        expect(trOpt.querySelector('.onb-opt-flag')).toBeTruthy();
        expect(trOpt.textContent).toMatch(/Türkiye|Turkey/);
    });

    it('tapping an option commits the country to state + localStorage', async () => {
        await openCountryPicker();
        const jpOpt = document.querySelector('[data-testid="onb-locale-panel-country"] [data-cc="JP"]');
        jpOpt.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(window.__onbState().country).toBe('JP');
        const onb = JSON.parse(localStorage.getItem('lumi_onboarding') || '{}');
        expect(onb.country).toBe('JP');
    });
});

describe('wizard a11y wiring (04-04-r2)', () => {
    it('root has role=dialog and aria-modal=true', () => {
        startOnboarding();
        const root = document.getElementById('onboarding-root');
        expect(root).toBeTruthy();
        expect(root.getAttribute('role')).toBe('dialog');
        expect(root.getAttribute('aria-modal')).toBe('true');
        expect(root.getAttribute('aria-labelledby')).toBe('onb-slide-heading');
    });

    it('has an aria-live announcer that updates with slide changes', () => {
        startOnboarding();
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer).toBeTruthy();
        // 04.6-03 — 4-slide layout (down from 6)
        expect(announcer.textContent).toMatch(/step 1 of 4/i);
    });

    it('current slide heading has data-onb-heading attribute', () => {
        startOnboarding();
        const heading = document.querySelector('[data-onb-heading]');
        expect(heading).toBeTruthy();
    });
});
