import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inferTimeOfDay, buildDecidePrompt, MOODS, runDecide } from '../src/features/decide-for-me.js';

describe('decide-for-me — pure logic (Phase 05-03)', () => {
    describe('inferTimeOfDay', () => {
        const at = (h, day = 3) => { const d = new Date(2026, 5, day, h, 0, 0); return d; };
        it('classifies the slots', () => {
            expect(inferTimeOfDay(at(8)).slot).toBe('morning');
            expect(inferTimeOfDay(at(14)).slot).toBe('afternoon');
            expect(inferTimeOfDay(at(20)).slot).toBe('evening');
            expect(inferTimeOfDay(at(2)).slot).toBe('lateNight');
        });
        it('flags weekends (Sat/Sun)', () => {
            // 2026-06-06 is a Saturday, 2026-06-03 a Wednesday
            expect(inferTimeOfDay(new Date(2026, 5, 6, 20)).isWeekend).toBe(true);
            expect(inferTimeOfDay(new Date(2026, 5, 3, 20)).isWeekend).toBe(false);
        });
    });

    describe('MOODS', () => {
        it('offers a small set of mood chips with keys + labels', () => {
            expect(MOODS.length).toBeGreaterThanOrEqual(4);
            for (const m of MOODS) {
                expect(m.key).toBeTruthy();
                expect(m.tr).toBeTruthy();
                expect(m.en).toBeTruthy();
            }
        });
    });

    describe('buildDecidePrompt', () => {
        const time = { slot: 'evening', isWeekend: true };
        it('always asks for exactly one pick', () => {
            const p = buildDecidePrompt({ time });
            expect(p).toMatch(/EXACTLY ONE/i);
        });
        it('encodes mood when given', () => {
            const p = buildDecidePrompt({ mood: 'cozy', time });
            expect(p.toLowerCase()).toContain('cozy');
        });
        it('omits mood cleanly when not given', () => {
            const p = buildDecidePrompt({ time });
            expect(p).not.toMatch(/Mood:/);
        });
        it('includes taste titles and owned platforms when present', () => {
            const p = buildDecidePrompt({
                taste: { likedTitles: ['Fight Club'], ratedTitles: ['The Matrix'] },
                ownedPlatforms: ['Netflix', 'Disney+'],
                time,
            });
            expect(p).toContain('Fight Club');
            expect(p).toContain('Netflix');
        });
        it('adds a Turkish response directive for tr', () => {
            const p = buildDecidePrompt({ time, lang: 'tr' });
            expect(p).toMatch(/Turkish/);
        });
        it('reflects the weekend + evening context', () => {
            const p = buildDecidePrompt({ time });
            expect(p.toLowerCase()).toContain('weekend');
            expect(p.toLowerCase()).toContain('evening');
        });
    });

    describe('runDecide quota gate (05-final defense-in-depth)', () => {
        beforeEach(() => { globalThis.window = globalThis; });
        afterEach(() => { vi.restoreAllMocks(); delete globalThis.AuthService; delete globalThis.fetch; });

        it('returns a blocked sentinel when the quota gate blocks (no AI search runs)', async () => {
            // waitForToken → token, /api/quota → 429
            globalThis.AuthService = { waitForToken: async () => 'tok', currentUser: { uid: 'u' } };
            globalThis.fetch = vi.fn().mockResolvedValue({ status: 429, ok: false });
            const r = await runDecide({ mood: null });
            expect(r).toEqual({ blocked: true, reason: 'quota' });
        });

        it('blocks with reason auth when no token is available', async () => {
            globalThis.AuthService = { waitForToken: async () => null };
            const r = await runDecide({ mood: null });
            expect(r).toMatchObject({ blocked: true, reason: 'auth' });
        });
    });
});
