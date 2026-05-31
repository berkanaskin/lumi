import { describe, it, expect, beforeEach } from 'vitest';
import { getSeenSet, getWatchlistIds, isSeen, idFromRatingKey, getTasteProfile } from '../src/lib/seen.js';

describe('seen — derived "seen" set + taste profile (Phase 05-03)', () => {
    beforeEach(() => localStorage.clear());

    describe('idFromRatingKey', () => {
        it('extracts the trailing numeric id from typed keys', () => {
            expect(idFromRatingKey('movie_603')).toBe('603');
            expect(idFromRatingKey('tv_1399')).toBe('1399');
        });
        it('passes through a bare numeric key', () => {
            expect(idFromRatingKey('550')).toBe('550');
        });
    });

    describe('getSeenSet', () => {
        it('is empty with no data', () => {
            expect(getSeenSet().size).toBe(0);
        });
        it('includes rated titles (rated = seen)', () => {
            localStorage.setItem('userRatings', JSON.stringify({ movie_603: { value: 5, title: 'The Matrix' }, tv_1399: { value: 4, title: 'GoT' } }));
            const s = getSeenSet();
            expect(s.has('603')).toBe(true);
            expect(s.has('1399')).toBe(true);
        });
        it('includes liked titles (liked = seen)', () => {
            localStorage.setItem('liked_items', JSON.stringify([{ id: 550, title: 'Fight Club' }]));
            expect(getSeenSet().has('550')).toBe(true);
        });
        it('is the UNION of rated and liked', () => {
            localStorage.setItem('userRatings', JSON.stringify({ movie_603: { value: 5, title: 'M' } }));
            localStorage.setItem('liked_items', JSON.stringify([{ id: 550, title: 'FC' }]));
            const s = getSeenSet();
            expect(s.has('603')).toBe(true);
            expect(s.has('550')).toBe(true);
            expect(s.size).toBe(2);
        });
        it('does NOT count watchlist items as seen', () => {
            localStorage.setItem('watchlist_items', JSON.stringify([{ id: 999, title: 'Want' }]));
            expect(getSeenSet().has('999')).toBe(false);
            expect(getWatchlistIds().has('999')).toBe(true);
        });
    });

    describe('isSeen', () => {
        it('matches regardless of number/string id', () => {
            localStorage.setItem('liked_items', JSON.stringify([{ id: 550, title: 'FC' }]));
            expect(isSeen(550)).toBe(true);
            expect(isSeen('550')).toBe(true);
            expect(isSeen(123)).toBe(false);
        });
    });

    describe('getTasteProfile', () => {
        it('summarizes liked + rated + watchlist titles', () => {
            localStorage.setItem('liked_items', JSON.stringify([{ id: 550, title: 'Fight Club' }]));
            localStorage.setItem('userRatings', JSON.stringify({ movie_603: { value: 5, title: 'The Matrix' } }));
            localStorage.setItem('watchlist_items', JSON.stringify([{ id: 999, title: 'Dune' }]));
            const p = getTasteProfile();
            expect(p.likedTitles).toContain('Fight Club');
            expect(p.ratedTitles).toContain('The Matrix');
            expect(p.watchlistTitles).toContain('Dune');
            expect(p.seenCount).toBe(2);
        });
    });
});
