/**
 * LUMI - Detail Feature Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import detail module functions
import {
    mergeVideos,
    toggleLike,
    toggleWatchlist,
    toggleFavorite,
    updateStarDisplay,
} from '../src/features/detail.js';

describe('Detail Feature', () => {
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('mergeVideos', () => {
        it('should merge TMDB videos with YouTube videos', () => {
            const tmdbVideos = [
                { key: 'abc123', name: 'Official Trailer' },
                { key: 'def456', name: 'Teaser' },
            ];

            const youtubeVideos = [
                { id: { videoId: 'ghi789' }, snippet: { title: 'Review' } },
            ];

            const merged = mergeVideos(tmdbVideos, youtubeVideos);

            expect(merged.length).toBe(3);
            expect(merged[0].id.videoId).toBe('abc123');
            expect(merged[0].isOfficial).toBe(true);
            expect(merged[2].id.videoId).toBe('ghi789');
        });

        it('should avoid duplicate video IDs', () => {
            const tmdbVideos = [
                { key: 'abc123', name: 'Official Trailer' },
            ];

            const youtubeVideos = [
                { id: { videoId: 'abc123' }, snippet: { title: 'Same Video' } },
            ];

            const merged = mergeVideos(tmdbVideos, youtubeVideos);

            expect(merged.length).toBe(1);
        });

        it('should handle null youtube videos', () => {
            const tmdbVideos = [
                { key: 'abc123', name: 'Official Trailer' },
            ];

            const merged = mergeVideos(tmdbVideos, null);

            expect(merged.length).toBe(1);
        });
    });

    describe('toggleLike', () => {
        it('should add item to liked list', () => {
            const isLiked = toggleLike(123, 'movie', 'Test Movie', '/poster.jpg', 8.5, '2023-01-01');

            expect(isLiked).toBe(true);

            const likedItems = JSON.parse(localStorage.getItem('liked_items'));
            expect(likedItems.length).toBe(1);
            expect(likedItems[0].id).toBe(123);
            expect(likedItems[0].title).toBe('Test Movie');
        });

        it('should remove item from liked list if already liked', () => {
            // First like
            toggleLike(123, 'movie', 'Test Movie', '/poster.jpg', 8.5, '2023-01-01');

            // Second like (unlike)
            const isLiked = toggleLike(123, 'movie', 'Test Movie', '/poster.jpg', 8.5, '2023-01-01');

            expect(isLiked).toBe(false);

            const likedItems = JSON.parse(localStorage.getItem('liked_items'));
            expect(likedItems.length).toBe(0);
        });
    });

    describe('toggleWatchlist', () => {
        it('should add item to watchlist', () => {
            const isInWatchlist = toggleWatchlist(456, 'tv', 'Test Show', '/poster.jpg', 9.0, '2023-06-15');

            expect(isInWatchlist).toBe(true);

            const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items'));
            expect(watchlistItems.length).toBe(1);
            expect(watchlistItems[0].id).toBe(456);
            expect(watchlistItems[0].media_type).toBe('tv');
        });

        it('should remove item from watchlist if already in list', () => {
            toggleWatchlist(456, 'tv', 'Test Show', '/poster.jpg', 9.0, '2023-06-15');
            const isInWatchlist = toggleWatchlist(456, 'tv', 'Test Show', '/poster.jpg', 9.0, '2023-06-15');

            expect(isInWatchlist).toBe(false);
        });
    });

    describe('toggleFavorite', () => {
        it('should add to favorites', () => {
            const details = {
                id: 789,
                title: 'Favorite Movie',
                poster_path: '/poster.jpg',
                vote_average: 8.0,
                release_date: '2023-12-01',
            };

            toggleFavorite(details, 'movie');

            const favorites = JSON.parse(localStorage.getItem('favorites'));
            expect(favorites.length).toBe(1);
            expect(favorites[0].id).toBe(789);
        });

        it('should remove from favorites if already added', () => {
            const details = {
                id: 789,
                title: 'Favorite Movie',
                poster_path: '/poster.jpg',
                vote_average: 8.0,
                release_date: '2023-12-01',
            };

            toggleFavorite(details, 'movie');
            toggleFavorite(details, 'movie');

            const favorites = JSON.parse(localStorage.getItem('favorites'));
            expect(favorites.length).toBe(0);
        });
    });

    describe('updateStarDisplay', () => {
        it('should update star classes based on rating', () => {
            // Create mock star-like objects with classList
            const createMockStar = (value, halfLeft) => ({
                dataset: { value: String(value), halfLeft: String(halfLeft) },
                classList: {
                    _classes: new Set(),
                    add(c) { this._classes.add(c); },
                    remove(c) { this._classes.delete(c); },
                    contains(c) { return this._classes.has(c); },
                },
            });

            const stars = [
                createMockStar(1, 0.5),
                createMockStar(2, 1.5),
                createMockStar(3, 2.5),
            ];

            // Rate 2.5 - should have 2 full and 1 half
            updateStarDisplay(stars, 2.5);

            expect(stars[0].classList.contains('full')).toBe(true);
            expect(stars[1].classList.contains('full')).toBe(true);
            expect(stars[2].classList.contains('half')).toBe(true);
        });

        it('should set all empty for 0 rating', () => {
            const createMockStar = (value, halfLeft) => ({
                dataset: { value: String(value), halfLeft: String(halfLeft) },
                classList: {
                    _classes: new Set(),
                    add(c) { this._classes.add(c); },
                    remove(c) { this._classes.delete(c); },
                    contains(c) { return this._classes.has(c); },
                },
            });

            const stars = [
                createMockStar(1, 0.5),
                createMockStar(2, 1.5),
            ];

            updateStarDisplay(stars, 0);

            expect(stars[0].classList.contains('empty')).toBe(true);
            expect(stars[1].classList.contains('empty')).toBe(true);
        });
    });
});
