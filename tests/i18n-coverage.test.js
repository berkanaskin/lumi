/**
 * i18n keyset-coverage test.
 *
 * Guarantees EN ⊇ TR: every Turkish translation key must also exist in the
 * English dictionary. This protects against the "raw camelCase leak" failure
 * mode where the fallback chain ends up returning the raw key for non-TR
 * users because EN forgot the key.
 *
 * Failure message lists ALL missing keys (not just first) so contributors
 * see the full picture in one CI run.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_SRC = readFileSync(resolve(__dirname, '../public/i18n.js'), 'utf8');

function loadI18n() {
    const fakeWindow = {};
    const fakeDocument = { querySelectorAll: () => [], title: '' };
    const factory = new Function('window', 'document', 'localStorage', `
        ${I18N_SRC}
        return i18n;
    `);
    return factory(fakeWindow, fakeDocument, globalThis.localStorage);
}

describe('i18n keyset coverage', () => {
    const i18n = loadI18n();
    const trKeys = Object.keys(i18n.translations.tr);
    const enKeys = new Set(Object.keys(i18n.translations.en));

    it('every TR key has an EN counterpart (EN ⊇ TR)', () => {
        const missing = trKeys.filter(k => !enKeys.has(k));
        // Assert with a readable failure message listing ALL missing keys.
        expect(missing, `Missing EN translations for TR keys: ${missing.join(', ')}`)
            .toEqual([]);
    });

    it('EN dictionary has at least as many keys as TR', () => {
        expect(Object.keys(i18n.translations.en).length)
            .toBeGreaterThanOrEqual(trKeys.length);
    });

    it('stub language buckets exist for es/fr/de/ja/ko (so setLanguage does not crash)', () => {
        for (const lang of ['es', 'fr', 'de', 'ja', 'ko']) {
            expect(i18n.translations[lang], `translations.${lang} should be defined`).toBeDefined();
            expect(typeof i18n.translations[lang]).toBe('object');
        }
    });
});
