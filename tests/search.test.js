/**
 * LUMI - Search Feature Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import search module functions
import {
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
    removeFromSearchHistory,
} from '../src/features/search.js';

describe('Search Feature', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('Search History', () => {
        it('should return empty array when no history', () => {
            const history = getSearchHistory();
            expect(history).toEqual([]);
        });

        it('should add query to history', () => {
            addToSearchHistory('test query');

            const history = getSearchHistory();
            expect(history.length).toBe(1);
            expect(history[0]).toBe('test query');
        });

        it('should add new queries to beginning', () => {
            addToSearchHistory('first');
            addToSearchHistory('second');
            addToSearchHistory('third');

            const history = getSearchHistory();
            expect(history[0]).toBe('third');
            expect(history[1]).toBe('second');
            expect(history[2]).toBe('first');
        });

        it('should not add duplicate queries (case insensitive)', () => {
            addToSearchHistory('Test');
            addToSearchHistory('test');
            addToSearchHistory('TEST');

            const history = getSearchHistory();
            expect(history.length).toBe(1);
            expect(history[0]).toBe('TEST');
        });

        it('should limit history to 10 items', () => {
            for (let i = 0; i < 15; i++) {
                addToSearchHistory(`query ${i}`);
            }

            const history = getSearchHistory();
            expect(history.length).toBe(10);
            expect(history[0]).toBe('query 14');
        });

        it('should not add queries shorter than 2 chars', () => {
            addToSearchHistory('a');
            addToSearchHistory('');

            const history = getSearchHistory();
            expect(history.length).toBe(0);
        });

        it('should clear all history', () => {
            addToSearchHistory('one');
            addToSearchHistory('two');
            addToSearchHistory('three');

            clearSearchHistory();

            const history = getSearchHistory();
            expect(history.length).toBe(0);
        });

        it('should remove specific query from history', () => {
            addToSearchHistory('apple');
            addToSearchHistory('banana');
            addToSearchHistory('cherry');

            removeFromSearchHistory('banana');

            const history = getSearchHistory();
            expect(history.length).toBe(2);
            expect(history).not.toContain('banana');
            expect(history).toContain('apple');
            expect(history).toContain('cherry');
        });

        it('should remove query case insensitively', () => {
            addToSearchHistory('Apple');
            removeFromSearchHistory('apple');

            const history = getSearchHistory();
            expect(history.length).toBe(0);
        });
    });
});
