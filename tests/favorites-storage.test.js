/**
 * LUMI - Favorites Storage Tests
 *
 * Tests the localStorage key contract for liked/watchlist items
 * and the one-time legacy migration ("favorites" -> "liked_items",
 * "watchlist" -> "watchlist_items").
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadFavoritesItems } from '../src/features/favorites-storage.js';

describe('favorites-storage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('loadFavoritesItems("liked")', () => {
        it('returns items written to "liked_items" with poster_path and media_type', () => {
            const item = {
                id: 603,
                media_type: 'movie',
                poster_path: '/matrix.jpg',
                title: 'The Matrix',
                added_at: 1700000000000,
            };
            localStorage.setItem('liked_items', JSON.stringify([item]));

            const items = loadFavoritesItems('liked');

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe(603);
            expect(items[0].poster_path).toBe('/matrix.jpg');
            expect(items[0].media_type).toBe('movie');
        });

        it('migrates legacy "favorites" key into "liked_items" and removes legacy key', () => {
            const legacy = [
                { id: 1, media_type: 'movie', poster_path: '/a.jpg', title: 'A' },
            ];
            const current = [
                { id: 2, media_type: 'movie', poster_path: '/b.jpg', title: 'B' },
            ];
            localStorage.setItem('favorites', JSON.stringify(legacy));
            localStorage.setItem('liked_items', JSON.stringify(current));

            const items = loadFavoritesItems('liked');

            // Both items returned
            expect(items).toHaveLength(2);
            expect(items.map(i => i.id).sort()).toEqual([1, 2]);
            // Legacy key removed
            expect(localStorage.getItem('favorites')).toBeNull();
            // New key contains the merged set
            const stored = JSON.parse(localStorage.getItem('liked_items'));
            expect(stored.map(i => i.id).sort()).toEqual([1, 2]);
        });

        it('de-duplicates by id when legacy and new key contain the same id', () => {
            const legacy = [
                { id: 42, media_type: 'movie', poster_path: '/old.jpg', title: 'Dup' },
            ];
            const current = [
                { id: 42, media_type: 'movie', poster_path: '/new.jpg', title: 'Dup' },
            ];
            localStorage.setItem('favorites', JSON.stringify(legacy));
            localStorage.setItem('liked_items', JSON.stringify(current));

            const items = loadFavoritesItems('liked');

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe(42);
            // The "current" item (in liked_items first) should be preserved as-is.
            expect(items[0].poster_path).toBe('/new.jpg');
            expect(localStorage.getItem('favorites')).toBeNull();
        });
    });

    describe('loadFavoritesItems("watched")', () => {
        it('returns items written to "watchlist_items"', () => {
            const item = {
                id: 11,
                media_type: 'tv',
                poster_path: '/show.jpg',
                title: 'Show',
            };
            localStorage.setItem('watchlist_items', JSON.stringify([item]));

            const items = loadFavoritesItems('watched');

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe(11);
            expect(items[0].media_type).toBe('tv');
        });

        it('migrates legacy "watchlist" key into "watchlist_items" and removes legacy key', () => {
            const legacy = [
                { id: 7, media_type: 'tv', poster_path: '/legacy.jpg', title: 'Legacy' },
            ];
            localStorage.setItem('watchlist', JSON.stringify(legacy));

            const items = loadFavoritesItems('watched');

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe(7);
            expect(localStorage.getItem('watchlist')).toBeNull();
            const stored = JSON.parse(localStorage.getItem('watchlist_items'));
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe(7);
        });
    });

    describe('empty / corrupt storage', () => {
        it('returns [] when both keys are empty', () => {
            expect(loadFavoritesItems('liked')).toEqual([]);
            expect(loadFavoritesItems('watched')).toEqual([]);
        });

        it('returns [] when storage contains corrupt JSON', () => {
            localStorage.setItem('liked_items', '{not-json');
            localStorage.setItem('favorites', '[[[[');
            expect(loadFavoritesItems('liked')).toEqual([]);
        });
    });
});
