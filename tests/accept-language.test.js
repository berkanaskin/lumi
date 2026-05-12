/**
 * Accept-Language parser tests (Phase 04-02 Task 1).
 *
 * Backend endpoints rely on this to pick a language when the request body
 * does not carry an explicit `lang`. Must be defensive: never throw, always
 * return an array, sort by q descending.
 */

import { describe, it, expect } from 'vitest';
import { parseAcceptLanguage } from '../src/lib/locale.js';

describe('parseAcceptLanguage', () => {
    it('parses standard header sorted by q descending', () => {
        const out = parseAcceptLanguage('en-US,en;q=0.9,tr;q=0.8');
        expect(out).toEqual([
            { tag: 'en-US', q: 1 },
            { tag: 'en', q: 0.9 },
            { tag: 'tr', q: 0.8 },
        ]);
    });

    it('returns [] for null', () => {
        expect(parseAcceptLanguage(null)).toEqual([]);
    });

    it('returns [] for undefined', () => {
        expect(parseAcceptLanguage(undefined)).toEqual([]);
    });

    it('returns [] for empty string', () => {
        expect(parseAcceptLanguage('')).toEqual([]);
    });

    it('returns [] for non-string input (number)', () => {
        expect(parseAcceptLanguage(42)).toEqual([]);
    });

    it('tolerates whitespace around entries', () => {
        const out = parseAcceptLanguage('  fr-FR ,  fr;q=0.7  ');
        expect(out).toEqual([
            { tag: 'fr-FR', q: 1 },
            { tag: 'fr', q: 0.7 },
        ]);
    });

    it('missing q defaults to 1.0', () => {
        const out = parseAcceptLanguage('de');
        expect(out).toEqual([{ tag: 'de', q: 1 }]);
    });

    it('malformed q coerced to 0 (sorted to end)', () => {
        const out = parseAcceptLanguage('en,de;q=NaN,fr;q=0.5');
        // en (1) > fr (0.5) > de (0)
        expect(out[0].tag).toBe('en');
        expect(out[1].tag).toBe('fr');
        expect(out[2].tag).toBe('de');
        expect(out[2].q).toBe(0);
    });

    it('handles a single tag with q', () => {
        expect(parseAcceptLanguage('ja;q=0.5')).toEqual([{ tag: 'ja', q: 0.5 }]);
    });

    it('preserves region subtags', () => {
        const out = parseAcceptLanguage('zh-Hans-CN,en;q=0.1');
        expect(out[0].tag).toBe('zh-Hans-CN');
    });
});
