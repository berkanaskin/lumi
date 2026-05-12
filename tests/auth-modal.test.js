/**
 * Phase 04-03 - auth-modal unit tests.
 *
 * Behaviour:
 *   - requireAuth() when already signed in resolves immediately with currentUser
 *     (no DOM modal opened).
 *   - requireAuth() when signed out opens the modal, and cancelling rejects with
 *     a DOMException named 'AbortError'.
 *   - _onAuthResolved(user) resolves a pending requireAuth() promise.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
    document.body.innerHTML = '';
    // Reset module so internal pending-promise refs don't leak across tests.
    vi.resetModules();
    delete window.firebase;
    window.i18n = {
        t: (key) => {
            const map = {
                'authGate.default': 'Sign in to continue',
                'authGate.rateMovie': 'Sign in to rate',
                'authGate.shareList': 'Sign in to share',
            };
            return map[key] || null;
        },
    };
});

describe('requireAuth', () => {
    it('resolves immediately with currentUser when already signed in', async () => {
        const user = { uid: 'abc', email: 'a@b.c' };
        window.firebase = { auth: () => ({ currentUser: user }) };

        const { requireAuth } = await import('../src/features/auth-modal.js');
        const result = await requireAuth({ action: 'rateMovie' });
        expect(result).toBe(user);
        // No modal added to DOM
        expect(document.getElementById('auth-modal')).toBeNull();
    });

    it('opens modal when signed out, rejects with AbortError on cancel', async () => {
        window.firebase = { auth: () => ({ currentUser: null }) };
        const { requireAuth, closeAuthModal } = await import('../src/features/auth-modal.js');

        const promise = requireAuth({ action: 'rateMovie' });
        // Modal should be present
        const modal = document.getElementById('auth-modal');
        expect(modal).not.toBeNull();
        expect(modal.classList.contains('open')).toBe(true);
        const ctx = modal.querySelector('.auth-modal-context');
        expect(ctx.textContent).toContain('Sign in to rate');

        // Click cancel
        const cancelBtn = modal.querySelector('[data-auth-cancel]');
        expect(cancelBtn).not.toBeNull();
        cancelBtn.click();

        await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
        // Modal hidden after cancel
        expect(document.getElementById('auth-modal').classList.contains('open')).toBe(false);
    });

    it('falls back to authGate.default copy for unknown actions', async () => {
        window.firebase = { auth: () => ({ currentUser: null }) };
        const { requireAuth } = await import('../src/features/auth-modal.js');

        requireAuth({ action: 'unknownActionXyz' });
        const modal = document.getElementById('auth-modal');
        expect(modal.querySelector('.auth-modal-context').textContent).toBe('Sign in to continue');
    });

    it('_onAuthResolved resolves a pending requireAuth promise', async () => {
        window.firebase = { auth: () => ({ currentUser: null }) };
        const { requireAuth, _onAuthResolved } = await import('../src/features/auth-modal.js');

        const promise = requireAuth({ action: 'rateMovie' });
        const user = { uid: 'xyz' };
        _onAuthResolved(user);

        await expect(promise).resolves.toBe(user);
        expect(document.getElementById('auth-modal').classList.contains('open')).toBe(false);
    });
});
