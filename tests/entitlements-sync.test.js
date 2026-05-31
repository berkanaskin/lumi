import { describe, it, expect } from 'vitest';
import { resolvePremium } from '../src/lib/entitlements-sync.js';

describe('entitlements-sync — resolvePremium (pure, Phase 05-01)', () => {
    it('is false with no user', () => {
        expect(resolvePremium(null, { premium: true })).toBe(false);
    });
    it('is false for anonymous users even if the doc says premium', () => {
        expect(resolvePremium({ isAnonymous: true }, { premium: true })).toBe(false);
    });
    it('is true for a real user whose doc has premium===true', () => {
        expect(resolvePremium({ isAnonymous: false, uid: 'x' }, { premium: true })).toBe(true);
    });
    it('is false for a real user with no premium field / false', () => {
        expect(resolvePremium({ isAnonymous: false }, null)).toBe(false);
        expect(resolvePremium({ isAnonymous: false }, {})).toBe(false);
        expect(resolvePremium({ isAnonymous: false }, { premium: false })).toBe(false);
        expect(resolvePremium({ isAnonymous: false }, { premium: 'true' })).toBe(false);
    });
});
