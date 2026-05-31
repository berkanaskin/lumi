import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openPaywall, closePaywall } from '../src/ui/paywall-sheet.js';
import { isPremium, PREMIUM_KEY } from '../src/lib/entitlements.js';

describe('paywall-sheet — in-app premium sheet (Phase 05-02)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        closePaywall();
    });
    afterEach(() => {
        closePaywall();
        localStorage.clear();
    });

    it('renders 4 features, 3 tiers, and a 3-day trial', () => {
        openPaywall({ trigger: 'feature' });
        const sheet = document.querySelector('[data-testid="paywall-sheet"]');
        expect(sheet).toBeTruthy();
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
        // vitest runs with import.meta.env.DEV === true
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
        window.dispatchEvent(new CustomEvent('lumi:paywall', { detail: { trigger: 'quota' } }));
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
