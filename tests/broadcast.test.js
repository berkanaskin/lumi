/**
 * LUMI - Broadcast Module Tests (Phase 04-05)
 *
 * Covers:
 *   - isActivelyAiring() detection across TV status combinations
 *   - getNetworkLogoPath() TR overlay vs TMDB passthrough
 *   - formatNextEpisode() Intl date / relative-date formatting
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
    isActivelyAiring,
    getNetworkLogoPath,
    formatNextEpisode,
    pickBroadcastNetwork,
} from '../src/lib/broadcast.js';

import returningFixture from './fixtures/tmdb-tv-returning-series.json';
import endedFixture from './fixtures/tmdb-tv-ended.json';

describe('broadcast', () => {

    describe('isActivelyAiring', () => {
        it('returns true for Returning Series with null next_episode_to_air', () => {
            expect(isActivelyAiring({ status: 'Returning Series', next_episode_to_air: null })).toBe(true);
        });

        it('returns false for Ended with null next_episode_to_air', () => {
            expect(isActivelyAiring({ status: 'Ended', next_episode_to_air: null })).toBe(false);
        });

        it('returns true for Ended with concrete next_episode_to_air (special/reunion)', () => {
            expect(isActivelyAiring({
                status: 'Ended',
                next_episode_to_air: { air_date: '2026-06-01', season_number: 1, episode_number: 1 }
            })).toBe(true);
        });

        it('returns false for Canceled with null next_episode_to_air', () => {
            expect(isActivelyAiring({ status: 'Canceled', next_episode_to_air: null })).toBe(false);
        });

        it('returns false for movies regardless of fields', () => {
            expect(isActivelyAiring({ title: 'Inception', status: 'Released' })).toBe(false);
            expect(isActivelyAiring({ media_type: 'movie', status: 'Returning Series' })).toBe(false);
        });

        it('returns false for null / undefined details', () => {
            expect(isActivelyAiring(null)).toBe(false);
            expect(isActivelyAiring(undefined)).toBe(false);
        });

        it('returns true on returning-series fixture, false on ended fixture', () => {
            expect(isActivelyAiring(returningFixture)).toBe(true);
            expect(isActivelyAiring(endedFixture)).toBe(false);
        });
    });

    describe('getNetworkLogoPath', () => {
        it('returns local PNG path for TR network by TMDB ID', () => {
            expect(getNetworkLogoPath({ id: 1280, name: 'Show TV', logo_path: '/x.png' }))
                .toBe('/img/networks/showtv.png');
        });

        it('returns TMDB URL for non-TR network (CBS)', () => {
            expect(getNetworkLogoPath({ id: 16, name: 'CBS', logo_path: '/y.png' }))
                .toBe('https://image.tmdb.org/t/p/w92/y.png');
        });

        it('falls back to byName lookup when TMDB ID mismatched', () => {
            expect(getNetworkLogoPath({ id: 9999, name: 'Show TV', logo_path: '/z.png' }))
                .toBe('/img/networks/showtv.png');
        });

        it('resolves TRT via specialEntries (TRT 1, TRT 2, TRT)', () => {
            expect(getNetworkLogoPath({ id: 9001, name: 'TRT 1', logo_path: '/t1.png' }))
                .toBe('/img/networks/trt.png');
            expect(getNetworkLogoPath({ id: 9002, name: 'TRT 2', logo_path: '/t2.png' }))
                .toBe('/img/networks/trt.png');
        });

        it('returns empty string when no overlay and no logo_path', () => {
            expect(getNetworkLogoPath({ id: 9999, name: 'Unknown', logo_path: null })).toBe('');
        });

        it('handles null / undefined network gracefully', () => {
            expect(getNetworkLogoPath(null)).toBe('');
            expect(getNetworkLogoPath(undefined)).toBe('');
        });
    });

    describe('formatNextEpisode', () => {
        // Anchor "now" to 2026-05-12 so the test is deterministic.
        beforeAll(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-05-12T12:00:00Z'));
        });

        afterAll(() => {
            vi.useRealTimers();
        });

        it('formats a future episode in Turkish (3 days ahead)', () => {
            const out = formatNextEpisode(
                { air_date: '2026-05-15', season_number: 5, episode_number: 12 },
                'tr'
            );
            expect(out.label).toBe('S5 E12');
            expect(out.relative).toMatch(/3 gün|3 günden/);
            // Intl absolute should contain the day "15"
            expect(out.absolute).toMatch(/15/);
        });

        it('formats a future episode in English (in 3 days)', () => {
            const out = formatNextEpisode(
                { air_date: '2026-05-15', season_number: 5, episode_number: 12 },
                'en'
            );
            expect(out.label).toBe('S5 E12');
            expect(out.relative).toMatch(/in 3 days/i);
            expect(out.absolute).toMatch(/15/);
        });

        it('returns empty strings for null nextEp', () => {
            const out = formatNextEpisode(null, 'tr');
            expect(out.relative).toBe('');
            expect(out.absolute).toBe('');
            expect(out.label).toBe('');
        });

        it('returns empty strings when air_date is missing', () => {
            const out = formatNextEpisode({ season_number: 1, episode_number: 1 }, 'tr');
            expect(out.relative).toBe('');
            expect(out.absolute).toBe('');
        });
    });

    describe('pickBroadcastNetwork — bölge kuralı (05.5 Epix fix)', () => {
        const MGM_PLUS = { id: 6219, name: 'MGM+', origin_country: 'US', logo_path: '/mgm.png' };
        const SHOW_TV = { id: 1280, name: 'Show TV', origin_country: 'TR', logo_path: '/show.png' };

        it('TR kullanıcısına yabancı kanal GÖSTERMEZ (From/Epix vakası)', () => {
            expect(pickBroadcastNetwork([MGM_PLUS], 'TR')).toBeNull();
        });

        it('kullanıcının ülkesiyle eşleşen kanalı seçer', () => {
            expect(pickBroadcastNetwork([MGM_PLUS], 'US')).toBe(MGM_PLUS);
            expect(pickBroadcastNetwork([MGM_PLUS, SHOW_TV], 'TR')).toBe(SHOW_TV);
        });

        it('ülke eşleşmese de küratörlü katalogdaki kanalı kabul eder', () => {
            expect(pickBroadcastNetwork([SHOW_TV], undefined)).toBe(SHOW_TV);
            expect(pickBroadcastNetwork([{ id: 99999, name: 'show tv' }], 'DE')).toBeTruthy();
        });

        it('boş/anlamsız girişte null döner', () => {
            expect(pickBroadcastNetwork([], 'TR')).toBeNull();
            expect(pickBroadcastNetwork(null, 'TR')).toBeNull();
            expect(pickBroadcastNetwork([MGM_PLUS], undefined)).toBeNull();
        });
    });

});
