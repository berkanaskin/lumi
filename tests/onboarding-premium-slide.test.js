/**
 * Phase 04-04-r1 — Premium teaser slide (S5) tests.
 *
 * Covers:
 *   1. Wizard renders 6 visual slides (added Premium between Platforms and Ready)
 *   2. Locale-aware pricing — TR country shows ₺ pricing; non-TR shows USD
 *   3. "Skip for now" advances to Ready without opening the paywall
 *   4. Premium CTA opens the mock paywall sheet with 3 tier cards
 *
 * Locked decisions: .planning/decisions/PREMIUM-PRICING.md
 *
 * Note: tests/setup.js replaces global.document with a body-less mock so that
 * the 21 pure-logic onboarding tests can run without DOM. To exercise the
 * render path we build a fresh JSDOM in beforeEach and re-import the
 * onboarding module so it sees the real document/window.
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
    // Snapshot the setup.js-installed mocks so afterEach can restore.
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

    // Re-import the module fresh so any captured module-scope globals are
    // bound to the new DOM. vi.resetModules() clears the cache.
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

/** Boot the wizard and navigate to the Premium slide (index 2 in 04.6-03 layout). */
async function advanceToPremium(countryCode) {
    // Seed lumi_locale BEFORE startOnboarding so resolveOnboardingLocale picks
    // it up and state.country reflects the test's chosen country.
    localStorage.setItem('lumi_locale', JSON.stringify({
        lang: countryCode === 'TR' ? 'tr' : 'en',
        country: countryCode,
    }));
    startOnboarding();
    completeStep(1, { lang: countryCode === 'TR' ? 'tr' : 'en' });
    completeStep(2, { country: countryCode });
    // 04.6-03 — 4-slide layout: Welcome(0) → Platforms(1) → Premium(2) → Ready(3).
    if (typeof window.__onbGoto === 'function') {
        window.__onbGoto(2);
        await new Promise((r) => setTimeout(r, 20));
    }
}

describe('Premium teaser slide — 04-04-r1 / 04.6-03', () => {
    it('wizard renders 4 progress pills (04.6-03 — reduced from 6)', () => {
        startOnboarding();
        const pills = document.querySelectorAll('.onb-pill');
        expect(pills.length).toBe(4);
        expect(document.querySelector('.onb-pills')?.getAttribute('aria-valuemax')).toBe('4');
    });

    it('renders the premium slide with title and 4 feature rows', async () => {
        await advanceToPremium('US');
        const premium = document.querySelector('.onb-slide-premium');
        expect(premium).toBeTruthy();
        expect(premium.querySelectorAll('.onb-premium-feature').length).toBe(4);
        expect(premium.querySelector('.onb-premium-title')?.textContent).toContain('Lumi Premium');
    });

    it('shows USD pricing for non-TR users', async () => {
        await advanceToPremium('US');
        const priceLine = document.querySelector('.onb-premium-pricing-line')?.textContent || '';
        expect(priceLine).toContain('$2.99');
        expect(priceLine).toContain('$19.99');
        expect(priceLine).toContain('$49.99');
        expect(document.querySelector('.onb-premium-pricing')?.getAttribute('data-locale')).toBe('intl');
    });

    it('shows ₺ pricing for TR users', async () => {
        await advanceToPremium('TR');
        const priceLine = document.querySelector('.onb-premium-pricing-line')?.textContent || '';
        expect(priceLine).toContain('49');
        expect(priceLine).toContain('299');
        expect(priceLine).toContain('799');
        expect(priceLine).toContain('₺');
        expect(document.querySelector('.onb-premium-pricing')?.getAttribute('data-locale')).toBe('tr');
    });

    it('has a LIMITED badge on the pricing block', async () => {
        await advanceToPremium('US');
        const badge = document.querySelector('.onb-premium-limited-badge');
        expect(badge).toBeTruthy();
        expect((badge.textContent || '').toLowerCase()).toContain('limit');
    });

    it('"Skip for now" advances to the Ready slide without opening the paywall', async () => {
        await advanceToPremium('US');
        const skip = document.querySelector('[data-testid="onb-premium-skip"]');
        expect(skip).toBeTruthy();
        skip.click();
        await new Promise((r) => setTimeout(r, 0));
        expect(document.querySelector('.onb-slide-premium')).toBeNull();
        expect(document.querySelector('.onb-hero-title')).toBeTruthy();
        expect(document.getElementById('onb-paywall-sheet')).toBeNull();
    });

    it('Premium CTA opens the mock paywall sheet with 3 tier cards', async () => {
        await advanceToPremium('US');
        const cta = document.querySelector('[data-testid="onb-premium-cta"]');
        expect(cta).toBeTruthy();
        cta.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const sheet = document.getElementById('onb-paywall-sheet');
        expect(sheet).toBeTruthy();
        expect(sheet.querySelectorAll('.onb-paywall-tier').length).toBe(3);
        expect(sheet.querySelector('.onb-paywall-tier[data-tier="yearly"]')?.classList.contains('selected')).toBe(true);
        expect(sheet.querySelector('.onb-paywall-tier[data-tier="lifetime"] .onb-paywall-tier-badge.limited')).toBeTruthy();
    });
});
