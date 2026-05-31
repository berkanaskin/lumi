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

    it('fails open when there is no AuthService / no token (guest before anon ready)', async () => {
        globalThis.AuthService = { getIdToken: async () => null };
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.degraded).toBe(true);
    });

    it('blocks ONLY on an explicit 429', async () => {
        globalThis.AuthService = { getIdToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 429, ok: false });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(true);
    });

    it('allows and surfaces remaining on a 200 response', async () => {
        globalThis.AuthService = { getIdToken: async () => 'tok' };
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

    it('fails open on a non-429 server error (e.g. 503 degraded)', async () => {
        globalThis.AuthService = { getIdToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 503, ok: false });
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.degraded).toBe(true);
    });

    it('fails open when fetch itself throws (network down)', async () => {
        globalThis.AuthService = { getIdToken: async () => 'tok' };
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
        const r = await consumeAiQuota();
        expect(r.blocked).toBe(false);
        expect(r.degraded).toBe(true);
    });
});
