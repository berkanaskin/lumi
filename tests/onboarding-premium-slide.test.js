/**
 * Phase 04.6-r7 — Premium slide (S3) tests against mockup vocab.
 *
 * Mockup vocab: .feat-cell (4x feat grid), .psq (3x square pricing cards),
 *   .psq .psq-price, .psq .psq-badge.lim, .premium-hero.
 *
 * Removed in r7: floating paywall sheet (.onb-paywall-sheet). The Premium
 * slide now commits the tier choice in-place (via .psq.sel) and the footer
 * CTA advances to Ready. RevenueCat purchase flow (Phase 5) replaces the
 * mock sheet.
 *
 * Covers:
 *   1. Wizard renders 4 dots (.dot)
 *   2. Locale-aware pricing — TR shows ₺, non-TR shows USD
 *   3. "Skip" (ghost button) advances to Ready
 *   4. Premium CTA advances to Ready
 *   5. Limited badge on lifetime card
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

async function advanceToPremium(countryCode) {
    localStorage.setItem('lumi_locale', JSON.stringify({
        lang: countryCode === 'TR' ? 'tr' : 'en',
        country: countryCode,
    }));
    startOnboarding();
    completeStep(1, { lang: countryCode === 'TR' ? 'tr' : 'en' });
    completeStep(2, { country: countryCode });
    if (typeof window.__onbGoto === 'function') {
        window.__onbGoto(2);
        await new Promise((r) => setTimeout(r, 20));
    }
}

describe('Premium slide — 04.6-r7 mockup vocab', () => {
    it('wizard renders 4 progress dots', () => {
        startOnboarding();
        const dots = document.querySelectorAll('.dots .dot');
        expect(dots.length).toBe(4);
        expect(document.querySelector('.dots')?.getAttribute('aria-valuemax')).toBe('4');
    });

    it('renders the premium slide with hero and 4 feature cells', async () => {
        await advanceToPremium('US');
        const premium = document.querySelector('.onb-slide-premium');
        expect(premium).toBeTruthy();
        // r7: mockup vocab is .feat-cell (2x2 grid)
        expect(premium.querySelectorAll('.feat-cell').length).toBe(4);
        expect(premium.querySelector('.premium-hero')?.textContent).toContain('Lumi');
    });

    it('shows USD pricing for non-TR users', async () => {
        await advanceToPremium('US');
        // r7: 3 square pricing cards (.psq .psq-price) — mockup vocab
        const prices = Array.from(document.querySelectorAll('.psq .psq-price')).map((n) => n.textContent || '').join(' ');
        expect(prices).toContain('$2.99');
        expect(prices).toContain('$19.99');
        expect(prices).toContain('$49.99');
    });

    it('shows ₺ pricing for TR users', async () => {
        await advanceToPremium('TR');
        const prices = Array.from(document.querySelectorAll('.psq .psq-price')).map((n) => n.textContent || '').join(' ');
        expect(prices).toContain('49');
        expect(prices).toContain('299');
        expect(prices).toContain('799');
        expect(prices).toContain('₺');
    });

    it('has a LIMITED badge on the lifetime tier card', async () => {
        await advanceToPremium('US');
        // r7: limited badge on lifetime tier card (.psq-badge.lim) — mockup vocab
        const badge = document.querySelector('.psq-badge.lim');
        expect(badge).toBeTruthy();
        expect((badge.textContent || '').toLowerCase()).toMatch(/ltd|limit/);
    });

    it('"Skip" ghost advances to the Ready slide', async () => {
        await advanceToPremium('US');
        const skip = document.querySelector('[data-testid="onb-premium-skip"]');
        expect(skip).toBeTruthy();
        skip.click();
        await new Promise((r) => setTimeout(r, 30));
        expect(document.querySelector('.onb-slide-premium')).toBeNull();
        expect(document.querySelector('.onb-slide-ready')).toBeTruthy();
    });

    it('Premium CTA advances to Ready (paywall sheet removed in r7 — Phase 5 RevenueCat)', async () => {
        await advanceToPremium('US');
        const cta = document.querySelector('[data-testid="onb-premium-cta"]');
        expect(cta).toBeTruthy();
        cta.click();
        await new Promise((r) => setTimeout(r, 30));
        expect(document.querySelector('.onb-slide-ready')).toBeTruthy();
        // Confirm legacy paywall sheet is gone.
        expect(document.getElementById('onb-paywall-sheet')).toBeNull();
    });
});
