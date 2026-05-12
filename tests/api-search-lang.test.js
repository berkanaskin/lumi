/**
 * api/search.js language plumbing tests.
 *
 * Verifies the resolveLang allow-list + BCP_47 mapping that backs the
 * `lang` param on /api/search, /api/tmdb, /api/gemini. These are pure
 * unit tests — no HTTP, no Gemini, no TMDB calls.
 */

import { describe, it, expect } from 'vitest';
import { BCP_47, LANG_NAME, resolveLang } from '../api/search.js';

describe('resolveLang allow-list', () => {
    it('accepts a valid 2-letter code (en)', () => {
        expect(resolveLang('en')).toBe('en');
    });

    it('accepts a valid 2-letter code (tr)', () => {
        expect(resolveLang('tr')).toBe('tr');
    });

    it('normalizes BCP 47 input (en-US) to 2-letter (en)', () => {
        expect(resolveLang('en-US')).toBe('en');
    });

    it('normalizes BCP 47 input (tr-TR) to 2-letter (tr)', () => {
        expect(resolveLang('tr-TR')).toBe('tr');
    });

    it('falls back to "en" for an invalid code', () => {
        expect(resolveLang('xx')).toBe('en');
    });

    it('falls back to "en" for undefined input', () => {
        expect(resolveLang(undefined)).toBe('en');
    });

    it('falls back to "en" for non-string input', () => {
        expect(resolveLang(null)).toBe('en');
        expect(resolveLang(42)).toBe('en');
        expect(resolveLang({})).toBe('en');
    });
});

describe('BCP_47 mapping', () => {
    it('maps tr -> tr-TR', () => {
        expect(BCP_47.tr).toBe('tr-TR');
    });

    it('maps en -> en-US', () => {
        expect(BCP_47.en).toBe('en-US');
    });

    it('maps de -> de-DE', () => {
        expect(BCP_47.de).toBe('de-DE');
    });

    it('maps fr -> fr-FR', () => {
        expect(BCP_47.fr).toBe('fr-FR');
    });

    it('maps es -> es-ES', () => {
        expect(BCP_47.es).toBe('es-ES');
    });

    it('maps ja, ko, zh', () => {
        expect(BCP_47.ja).toBe('ja-JP');
        expect(BCP_47.ko).toBe('ko-KR');
        expect(BCP_47.zh).toBe('zh-CN');
    });

    it('covers all 8 i18n languages', () => {
        // Phase 04 launch languages: en, tr, de, fr, es, ja, ko, zh.
        const expected = ['en', 'tr', 'de', 'fr', 'es', 'ja', 'ko', 'zh'].sort();
        expect(Object.keys(BCP_47).sort()).toEqual(expected);
    });
});

describe('LANG_NAME map (Gemini prompt prefix)', () => {
    it('has a display name for every BCP_47 entry', () => {
        for (const code of Object.keys(BCP_47)) {
            expect(LANG_NAME[code], `Missing LANG_NAME for ${code}`).toBeTypeOf('string');
            expect(LANG_NAME[code].length).toBeGreaterThan(0);
        }
    });

    it('uses native names (Turkish "Türkçe", Japanese "日本語", etc.)', () => {
        expect(LANG_NAME.tr).toBe('Türkçe');
        expect(LANG_NAME.ja).toBe('日本語');
        expect(LANG_NAME.ko).toBe('한국어');
    });
});
