/**
 * Phase 04-04-r2 — Country search filter + a11y wiring tests (DOM-level).
 *
 * Uses a fresh JSDOM per test to bypass tests/setup.js's body-less document
 * mock. See onboarding-premium-slide.test.js for the same pattern.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let startOnboarding;
let completeStep;
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
    completeStep = mod.completeStep;

    localStorage.clear();
    document.body.innerHTML = '';
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    global.requestAnimationFrame = origRAF;
});

async function advanceToCountry() {
    // 04.6-03 — Country selection lives in the S1 bottom-sheet picker.
    // Open the picker so the search input + country list mount.
    startOnboarding();
    if (typeof window.__onbOpenPicker === 'function') {
        window.__onbOpenPicker();
        await new Promise((r) => setTimeout(r, 20));
    } else {
        document.querySelector('.onb-detection-banner')?.click();
        await new Promise((r) => setTimeout(r, 20));
    }
}

function flushTimers() {
    return new Promise((r) => setTimeout(r, 120));
}

describe('country slide search filter', () => {
    it('renders a search input + initial 31-country list', async () => {
        await advanceToCountry();
        const search = document.querySelector('input.onb-search');
        expect(search).toBeTruthy();
        const items = document.querySelectorAll('.onb-list .onb-option');
        expect(items.length).toBeGreaterThanOrEqual(30);
    });

    it('filters to a single result when typing an exact code', async () => {
        await advanceToCountry();
        const search = document.querySelector('input.onb-search');
        search.value = 'jp';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
        await flushTimers();
        const items = document.querySelectorAll('.onb-list .onb-option');
        expect(items.length).toBe(1);
        expect(items[0].getAttribute('data-cc')).toBe('JP');
    });

    it('matches name case-insensitively (e.g. "tur" → TR)', async () => {
        await advanceToCountry();
        const search = document.querySelector('input.onb-search');
        search.value = 'TUR';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
        await flushTimers();
        const items = document.querySelectorAll('.onb-list .onb-option');
        expect(items.length).toBeGreaterThanOrEqual(1);
        const codes = [...items].map((i) => i.getAttribute('data-cc'));
        expect(codes).toContain('TR');
    });

    it('shows empty-state copy when nothing matches', async () => {
        await advanceToCountry();
        const search = document.querySelector('input.onb-search');
        search.value = 'zzzzzz';
        search.dispatchEvent(new window.Event('input', { bubbles: true }));
        await flushTimers();
        const items = document.querySelectorAll('.onb-list .onb-option');
        expect(items.length).toBe(0);
        const empty = document.querySelector('.onb-search-empty');
        expect(empty).toBeTruthy();
        expect(empty.textContent).toMatch(/no matches|sonuç yok/i);
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
