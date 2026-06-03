import { describe, it, expect } from 'vitest';
import {
    normalizeCode,
    isValidCodeFormat,
    pairIdFor,
    codeExpired,
    buildPairPrompt,
    mergeSeenIds,
} from '../src/lib/pairing-core.js';

describe('pairing-core — Pair Mode pure logic (Phase 05-04)', () => {
    describe('normalizeCode', () => {
        it('uppercases and strips spaces/dashes', () => {
            expect(normalizeCode(' a1b2c3 ')).toBe('A1B2C3');
            expect(normalizeCode('a1b-2c3')).toBe('A1B2C3');
        });
        it('returns empty for nullish', () => {
            expect(normalizeCode(null)).toBe('');
        });
    });

    describe('isValidCodeFormat', () => {
        it('accepts a 6-char alphanumeric code', () => {
            expect(isValidCodeFormat('A1B2C3')).toBe(true);
        });
        it('rejects wrong length or symbols', () => {
            expect(isValidCodeFormat('A1B2C')).toBe(false);
            expect(isValidCodeFormat('A1B2C3D')).toBe(false);
            expect(isValidCodeFormat('A1B2C!')).toBe(false);
        });
    });

    describe('pairIdFor', () => {
        it('is deterministic and order-independent (same id for either ordering)', () => {
            expect(pairIdFor('uidB', 'uidA')).toBe(pairIdFor('uidA', 'uidB'));
        });
        it('joins the two uids sorted', () => {
            expect(pairIdFor('uidA', 'uidB')).toBe('uidA__uidB');
        });
    });

    describe('codeExpired', () => {
        const TTL = 10 * 60 * 1000;
        it('is false within the TTL', () => {
            expect(codeExpired({ createdAt: 1000 }, 1000 + TTL - 1, TTL)).toBe(false);
        });
        it('is true after the TTL', () => {
            expect(codeExpired({ createdAt: 1000 }, 1000 + TTL + 1, TTL)).toBe(true);
        });
        it('treats a missing record as expired', () => {
            expect(codeExpired(null, 5000, TTL)).toBe(true);
        });
    });

    describe('mergeSeenIds', () => {
        it('unions two seen sets as strings', () => {
            const out = mergeSeenIds(['1', 2], [2, '3']);
            expect(out.has('1')).toBe(true);
            expect(out.has('2')).toBe(true);
            expect(out.has('3')).toBe(true);
            expect(out.size).toBe(3);
        });
    });

    describe('buildPairPrompt', () => {
        it('asks for titles neither has seen and both would enjoy', () => {
            const p = buildPairPrompt(
                { likedTitles: ['Heat'], ratedTitles: [] },
                { likedTitles: ['Amelie'], ratedTitles: [] },
                'en',
            );
            expect(p).toMatch(/both/i);
            expect(p).toContain('Heat');
            expect(p).toContain('Amelie');
        });
        it('adds a Turkish directive for tr', () => {
            const p = buildPairPrompt({ likedTitles: [] }, { likedTitles: [] }, 'tr');
            expect(p).toMatch(/Turkish/);
        });
    });
});
