/**
 * LUMI - Profile Update Unit Tests
 * Plan 03.2-03 / Task 1
 *
 * Tests AuthService.updateUserProfile + stats decisioning.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUserProfileImpl } from '../src/lib/auth-update.js';

function buildMocks(currentUser) {
    const updateProfile = vi.fn().mockResolvedValue();
    const updateDoc = vi.fn().mockResolvedValue();
    const setDoc = vi.fn().mockResolvedValue();
    const userDoc = { update: updateDoc, set: setDoc };
    const docFn = vi.fn(() => userDoc);
    const collectionFn = vi.fn(() => ({ doc: docFn }));
    const db = { collection: collectionFn };

    const user = currentUser
        ? {
              uid: currentUser.uid,
              displayName: currentUser.displayName ?? null,
              photoURL: currentUser.photoURL ?? null,
              updateProfile,
          }
        : null;
    const auth = { currentUser: user };
    const syncUserToLocal = vi.fn();
    return { auth, db, updateProfile, updateDoc, docFn, collectionFn, syncUserToLocal };
}

describe('updateUserProfile (Plan 03.2-03)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test 1: updates displayName on Auth and Firestore', async () => {
        const m = buildMocks({ uid: 'u1', displayName: 'Old', photoURL: null });
        await updateUserProfileImpl({ auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal }, 'NewName', undefined);

        expect(m.updateProfile).toHaveBeenCalledWith({ displayName: 'NewName' });
        expect(m.collectionFn).toHaveBeenCalledWith('users');
        expect(m.docFn).toHaveBeenCalledWith('u1');
        expect(m.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'NewName' }));
    });

    it('Test 2: updates only photoURL when displayName is undefined', async () => {
        const m = buildMocks({ uid: 'u1', displayName: 'Old', photoURL: null });
        await updateUserProfileImpl(
            { auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal },
            undefined,
            'https://cdn.example/a.png',
        );

        expect(m.updateProfile).toHaveBeenCalledWith({ photoURL: 'https://cdn.example/a.png' });
        const arg = m.updateDoc.mock.calls[0][0];
        expect(arg.photoURL).toBe('https://cdn.example/a.png');
        expect(arg.displayName).toBeUndefined();
    });

    it('Test 3: throws "Not logged in" when currentUser is null', async () => {
        const m = buildMocks(null);
        await expect(
            updateUserProfileImpl({ auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal }, 'Foo', undefined),
        ).rejects.toThrow(/not logged in/i);
    });

    it('Test 4: calls syncUserToLocal after a successful update', async () => {
        const m = buildMocks({ uid: 'u1', displayName: 'Old', photoURL: null });
        await updateUserProfileImpl({ auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal }, 'NewName', undefined);

        expect(m.syncUserToLocal).toHaveBeenCalledTimes(1);
        expect(m.syncUserToLocal).toHaveBeenCalledWith(m.auth.currentUser);
    });

    it('rejects non-HTTPS photoURL (Threat T-03.2-03-01)', async () => {
        const m = buildMocks({ uid: 'u1', displayName: 'Old', photoURL: null });
        await expect(
            updateUserProfileImpl({ auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal }, undefined, 'http://insecure/x.png'),
        ).rejects.toThrow(/https/i);
        expect(m.updateProfile).not.toHaveBeenCalled();
    });

    it('trims and caps displayName at 40 chars (Threat T-03.2-03-02)', async () => {
        const m = buildMocks({ uid: 'u1', displayName: 'Old', photoURL: null });
        const long = '   ' + 'x'.repeat(80) + '   ';
        await updateUserProfileImpl({ auth: m.auth, db: m.db, syncUserToLocal: m.syncUserToLocal }, long, undefined);
        const arg = m.updateProfile.mock.calls[0][0];
        expect(arg.displayName.length).toBe(40);
        expect(arg.displayName.startsWith(' ')).toBe(false);
    });
});
