/**
 * i18n fallback chain tests.
 *
 * public/i18n.js is a browser-only script (declares `const i18n = {...}` and
 * assigns `window.i18n = i18n` at the bottom). We load the source file as
 * text and evaluate it inside a fresh `Function` scope with a fake `window`,
 * then return the local `i18n` binding. This isolates each test from cross-
 * pollution and avoids the module-cache fight that would happen with import().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_SRC = readFileSync(resolve(__dirname, '../public/i18n.js'), 'utf8');

function loadI18n() {
    // Evaluate the source in an isolated scope. Provide a fake `window` and
    // `document` (the latter is only touched by updateTranslations() which we
    // never call in these unit tests).
    const fakeWindow = {};
    const fakeDocument = {
        querySelectorAll: () => [],
        title: '',
    };
    // The file ends with `window.i18n = i18n;` — we wrap and return the local.
    const factory = new Function('window', 'document', 'localStorage', `
        ${I18N_SRC}
        return i18n;
    `);
    return factory(fakeWindow, fakeDocument, globalThis.localStorage);
}

describe('i18n.t() fallback chain', () => {
    let i18n;
    beforeEach(() => {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        i18n = loadI18n();
    });

    it('returns TR value when currentLang=tr and key exists in TR', () => {
        i18n.currentLang = 'tr';
        // 'appTitle' exists in both TR and EN — TR should win
        expect(i18n.t('appTitle')).toBe('Nerede İzlerim?');
    });

    it('falls back to EN when key missing in currentLang but present in EN', () => {
        // Add a temporary EN-only key
        i18n.translations.en.__test_only_en__ = 'English Only';
        i18n.currentLang = 'tr';
        expect(i18n.t('__test_only_en__')).toBe('English Only');
    });

    it('returns the raw key when the key exists nowhere', () => {
        i18n.currentLang = 'tr';
        expect(i18n.t('nonexistentKey_xyz_123')).toBe('nonexistentKey_xyz_123');
    });

    it('falls back to EN for stub languages (es) when key is missing locally', () => {
        i18n.currentLang = 'es';
        // 'appTitle' exists in EN; ES dict has it too in this project — pick a
        // key we know does NOT exist in ES: noResults is ES-translated, but
        // 'navHome' may not be — instead, force a guaranteed gap.
        i18n.translations.es = { someEsKey: 'sólo es' };
        i18n.currentLang = 'es';
        // 'appTitle' is in EN but not in our stripped ES dict → EN fallback.
        expect(i18n.t('appTitle')).toBe('Where to Watch?');
        // Sanity: ES-local hit returns its own value
        expect(i18n.t('someEsKey')).toBe('sólo es');
    });

    it('setLanguage("en-US") normalizes to "en"', () => {
        const ok = i18n.setLanguage('en-US');
        expect(ok).toBe(true);
        expect(i18n.currentLang).toBe('en');
    });

    it('default currentLang is "en" when no localStorage override is loaded', () => {
        // Fresh load (beforeEach already cleared localStorage and re-loaded).
        expect(i18n.currentLang).toBe('en');
    });
});
