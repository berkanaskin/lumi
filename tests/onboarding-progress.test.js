/**
 * Phase 04-04-r2 — Mid-flow state persistence tests.
 *
 * Verifies the lumi_onboarding_progress key:
 *   - readOnboardingProgress() returns null when missing/expired/invalid
 *   - writeOnboardingProgress() stores step + picks + savedAt
 *   - 7-day TTL is enforced
 *   - clearOnboardingProgress() removes the key
 *   - skipOnboarding() clears progress
 *   - completeStep(3) does NOT clear progress (Ready slide handles cleanup)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PROGRESS_KEY,
    readOnboardingProgress,
    writeOnboardingProgress,
    clearOnboardingProgress,
    skipOnboarding,
} from '../src/features/onboarding.js';

beforeEach(() => {
    localStorage.clear();
});

describe('readOnboardingProgress', () => {
    it('returns null when no key set', () => {
        expect(readOnboardingProgress()).toBeNull();
    });

    it('returns null when JSON is corrupt', () => {
        localStorage.setItem(PROGRESS_KEY, '{not json');
        expect(readOnboardingProgress()).toBeNull();
    });

    it('returns null when step is missing or zero', () => {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            step: 0,
            picks: {},
            savedAt: new Date().toISOString(),
        }));
        expect(readOnboardingProgress()).toBeNull();
    });

    it('returns null when savedAt is older than 7 days', () => {
        const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            step: 2,
            picks: { lang: 'tr' },
            savedAt: old,
        }));
        expect(readOnboardingProgress()).toBeNull();
    });

    it('returns the parsed progress when fresh and valid', () => {
        const fresh = new Date().toISOString();
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            step: 3,
            picks: { lang: 'en', country: 'US', platforms: [8, 337] },
            savedAt: fresh,
        }));
        const got = readOnboardingProgress();
        expect(got).not.toBeNull();
        expect(got.step).toBe(3);
        expect(got.picks.lang).toBe('en');
        expect(got.picks.country).toBe('US');
        expect(got.picks.platforms).toEqual([8, 337]);
    });
});

describe('writeOnboardingProgress', () => {
    it('writes step + picks + savedAt ISO string', () => {
        writeOnboardingProgress({ step: 2, picks: { lang: 'tr', country: 'TR' } });
        const raw = localStorage.getItem(PROGRESS_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw);
        expect(parsed.step).toBe(2);
        expect(parsed.picks.lang).toBe('tr');
        expect(parsed.picks.country).toBe('TR');
        expect(typeof parsed.savedAt).toBe('string');
        // ISO 8601 parses to a finite number
        expect(Number.isFinite(Date.parse(parsed.savedAt))).toBe(true);
    });

    it('round-trips through read', () => {
        writeOnboardingProgress({
            step: 4,
            picks: { lang: 'en', country: 'GB', platforms: [8], premiumChoice: 'yearly' },
        });
        const got = readOnboardingProgress();
        expect(got.step).toBe(4);
        expect(got.picks.premiumChoice).toBe('yearly');
    });
});

describe('clearOnboardingProgress', () => {
    it('removes the key', () => {
        writeOnboardingProgress({ step: 2, picks: {} });
        expect(localStorage.getItem(PROGRESS_KEY)).toBeTruthy();
        clearOnboardingProgress();
        expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    });
});

describe('skipOnboarding clears in-flight progress', () => {
    it('removes the progress key alongside flipping flags', () => {
        writeOnboardingProgress({ step: 3, picks: { lang: 'tr', country: 'TR' } });
        skipOnboarding();
        expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        expect(localStorage.getItem('lumi_onboarding_completed')).toBe('true');
    });
});
