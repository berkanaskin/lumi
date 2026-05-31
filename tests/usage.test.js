import { describe, it, expect } from 'vitest';
import {
    FREE_DAILY_LIMIT,
    localDateKey,
    remainingQuota,
    isOverQuota,
} from '../src/lib/usage.js';

describe('usage — free-tier quota logic (pure)', () => {
    describe('FREE_DAILY_LIMIT', () => {
        it('is 5 per the locked pricing decision', () => {
            expect(FREE_DAILY_LIMIT).toBe(5);
        });
    });

    describe('localDateKey(tz, now)', () => {
        // 2026-05-31T22:30:00Z — already 2026-06-01 in Istanbul (+03), still 2026-05-31 in LA (-07)
        const instant = Date.parse('2026-05-31T22:30:00Z');

        it('returns YYYY-MM-DD format', () => {
            expect(localDateKey('UTC', instant)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('rolls to the next local day for a positive-offset tz', () => {
            expect(localDateKey('Europe/Istanbul', instant)).toBe('2026-06-01');
        });

        it('stays on the prior local day for a negative-offset tz', () => {
            expect(localDateKey('America/Los_Angeles', instant)).toBe('2026-05-31');
        });

        it('uses UTC as the value at the instant for UTC tz', () => {
            expect(localDateKey('UTC', instant)).toBe('2026-05-31');
        });

        it('falls back to UTC for an invalid/missing tz instead of throwing', () => {
            expect(localDateKey('Not/AZone', instant)).toBe('2026-05-31');
            expect(localDateKey(undefined, instant)).toBe('2026-05-31');
        });
    });

    describe('remainingQuota(count, limit)', () => {
        it('returns the full limit at zero usage', () => {
            expect(remainingQuota(0)).toBe(5);
        });
        it('decrements with usage', () => {
            expect(remainingQuota(2)).toBe(3);
        });
        it('clamps to 0 and never goes negative', () => {
            expect(remainingQuota(5)).toBe(0);
            expect(remainingQuota(9)).toBe(0);
        });
        it('treats nullish/garbage counts as 0', () => {
            expect(remainingQuota(undefined)).toBe(5);
            expect(remainingQuota(null)).toBe(5);
            expect(remainingQuota('x')).toBe(5);
        });
    });

    describe('isOverQuota(count, limit)', () => {
        it('is false below the limit', () => {
            expect(isOverQuota(4)).toBe(false);
        });
        it('is true at the limit (the 6th query is blocked)', () => {
            expect(isOverQuota(5)).toBe(true);
        });
        it('is true beyond the limit', () => {
            expect(isOverQuota(6)).toBe(true);
        });
    });
});
