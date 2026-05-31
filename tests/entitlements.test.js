import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    isPremium,
    setPremiumMock,
    applyEntitlement,
    onEntitlementChange,
    PREMIUM_KEY,
} from '../src/lib/entitlements.js';

describe('entitlements — single read path for premium state', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('isPremium()', () => {
        it('defaults to false with no stored entitlement', () => {
            expect(isPremium()).toBe(false);
        });
        it('is true when the mirror holds "true"', () => {
            localStorage.setItem(PREMIUM_KEY, 'true');
            expect(isPremium()).toBe(true);
        });
        it('is false for any non-"true" value', () => {
            localStorage.setItem(PREMIUM_KEY, 'false');
            expect(isPremium()).toBe(false);
            localStorage.setItem(PREMIUM_KEY, '1');
            expect(isPremium()).toBe(false);
        });
    });

    describe('applyEntitlement(bool) — used when a Firestore snapshot arrives', () => {
        it('writes the localStorage mirror', () => {
            applyEntitlement(true);
            expect(localStorage.getItem(PREMIUM_KEY)).toBe('true');
            expect(isPremium()).toBe(true);
            applyEntitlement(false);
            expect(isPremium()).toBe(false);
        });
        it('notifies change listeners', () => {
            const cb = vi.fn();
            onEntitlementChange(cb);
            applyEntitlement(true);
            expect(cb).toHaveBeenCalledWith(true);
        });
    });

    describe('setPremiumMock(bool) — dev-only writer (Phase 6 → RevenueCat webhook)', () => {
        it('flips the entitlement and notifies listeners', () => {
            const cb = vi.fn();
            onEntitlementChange(cb);
            setPremiumMock(true);
            expect(isPremium()).toBe(true);
            expect(cb).toHaveBeenCalledWith(true);
        });
    });

    describe('onEntitlementChange', () => {
        it('returns an unsubscribe that stops further notifications', () => {
            const cb = vi.fn();
            const off = onEntitlementChange(cb);
            off();
            applyEntitlement(true);
            expect(cb).not.toHaveBeenCalled();
        });
    });
});
