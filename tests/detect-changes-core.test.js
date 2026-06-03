import { describe, it, expect } from 'vitest';
import {
    NOTIF_TYPES,
    groupItemsByRegionType,
    detectPlatformGain,
    detectEpisodeChange,
    buildPlatformChangeEvent,
    buildNewEpisodeEvent,
} from '../src/lib/detect-changes-core.js';

describe('detect-changes-core — pure detection logic (Phase 05-05)', () => {
    describe('groupItemsByRegionType', () => {
        it('groups watchlist items into (country, movie|series) buckets', () => {
            const items = [
                { id: 1, media_type: 'movie' },
                { id: 2, media_type: 'tv' },
                { id: 3, media_type: 'movie' },
            ];
            const groups = groupItemsByRegionType(items, 'tr');
            expect(groups['tr:movie'].map((i) => i.id).sort()).toEqual([1, 3]);
            expect(groups['tr:series'].map((i) => i.id)).toEqual([2]);
        });
        it('treats missing media_type as movie', () => {
            const groups = groupItemsByRegionType([{ id: 9 }], 'us');
            expect(groups['us:movie']).toHaveLength(1);
        });
    });

    describe('detectPlatformGain', () => {
        it('fires only when a NEW service appears vs the prior snapshot', () => {
            const ev = detectPlatformGain(['netflix'], new Set(['netflix', 'disney']), { id: 5, title: 'X' }, 'tr');
            expect(ev).toBeTruthy();
            expect(ev.type).toBe(NOTIF_TYPES.PLATFORM);
            expect(ev.payload.service).toBe('disney');
        });
        it('is silent when the set is unchanged', () => {
            expect(detectPlatformGain(['netflix'], new Set(['netflix']), { id: 5 }, 'tr')).toBeNull();
        });
        it('is silent when a service is LOST (we only notify on gains)', () => {
            expect(detectPlatformGain(['netflix', 'disney'], new Set(['netflix']), { id: 5 }, 'tr')).toBeNull();
        });
        it('seeds silently on first run (no prior snapshot → null, never a storm)', () => {
            expect(detectPlatformGain(null, new Set(['netflix']), { id: 5 }, 'tr')).toBeNull();
            expect(detectPlatformGain(undefined, new Set(['netflix']), { id: 5 }, 'tr')).toBeNull();
        });
        it('reports the FIRST newly-gained service in the payload', () => {
            const ev = detectPlatformGain([], new Set(['hbo']), { id: 1, title: 'T' }, 'us');
            // empty prior array is a real prior snapshot (seen before, had nothing) → gain fires
            expect(ev).toBeTruthy();
            expect(ev.payload.service).toBe('hbo');
        });
    });

    describe('detectEpisodeChange', () => {
        it('fires when next_episode_to_air gains a new air_date', () => {
            const ev = detectEpisodeChange(null, { air_date: '2026-06-10', episode_number: 3, season_number: 2 }, { id: 7, title: 'Show' });
            // first-seen with an actual upcoming episode → seed silently
            expect(ev).toBeNull();
        });
        it('fires when the air_date CHANGES from a known prior', () => {
            const ev = detectEpisodeChange({ airDate: '2026-06-03' }, { air_date: '2026-06-10', episode_number: 4, season_number: 2 }, { id: 7, title: 'Show' });
            expect(ev).toBeTruthy();
            expect(ev.type).toBe(NOTIF_TYPES.EPISODE);
            expect(ev.payload.airDate).toBe('2026-06-10');
        });
        it('is silent when air_date is unchanged', () => {
            expect(detectEpisodeChange({ airDate: '2026-06-10' }, { air_date: '2026-06-10' }, { id: 7 })).toBeNull();
        });
        it('is silent when there is no upcoming episode', () => {
            expect(detectEpisodeChange({ airDate: '2026-06-10' }, null, { id: 7 })).toBeNull();
        });
    });

    describe('event builders produce the Phase-6 push schema', () => {
        it('platform event has type/title/body/payload/read/source', () => {
            const ev = buildPlatformChangeEvent({ id: 5, title: 'Dune', media_type: 'movie' }, 'netflix', 'tr');
            expect(ev).toMatchObject({
                type: NOTIF_TYPES.PLATFORM,
                read: false,
                source: 'detect-changes',
            });
            expect(ev.title).toBeTruthy();
            expect(ev.body).toContain('Dune');
            expect(ev.payload).toMatchObject({ tmdbId: 5, mediaType: 'movie', service: 'netflix' });
        });
        it('episode event references the title + air date', () => {
            const ev = buildNewEpisodeEvent({ id: 7, title: 'Severance' }, { air_date: '2026-06-10', season_number: 2, episode_number: 4 }, 'en');
            expect(ev.type).toBe(NOTIF_TYPES.EPISODE);
            expect(ev.body).toContain('Severance');
            expect(ev.payload).toMatchObject({ tmdbId: 7, airDate: '2026-06-10' });
        });
    });
});
