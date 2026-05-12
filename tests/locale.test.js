/**
 * Locale resolution tests (Phase 04-02 Task 1).
 *
 * Mocks `localStorage` and `navigator.language` to exercise the full
 * fallback chain in resolveLocaleSync() and the merge semantics of setLocale().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    resolveLocaleSync,
    getLocale,
    setLocale,
    SUPPORTED_LANGS,
    LANG_TO_COUNTRY,
    COUNTRY_TO_LANG,
} from '../src/lib/locale.js';

function mockStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
}

beforeEach(() => {
    // Clean slate for every test. The module is pure (no module-scoped state),
    // so we only need to reset the environment it reads from.
    globalThis.localStorage = mockStorage();
    delete globalThis.navigator;
    delete globalThis.window;
});

describe('resolveLocaleSync — fallback chain', () => {
    it('returns default {en,US,default} when nothing is set', () => {
        expect(resolveLocaleSync()).toEqual({ lang: 'en', country: 'US', source: 'default' });
    });

    it('uses navigator.language="tr-TR" → {tr,TR,navigator}', () => {
        globalThis.navigator = { language: 'tr-TR' };
        expect(resolveLocaleSync()).toEqual({ lang: 'tr', country: 'TR', source: 'navigator' });
    });

    it('handles complex tag navigator.language="zh-Hans-CN" → lang:zh', () => {
        globalThis.navigator = { language: 'zh-Hans-CN' };
        const r = resolveLocaleSync();
        expect(r.lang).toBe('zh');
        expect(r.country).toBe('CN');
        expect(r.source).toBe('navigator');
    });

    it('navigator.language with unsupported lang ("xx-YY") falls to "en" lang, country preserved', () => {
        globalThis.navigator = { language: 'xx-YY' };
        const r = resolveLocaleSync();
        expect(r.lang).toBe('en');
        expect(r.country).toBe('YY');
    });

    it('stored lumi_locale beats navigator.language', () => {
        globalThis.navigator = { language: 'tr-TR' };
        globalThis.localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'en', country: 'US' }));
        expect(resolveLocaleSync()).toEqual({ lang: 'en', country: 'US', source: 'stored' });
    });

    it('legacy appLanguage migration: appLanguage="tr" → {tr,TR,migrated}', () => {
        globalThis.localStorage.setItem('appLanguage', 'tr');
        expect(resolveLocaleSync()).toEqual({ lang: 'tr', country: 'TR', source: 'migrated' });
    });

    it('malformed stored JSON does NOT throw — falls through to navigator/default', () => {
        globalThis.localStorage.setItem('lumi_locale', '{not json');
        globalThis.navigator = { language: 'fr-FR' };
        const r = resolveLocaleSync();
        expect(r.lang).toBe('fr');
        expect(r.source).toBe('navigator');
    });
});

describe('setLocale — merge + persist', () => {
    it('setLocale({lang:"tr"}) writes lumi_locale AND legacy appLanguage', () => {
        const result = setLocale({ lang: 'tr' });
        expect(result.lang).toBe('tr');
        expect(result.source).toBe('user');
        const stored = JSON.parse(globalThis.localStorage.getItem('lumi_locale'));
        expect(stored.lang).toBe('tr');
        expect(globalThis.localStorage.getItem('appLanguage')).toBe('tr');
    });

    it('setLocale({country:"DE"}) preserves existing lang', () => {
        globalThis.localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'en', country: 'US' }));
        const result = setLocale({ country: 'DE' });
        expect(result).toMatchObject({ lang: 'en', country: 'DE', source: 'user' });
    });

    it('setLocale notifies window.i18n.setLanguage if present', () => {
        let captured = null;
        globalThis.window = { i18n: { setLanguage: (l) => { captured = l; } } };
        setLocale({ lang: 'de' });
        expect(captured).toBe('de');
    });
});

describe('getLocale alias', () => {
    it('getLocale() returns the same shape as resolveLocaleSync()', () => {
        globalThis.navigator = { language: 'ko-KR' };
        expect(getLocale()).toEqual(resolveLocaleSync());
    });
});

describe('LANG_TO_COUNTRY / COUNTRY_TO_LANG sanity', () => {
    it('all SUPPORTED_LANGS have a LANG_TO_COUNTRY mapping', () => {
        for (const lang of SUPPORTED_LANGS) {
            expect(LANG_TO_COUNTRY[lang]).toBeDefined();
        }
    });

    it('TR → tr (round trip)', () => {
        expect(LANG_TO_COUNTRY.tr).toBe('TR');
        expect(COUNTRY_TO_LANG.TR).toBe('tr');
    });
});
