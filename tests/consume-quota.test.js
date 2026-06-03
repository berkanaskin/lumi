import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { consumeAiQuota } from '../src/features/discover.js';

/**
 * Client-side gate (Phase 05-01). The contract: block ONLY on an explicit 429;
 * fail OPEN on every other path (premium, allowed, no token, infra error) so a
 * Firestore/network hiccup never blocks a legitimate user.
 */
describe('consumeAiQuota — client free-tier gate', () => {
    beforeEach(() => {
        globalThis.window = globalThis;
    });
    afterEach(() => {
        vi.restoreAllMocks();
        delete globalThis.AuthService;
        delete globalThis.fetch;
    });

    it('fails CLOSED when no token is available even after waiting (05-A1)', async () => {
        globalThis.AuthService = { waitForToken: async () => null };
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(true);
        expect(r.reason).toBe('auth');
    });

    it('blocks with reason=quota on an explicit 429', async () => {
        globalThis.AuthService = { waitForToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 429, ok: false });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(true);
        expect(r.reason).toBe('quota');
    });

    it('blocks with reason=auth on a 401 (bad/expired token)', async () => {
        globalThis.AuthService = { waitForToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(true);
        expect(r.reason).toBe('auth');
    });

    it('allows and surfaces remaining on a 200 response', async () => {
        globalThis.AuthService = { waitForToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({ allow: true, remaining: 3, premium: false }),
        });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.remaining).toBe(3);
        expect(r.premium).toBe(false);
    });

    it('fails OPEN on a 5xx server error AFTER a valid token (infra blip)', async () => {
        globalThis.AuthService = { waitForToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 503, ok: false });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.degraded).toBe(true);
    });

    it('fails OPEN when fetch throws after a valid token (network down)', async () => {
        globalThis.AuthService = { waitForToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.degraded).toBe(true);
    });

    it('falls back to getIdToken when waitForToken is absent (older AuthService)', async () => {
        globalThis.AuthService = { getIdToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 200, ok: true, json: async () => ({ allow: true, remaining: 5, premium: false }),
        });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
    });
});
