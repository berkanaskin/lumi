/**
 * Phase 04-03 - migrateOnAuth unit tests.
 *
 * Behaviours under test:
 *   1. localStorage[liked_items] = [A,B,C] + Firestore [B,D] -> union {A,B,C,D}
 *   2. Calling migrateOnAuth twice is a no-op the second time (flag prevents re-run)
 *   3. Empty localStorage -> no-op write, but flag still set (so we don't re-check forever)
 *   4. Write failure -> flag NOT set, function returns { error }
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockDb } from './fixtures/firebase-mock.js';
import { migrateOnAuth, MIGRATION_FLAG } from '../src/features/auth-migration.js';

const FAKE_USER = { uid: 'user-123' };

function seedLocal(liked = [], watch = []) {
    localStorage.setItem('liked_items', JSON.stringify(liked));
    localStorage.setItem('watchlist_items', JSON.stringify(watch));
}

beforeEach(() => {
    localStorage.clear();
});

describe('migrateOnAuth', () => {
    it('unions localStorage liked_items + watchlist_items into Firestore (merge:true)', async () => {
        const db = createMockDb();
        // Pre-existing Firestore favorites: B + D
        await db.collection(`users/${FAKE_USER.uid}/favorites`).doc('B').set({ id: 'B', title: 'B-fire', added_at: 1 });
        await db.collection(`users/${FAKE_USER.uid}/favorites`).doc('D').set({ id: 'D', title: 'D-fire', added_at: 2 });

        seedLocal(
            [
                { id: 'A', title: 'A-local' },
                { id: 'B', title: 'B-local' }, // collides with Firestore B
                { id: 'C', title: 'C-local' },
            ],
            [{ id: 'W1', title: 'Watch1' }],
        );

        const res = await migrateOnAuth(FAKE_USER, db);
        expect(res).toEqual(expect.objectContaining({ migrated: 4 }));

        // Firestore should contain union: A, B, C, D in favorites; W1 in watchlist
        const fav = await db.collection(`users/${FAKE_USER.uid}/favorites`).get();
        const favIds = fav.docs.map((d) => d.id).sort();
        expect(favIds).toEqual(['A', 'B', 'C', 'D']);

        const watch = await db.collection(`users/${FAKE_USER.uid}/watchlist`).get();
        expect(watch.docs.map((d) => d.id)).toEqual(['W1']);

        // merge:true preserved Firestore's added_at on B (didn't get clobbered by local)
        const bDoc = await db.collection(`users/${FAKE_USER.uid}/favorites`).doc('B').get();
        expect(bDoc.data().added_at).toBe(1);
        // But local title write happened too (merged)
        expect(bDoc.data().title).toBe('B-local');

        // Flag set
        expect(localStorage.getItem(MIGRATION_FLAG)).toBe('true');
    });

    it('is idempotent — second call is a no-op', async () => {
        const db = createMockDb();
        seedLocal([{ id: 'A', title: 'A' }]);

        const first = await migrateOnAuth(FAKE_USER, db);
        expect(first.migrated).toBe(1);
        expect(localStorage.getItem(MIGRATION_FLAG)).toBe('true');

        // Add a new local item — it should NOT be written on the 2nd call
        seedLocal([{ id: 'A', title: 'A' }, { id: 'Z', title: 'Z-new' }]);
        const second = await migrateOnAuth(FAKE_USER, db);
        expect(second.skipped).toBe(true);

        const fav = await db.collection(`users/${FAKE_USER.uid}/favorites`).get();
        const ids = fav.docs.map((d) => d.id).sort();
        expect(ids).toEqual(['A']); // Z NOT migrated
    });

    it('empty localStorage -> no writes, but flag is set', async () => {
        const db = createMockDb();
        // No seed.

        const res = await migrateOnAuth(FAKE_USER, db);
        expect(res.migrated).toBe(0);
        expect(localStorage.getItem(MIGRATION_FLAG)).toBe('true');

        const fav = await db.collection(`users/${FAKE_USER.uid}/favorites`).get();
        expect(fav.docs.length).toBe(0);
    });

    it('write failure -> flag NOT set, returns { error }, retryable on next call', async () => {
        const db = createMockDb({ shouldFail: true });
        seedLocal([{ id: 'A', title: 'A' }]);

        const res = await migrateOnAuth(FAKE_USER, db);
        expect(res.error).toBeTruthy();
        expect(localStorage.getItem(MIGRATION_FLAG)).toBeNull();

        // Retry with a working db now succeeds
        const db2 = createMockDb();
        const retry = await migrateOnAuth(FAKE_USER, db2);
        expect(retry.migrated).toBe(1);
        expect(localStorage.getItem(MIGRATION_FLAG)).toBe('true');
    });

    it('no-user -> skipped without error', async () => {
        const db = createMockDb();
        seedLocal([{ id: 'A', title: 'A' }]);
        const res = await migrateOnAuth(null, db);
        expect(res.skipped).toBe(true);
        expect(localStorage.getItem(MIGRATION_FLAG)).toBeNull();
    });
});
