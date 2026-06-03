import { describe, it, expect } from 'vitest';
import {
    localHour,
    isEveningBucket,
    selectEveningUsers,
    parseEveningTitles,
    buildEveningPickEvent,
    localDateKey,
} from '../src/lib/evening-core.js';

describe('evening-core — tz-bucketed Evening Assistant logic (Phase 05-05)', () => {
    // 2026-06-04T17:00:00Z → 20:00 in Istanbul (+03), 13:00 in New York (-04), 02:00 next day Tokyo (+09)
    const at1700Z = Date.parse('2026-06-04T17:00:00Z');

    describe('localHour', () => {
        it('returns the local hour for a tz', () => {
            expect(localHour('Europe/Istanbul', at1700Z)).toBe(20);
            expect(localHour('America/New_York', at1700Z)).toBe(13);
            expect(localHour('Asia/Tokyo', at1700Z)).toBe(2);
        });
        it('falls back to UTC hour for an invalid tz', () => {
            expect(localHour('Not/AZone', at1700Z)).toBe(17);
        });
    });

    describe('isEveningBucket', () => {
        it('is true only at local 20:00', () => {
            expect(isEveningBucket('Europe/Istanbul', at1700Z)).toBe(true);
            expect(isEveningBucket('America/New_York', at1700Z)).toBe(false);
        });
    });

    describe('selectEveningUsers', () => {
        it('selects only users whose local time is 20:00 now', () => {
            const users = [
                { uid: 'a', tz: 'Europe/Istanbul' },
                { uid: 'b', tz: 'America/New_York' },
                { uid: 'c', tz: 'Asia/Tokyo' },
                { uid: 'd' }, // no tz → defaults UTC (17:00) → not selected
            ];
            const sel = selectEveningUsers(users, at1700Z);
            expect(sel.map((u) => u.uid)).toEqual(['a']);
        });
        it('skips a user already served today (idempotency)', () => {
            const today = localDateKey('Europe/Istanbul', at1700Z);
            const users = [
                { uid: 'a', tz: 'Europe/Istanbul', lastEveningPick: today },
                { uid: 'e', tz: 'Europe/Istanbul' },
            ];
            const sel = selectEveningUsers(users, at1700Z);
            expect(sel.map((u) => u.uid)).toEqual(['e']);
        });
    });

    describe('parseEveningTitles', () => {
        it('extracts exactly 3 titles from a numbered list', () => {
            const text = '1. The Bear\n2. Past Lives\n3. Aftersun\n4. Extra';
            expect(parseEveningTitles(text)).toEqual(['The Bear', 'Past Lives', 'Aftersun']);
        });
        it('handles bullet / dash lists', () => {
            expect(parseEveningTitles('- A\n- B\n- C')).toEqual(['A', 'B', 'C']);
        });
        it('strips year/parenthetical noise but keeps the title', () => {
            const out = parseEveningTitles('1. Dune (2021)\n2. Sicario\n3. Arrival');
            expect(out[0]).toMatch(/Dune/);
            expect(out).toHaveLength(3);
        });
        it('returns fewer than 3 gracefully if the model gives less', () => {
            expect(parseEveningTitles('1. Only One')).toEqual(['Only One']);
        });
    });

    describe('buildEveningPickEvent', () => {
        it('produces the evening push schema with picks[]', () => {
            const ev = buildEveningPickEvent(['A', 'B', 'C'], 'tr');
            expect(ev.type).toBe('evening_pick');
            expect(ev.read).toBe(false);
            expect(ev.source).toBe('evening-assistant');
            expect(ev.payload.picks).toEqual(['A', 'B', 'C']);
            expect(ev.title).toBeTruthy();
        });
    });
});
