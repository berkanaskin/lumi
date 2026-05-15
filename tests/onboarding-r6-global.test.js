// @vitest-environment jsdom
/**
 * Phase 04-04-r6 — Global-first onboarding tests
 *
 *  1. Locale defaults to EN unless navigator.language is clearly Turkish.
 *  2. Non-Turkish navigator (e.g. de-DE, ja-JP) still boots in EN.
 *  3. Allowlist expansion: UK gets BBC/BritBox/NOW; DE gets WOW/Joyn;
 *     JP gets U-NEXT/Coupang(?); KR gets Wavve/TVING — without losing the
 *     universal trio (Netflix/Disney+/Prime).
 *  4. S1 Welcome uses the new top-left wordmark bar (no centered tagline).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveLocaleSync } from '../src/lib/locale.js';
import { _getAllowlistForCountry } from '../src/features/onboarding.js';

describe('04-04-r6 — EN-first locale default', () => {
    let origNavigator;
    let origLocalStorage;

    beforeEach(() => {
        origNavigator = global.navigator;
        origLocalStorage = global.localStorage;
        // Clean localStorage so the stored/legacy branches don't short-circuit.
        const store = new Map();
        global.localStorage = {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
            clear: () => store.clear(),
        };
    });
    afterEach(() => {
        global.navigator = origNavigator;
        global.localStorage = origLocalStorage;
    });

    function setNav(language) {
        global.navigator = { language };
    }

    it('returns EN/US when navigator is missing', () => {
        global.navigator = undefined;
        const r = resolveLocaleSync();
        expect(r.lang).toBe('en');
        expect(r.country).toBe('US');
    });

    it('returns EN even when navigator is de-DE', () => {
        setNav('de-DE');
        const r = resolveLocaleSync();
        expect(r.lang).toBe('en');
        expect(r.country).toBe('DE'); // region remembered for provider hints
    });

    it('returns EN even when navigator is ja-JP', () => {
        setNav('ja-JP');
        expect(resolveLocaleSync().lang).toBe('en');
    });

    it('returns EN even when navigator is ko-KR', () => {
        setNav('ko-KR');
        expect(resolveLocaleSync().lang).toBe('en');
    });

    it('returns TR only when navigator is clearly Turkish (tr-TR)', () => {
        setNav('tr-TR');
        const r = resolveLocaleSync();
        expect(r.lang).toBe('tr');
        expect(r.country).toBe('TR');
    });

    it('returns TR for bare "tr" tag', () => {
        setNav('tr');
        expect(resolveLocaleSync().lang).toBe('tr');
    });
});

describe('04-04-r6 — Regional provider allowlist deltas', () => {
    it('UK allowlist includes Netflix/Disney+/Prime + BritBox/NOW TV/ITVX', () => {
        const ids = _getAllowlistForCountry('UK');
        expect(ids).toContain(8);    // Netflix
        expect(ids).toContain(337);  // Disney+
        expect(ids).toContain(119);  // Prime
        expect(ids).toContain(38);   // BritBox
        expect(ids).toContain(39);   // NOW TV
        expect(ids).toContain(1796); // ITVX
    });

    it('GB alias resolves the same as UK', () => {
        const ids = _getAllowlistForCountry('GB');
        expect(ids).toContain(38);   // BritBox
        expect(ids).toContain(39);   // NOW TV
    });

    it('DE allowlist includes WOW + Joyn + RTL+ + Magenta TV', () => {
        // 04-04-r7: TMDB-verified IDs — Joyn=178, RTL+=298. Test asserts the
        // r7 set: 298 RTL+, 178 Joyn, 29 WOW, 532 Magenta TV.
        const ids = _getAllowlistForCountry('DE');
        expect(ids).toContain(298);  // RTL+
        expect(ids).toContain(178);  // Joyn
        expect(ids).toContain(29);   // WOW
        expect(ids).toContain(532);  // Magenta TV
    });

    it('JP allowlist includes U-NEXT / DAZN / Hulu JP', () => {
        const ids = _getAllowlistForCountry('JP');
        expect(ids).toContain(84);   // U-NEXT
        expect(ids).toContain(191);  // Hulu Japan
        expect(ids).toContain(1882); // DAZN
    });

    it('KR allowlist includes Wavve / TVING / Coupang Play', () => {
        const ids = _getAllowlistForCountry('KR');
        expect(ids).toContain(356);  // Wavve
        expect(ids).toContain(1947); // TVING
        expect(ids).toContain(97);   // Coupang Play
    });

    it('US allowlist does NOT promote 1968 (Gain is TR-only)', () => {
        const ids = _getAllowlistForCountry('US');
        expect(ids).not.toContain(1968);
    });

    it('AU allowlist uses Binge/Stan, NOT 1968 (Foxtel ambiguity)', () => {
        const ids = _getAllowlistForCountry('AU');
        expect(ids).toContain(87);   // Binge
        expect(ids).toContain(132);  // Stan
        expect(ids).not.toContain(1968);
    });

    it('unknown country falls back to universal-only', () => {
        const ids = _getAllowlistForCountry('ZZ');
        // Should equal the 13 universal IDs.
        expect(ids).toContain(8);
        expect(ids.length).toBe(13);
    });
});

// Note: S1 Welcome DOM (wordmark bar + poster trio) is covered by
// tests/onboarding-r5-welcome-country.test.js — that test now asserts the
// r6 structure (.onb-wordmark-bar, .onb-poster-trio × 3, no .onb-tagline).
