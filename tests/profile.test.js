/**
 * LUMI - Profile Feature Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import profile module functions
import {
    getUserStats,
    getUserRatings,
    saveUserRating,
    getUserRating,
} from '../src/features/profile.js';

describe('Profile Feature', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('getUserStats', () => {
        it('should return zero counts when no data', () => {
            const stats = getUserStats();

            expect(stats.favoritesCount).toBe(0);
            expect(stats.ratingsCount).toBe(0);
            expect(stats.watchlistCount).toBe(0);
            expect(stats.likedCount).toBe(0);
        });

        it('should count favorites correctly', () => {
            localStorage.setItem('favorites', JSON.stringify([
                { id: 1, title: 'Movie 1' },
                { id: 2, title: 'Movie 2' },
            ]));

            const stats = getUserStats();
            expect(stats.favoritesCount).toBe(2);
        });

        it('should count watchlist correctly', () => {
            localStorage.setItem('watchlist_items', JSON.stringify([
                { id: 1 }, { id: 2 }, { id: 3 },
            ]));

            const stats = getUserStats();
            expect(stats.watchlistCount).toBe(3);
        });

        it('should count ratings correctly', () => {
            localStorage.setItem('userRatings', JSON.stringify({
                'movie_123': { value: 8, title: 'Test Movie' },
                'tv_456': { value: 9, title: 'Test Show' },
            }));

            const stats = getUserStats();
            expect(stats.ratingsCount).toBe(2);
        });
    });

    describe('User Ratings', () => {
        it('should save and retrieve rating', () => {
            saveUserRating('movie', '123', 8.5, 'Test Movie');

            const rating = getUserRating('movie', '123');
            expect(rating).toBe(8.5);
        });

        it('should return undefined for non-existent rating', () => {
            const rating = getUserRating('movie', '999');
            expect(rating).toBeUndefined();
        });

        it('should get all user ratings', () => {
            saveUserRating('movie', '123', 8, 'Movie A');
            saveUserRating('tv', '456', 9, 'TV Show B');

            const ratings = getUserRatings();
            expect(ratings.length).toBe(2);
            expect(ratings[0].type).toBe('movie');
            expect(ratings[0].rating).toBe(8);
            expect(ratings[1].type).toBe('tv');
            expect(ratings[1].rating).toBe(9);
        });

        it('should overwrite existing rating', () => {
            saveUserRating('movie', '123', 7, 'Test Movie');
            saveUserRating('movie', '123', 9, 'Test Movie');

            const rating = getUserRating('movie', '123');
            expect(rating).toBe(9);
        });

        it('should handle legacy rating format (number only)', () => {
            localStorage.setItem('userRatings', JSON.stringify({
                'movie_123': 7.5,
            }));

            const rating = getUserRating('movie', '123');
            expect(rating).toBe(7.5);
        });
    });
});
