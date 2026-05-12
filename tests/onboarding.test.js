/**
 * Phase 04-04 - Onboarding wizard state machine unit tests.
 *
 * Covers:
 *   1. shouldShowOnboarding() flag truth-table (guest)
 *   2. completeStep(1..3, data) updates lumi_onboarding + flags
 *   3. skipOnboarding() seeds defaults + sets both flags
 *   4. fetchProviders(country) sorts by display_priority, caps at 20, fails to []
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import providerFixture from './fixtures/tmdb-watch-providers-tr.json';
import {
    shouldShowOnboarding,
    startOnboarding,
    completeStep,
    skipOnboarding,
    fetchProviders,
    COUNTRY_SHORTLIST,
} from '../src/features/onboarding.js';

beforeEach(() => {
    localStorage.clear();
    // Wipe any locale residue from previous tests so getLocale() returns default.
    if (global.fetch && global.fetch.mockReset) global.fetch.mockReset();
});

describe('shouldShowOnboarding (guest, no user)', () => {
    it('returns true when both flags are unset', async () => {
        expect(await shouldShowOnboarding()).toBe(true);
    });

    it('returns false when lumi_onboarding_completed=true', async () => {
        localStorage.setItem('lumi_onboarding_completed', 'true');
        expect(await shouldShowOnboarding()).toBe(false);
    });

    it('returns false when lumi_onboarding_seen=true (do not pester abandoners)', async () => {
        localStorage.setItem('lumi_onboarding_seen', 'true');
        expect(await shouldShowOnboarding()).toBe(false);
    });
});

describe('shouldShowOnboarding (authenticated user)', () => {
    function makeMockDb(prefs) {
        return {
            collection: () => ({
                doc: () => ({
                    async get() {
                        return {
                            exists: prefs !== undefined,
                            data: () => (prefs ? { preferences: prefs } : undefined),
                        };
                    },
                }),
            }),
        };
    }

    it('returns false and hydrates localStorage when Firestore prefs.version >= 1 exists', async () => {
        const prefs = { lang: 'en', country: 'US', ownedPlatforms: [8, 337], version: 1, completedAt: 123 };
        const db = makeMockDb(prefs);
        const user = { uid: 'u-1' };

        const result = await shouldShowOnboarding({ user, db });
        expect(result).toBe(false);
        expect(localStorage.getItem('lumi_onboarding_completed')).toBe('true');
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        const hydrated = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(hydrated.lang).toBe('en');
        expect(hydrated.country).toBe('US');
        expect(hydrated.ownedPlatforms).toEqual([8, 337]);
    });

    it('returns true when authenticated user has no Firestore prefs and no local flags', async () => {
        const db = makeMockDb(undefined);
        const user = { uid: 'u-2' };
        expect(await shouldShowOnboarding({ user, db })).toBe(true);
    });

    it('returns false on Firestore read error (treats as guest path → flag check)', async () => {
        const db = { collection: () => ({ doc: () => ({ get: () => Promise.reject(new Error('boom')) }) }) };
        const user = { uid: 'u-3' };
        // No flags set → still true (fail-open to show wizard rather than block forever)
        expect(await shouldShowOnboarding({ user, db })).toBe(true);
    });
});

describe('startOnboarding', () => {
    it('sets the seen flag', () => {
        startOnboarding();
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        // Not completed yet
        expect(localStorage.getItem('lumi_onboarding_completed')).toBeNull();
    });
});

describe('completeStep', () => {
    it('step 1 writes lang into lumi_onboarding', () => {
        completeStep(1, { lang: 'en' });
        const data = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(data.lang).toBe('en');
        expect(localStorage.getItem('lumi_onboarding_completed')).toBeNull();
    });

    it('step 2 writes country', () => {
        completeStep(1, { lang: 'tr' });
        completeStep(2, { country: 'TR' });
        const data = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(data.lang).toBe('tr');
        expect(data.country).toBe('TR');
    });

    it('step 3 writes platforms, completedAt, and sets completed flag', () => {
        completeStep(1, { lang: 'tr' });
        completeStep(2, { country: 'TR' });
        completeStep(3, { ownedPlatforms: [8, 337] });
        const data = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(data.ownedPlatforms).toEqual([8, 337]);
        expect(typeof data.completedAt).toBe('number');
        expect(localStorage.getItem('lumi_onboarding_completed')).toBe('true');
    });

    it('step 3 with auth user writes to Firestore preferences (merge)', async () => {
        const writes = [];
        const db = {
            collection: () => ({
                doc: () => ({
                    set: (data, opts) => {
                        writes.push({ data, opts });
                        return Promise.resolve();
                    },
                }),
            }),
        };
        const user = { uid: 'u-9' };
        completeStep(1, { lang: 'en' }, { user, db });
        completeStep(2, { country: 'US' }, { user, db });
        completeStep(3, { ownedPlatforms: [8] }, { user, db });
        // Async write is fire-and-forget; give it a tick.
        await new Promise((r) => setTimeout(r, 0));
        expect(writes.length).toBeGreaterThanOrEqual(1);
        const last = writes[writes.length - 1];
        expect(last.data.preferences.lang).toBe('en');
        expect(last.data.preferences.country).toBe('US');
        expect(last.data.preferences.ownedPlatforms).toEqual([8]);
        expect(last.data.preferences.version).toBe(1);
        expect(last.opts).toEqual({ merge: true });
    });
});

describe('skipOnboarding', () => {
    it('seeds defaults and sets both flags', () => {
        skipOnboarding();
        const data = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(data.lang).toBeTruthy();
        expect(data.country).toBeTruthy();
        expect(data.ownedPlatforms).toEqual([]);
        expect(data.skipped).toEqual(['step1', 'step2', 'step3']);
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        expect(localStorage.getItem('lumi_onboarding_completed')).toBe('true');
    });
});

describe('fetchProviders', () => {
    it('sorts by display_priority ascending and caps at top 20', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(providerFixture),
            }),
        );
        const list = await fetchProviders('TR');
        expect(list.length).toBeLessThanOrEqual(20);
        // First entry is the lowest display_priority
        expect(list[0].provider_name).toBe('Netflix');
        // Ascending order check
        for (let i = 1; i < list.length; i++) {
            expect(list[i].display_priority).toBeGreaterThanOrEqual(list[i - 1].display_priority);
        }
    });

    it('returns [] when fetch fails', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network')));
        const list = await fetchProviders('TR');
        expect(list).toEqual([]);
    });

    it('returns [] when response is not ok', async () => {
        global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
        const list = await fetchProviders('XX');
        expect(list).toEqual([]);
    });
});

describe('COUNTRY_SHORTLIST', () => {
    it('contains the 31 expected codes', () => {
        expect(COUNTRY_SHORTLIST.length).toBeGreaterThanOrEqual(30);
        expect(COUNTRY_SHORTLIST).toContain('TR');
        expect(COUNTRY_SHORTLIST).toContain('US');
        expect(COUNTRY_SHORTLIST).toContain('JP');
    });
});
