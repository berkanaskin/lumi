import { describe, it, expect } from 'vitest';
import { evaluateQuota } from '../src/lib/usage.js';

/**
 * The server gate decision is a pure function so it is fully testable without
 * spinning up Edge/Firestore. api/gemini.js wires (verify token → read count →
 * evaluateQuota → increment-or-429) around this.
 */
describe('evaluateQuota — server gate decision (pure)', () => {
    it('allows a premium user regardless of count (uncapped)', () => {
        const r = evaluateQuota({ premium: true, count: 999 });
        expect(r.allow).toBe(true);
        expect(r.status).toBe(200);
        expect(r.premium).toBe(true);
    });

    it('allows a free user below the limit and reports remaining', () => {
        const r = evaluateQuota({ premium: false, count: 2 });
        expect(r.allow).toBe(true);
        expect(r.status).toBe(200);
        expect(r.remaining).toBe(3); // before this query is counted
    });

    it('allows the 5th (last free) query', () => {
        const r = evaluateQuota({ premium: false, count: 4 });
        expect(r.allow).toBe(true);
        expect(r.remaining).toBe(1);
    });

    it('blocks the 6th free query with a 429 quota_exceeded shape', () => {
        const r = evaluateQuota({ premium: false, count: 5 });
        expect(r.allow).toBe(false);
        expect(r.status).toBe(429);
        expect(r.error).toBe('quota_exceeded');
        expect(r.remaining).toBe(0);
    });

    it('treats a missing count as a fresh day (0 used)', () => {
        const r = evaluateQuota({ premium: false, count: undefined });
        expect(r.allow).toBe(true);
        expect(r.remaining).toBe(5);
    });

    it('defaults premium to false when omitted', () => {
        const r = evaluateQuota({ count: 5 });
        expect(r.allow).toBe(false);
        expect(r.status).toBe(429);
    });
});
