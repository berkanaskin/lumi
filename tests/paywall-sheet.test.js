/**
 * Phase 05-02 — in-app paywall sheet. Uses a real JSDOM (the repo's mock `document`
 * in tests/setup.js cannot render/query a built DOM), mirroring the onboarding tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let openPaywall, closePaywall, isPremium, PREMIUM_KEY;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;

    vi.resetModules();
    const ent = await import('../src/lib/entitlements.js');
    isPremium = ent.isPremium;
    PREMIUM_KEY = ent.PREMIUM_KEY;
    const pw = await import('../src/ui/paywall-sheet.js');
    openPaywall = pw.openPaywall;
    closePaywall = pw.closePaywall;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('paywall-sheet — in-app premium sheet (Phase 05-02)', () => {
    it('renders 4 features, 3 tiers, and a 3-day trial', () => {
        openPaywall({ trigger: 'feature' });
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeTruthy();
        expect(document.querySelectorAll('[data-testid="pw-feature"]').length).toBe(4);
        expect(document.querySelectorAll('[data-testid="pw-tier"]').length).toBe(3);
        expect(document.querySelector('.pw-trial').textContent).toMatch(/3/);
    });

    it('shows the quota lead only for the quota trigger', () => {
        openPaywall({ trigger: 'quota' });
        expect(document.querySelector('.pw-quota-lead')).toBeTruthy();
        closePaywall();
        openPaywall({ trigger: 'feature' });
        expect(document.querySelector('.pw-quota-lead')).toBeFalsy();
    });

    it('in dev, the CTA flips the entitlement (mock unlock) and closes the sheet', () => {
        openPaywall({ trigger: 'quota' });
        const cta = document.querySelector('[data-testid="pw-cta"]');
        expect(cta.getAttribute('data-mode')).toBe('dev-unlock');
        expect(isPremium()).toBe(false);
        cta.click();
        expect(isPremium()).toBe(true);
        expect(document.getElementById('pw-overlay')).toBeFalsy();
    });

    it('does not open for users who are already premium', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openPaywall({ trigger: 'feature' });
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeFalsy();
    });

    it('is idempotent — a second open while open does not stack sheets', () => {
        openPaywall({ trigger: 'feature' });
        openPaywall({ trigger: 'feature' });
        expect(document.querySelectorAll('[data-testid="paywall-sheet"]').length).toBe(1);
    });

    it('opens in response to the lumi:paywall event (self-registered listener)', () => {
        window.dispatchEvent(new window.CustomEvent('lumi:paywall', { detail: { trigger: 'quota' } }));
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeTruthy();
        expect(document.querySelector('.pw-quota-lead')).toBeTruthy();
    });

    it('closePaywall removes the overlay', () => {
        openPaywall({ trigger: 'feature' });
        expect(document.getElementById('pw-overlay')).toBeTruthy();
        closePaywall();
        expect(document.getElementById('pw-overlay')).toBeFalsy();
    });
});
