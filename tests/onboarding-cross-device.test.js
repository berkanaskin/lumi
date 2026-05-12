/**
 * Phase 04-04 - Cross-device onboarding hydration test.
 *
 * Scenario: authenticated user signs in on a new device. localStorage is empty
 * (fresh browser) but Firestore has users/{uid}.preferences with version >= 1.
 * Onboarding wizard MUST NOT appear; localStorage MUST be hydrated from
 * Firestore so subsequent UX renders correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockDb } from './fixtures/firebase-mock.js';
import { shouldShowOnboarding } from '../src/features/onboarding.js';

const USER = { uid: 'cross-device-user' };

beforeEach(() => {
    localStorage.clear();
});

describe('cross-device hydration', () => {
    it('does NOT show wizard when Firestore prefs.version=1 exists; hydrates LS', async () => {
        const db = createMockDb();
        const prefs = {
            lang: 'en',
            country: 'US',
            ownedPlatforms: [8, 337],
            completedAt: 1700000000000,
            version: 1,
        };
        await db.collection('users').doc(USER.uid).set({ preferences: prefs });

        const result = await shouldShowOnboarding({ user: USER, db });

        expect(result).toBe(false);
        expect(localStorage.getItem('lumi_onboarding_completed')).toBe('true');
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');

        const hydrated = JSON.parse(localStorage.getItem('lumi_onboarding'));
        expect(hydrated.lang).toBe('en');
        expect(hydrated.country).toBe('US');
        expect(hydrated.ownedPlatforms).toEqual([8, 337]);
    });

    it('shows wizard when Firestore user doc exists but preferences is missing', async () => {
        const db = createMockDb();
        // Doc exists but no preferences field
        await db.collection('users').doc(USER.uid).set({ displayName: 'X' });
        const result = await shouldShowOnboarding({ user: USER, db });
        expect(result).toBe(true);
    });

    it('shows wizard when Firestore prefs version is missing/0 (legacy schema)', async () => {
        const db = createMockDb();
        await db.collection('users').doc(USER.uid).set({
            preferences: { lang: 'tr', country: 'TR' /* no version */ },
        });
        const result = await shouldShowOnboarding({ user: USER, db });
        expect(result).toBe(true);
    });
});
