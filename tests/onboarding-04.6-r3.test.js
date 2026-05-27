/**
 * Phase 04.6-r7 — Wholesale mockup port (vision-glassmorphic).
 *
 * Architecture (locked at r7):
 *   - 4 slides: Welcome → Platforms → Premium → Ready
 *   - DOM uses mockup vocab: .wall .orb .stage .top .dots .progress-line .slides .slide .footer .cta
 *   - Inline locale picker: .loc-card chips inside .loc-hero .glass on S1
 *   - Footer (.footer / [data-testid="onb-deck-footer"]) hosts primary CTAs
 *   - Swipe handler excludes .loc-card / .loc-list / .plat-grid / .psq-grid / .recap
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

let startOnboarding;
let origDocument, origWindow, origRAF, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origRAF = global.requestAnimationFrame;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    global.requestAnimationFrame = dom.window.requestAnimationFrame
        || ((cb) => setTimeout(cb, 0));
    global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
    }));

    vi.resetModules();
    const mod = await import('../src/features/onboarding.js');
    startOnboarding = mod.startOnboarding;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.requestAnimationFrame = origRAF;
    global.localStorage = origLocalStorage;
});

describe('04.6-r7 — Wordmark text (no image)', () => {
    it('wordmark renders as <div class="wordmark"> with LUMI text', () => {
        startOnboarding();
        const w = document.querySelector('.wordmark');
        expect(w).toBeTruthy();
        expect(w.textContent.replace(/\s+/g, '')).toBe('LUMI');
    });

    it('does NOT render an <img> wordmark anywhere in the wizard', () => {
        startOnboarding();
        expect(document.querySelector('img.onb-wordmark-img')).toBeFalsy();
        expect(document.querySelector('[data-testid="onb-logo-img"]')).toBeFalsy();
    });
});

describe('04.6-r7 — Inline locale picker (mockup .loc-card)', () => {
    it('lang + country chips are inside the welcome slide locale hero', () => {
        startOnboarding();
        const welcome = document.querySelector('.onb-slide-welcome');
        expect(welcome).toBeTruthy();
        const container = welcome.querySelector('.loc-hero, [data-testid="onb-detection-banner"]');
        expect(container).toBeTruthy();
        expect(container.querySelector('[data-testid="onb-locale-chip-lang"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="onb-locale-chip-country"]')).toBeTruthy();
    });

    it('no #onb-locale-picker bottom-sheet ever appears on click', async () => {
        startOnboarding();
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        langChip.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(document.getElementById('onb-locale-picker')).toBeFalsy();
        expect(document.querySelector('.onb-picker-backdrop')).toBeFalsy();
    });

    it('tap lang chip → aria-expanded=true + list visible inline', async () => {
        startOnboarding();
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        expect(langChip.getAttribute('aria-expanded')).toBe('false');
        langChip.click();
        await new Promise((r) => setTimeout(r, 10));
        expect(langChip.getAttribute('aria-expanded')).toBe('true');
        const panel = document.querySelector('[data-testid="onb-locale-panel-lang"]');
        expect(panel.children.length).toBeGreaterThan(0);
    });

    it('pick a value → list collapses + chip label updates', async () => {
        startOnboarding();
        const langChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        langChip.click();
        await new Promise((r) => setTimeout(r, 10));
        const deOpt = document.querySelector('[data-testid="onb-locale-panel-lang"] [data-lang="de"]');
        expect(deOpt).toBeTruthy();
        deOpt.click();
        await new Promise((r) => setTimeout(r, 20));
        // After re-render the chip reflects the new value.
        const updatedChip = document.querySelector('[data-testid="onb-locale-chip-lang"]');
        expect(updatedChip.textContent).toMatch(/Deutsch/);
    });

    it('swipe touchstart on inline chip does NOT advance the slide', () => {
        startOnboarding();
        const before = window.__onbState().slide;
        const chip = document.querySelector('.loc-card');
        expect(chip).toBeTruthy();
        // Simulate a tap-then-swipe that originates on the chip.
        const touch = { clientX: 100, clientY: 200 };
        const start = new window.TouchEvent('touchstart', { bubbles: true, touches: [touch], targetTouches: [touch] });
        const end = new window.TouchEvent('touchend', { bubbles: true, changedTouches: [{ clientX: -100, clientY: 200 }] });
        chip.dispatchEvent(start);
        chip.dispatchEvent(end);
        expect(window.__onbState().slide).toBe(before);
    });
});

describe('04.6-r7 — Footer CTA always visible at every slide', () => {
    it('every slide has an advancing CTA (footer for S1/S2/S3/S4)', async () => {
        startOnboarding();
        for (const n of [0, 1, 2, 3]) {
            window.__onbGoto(n);
            await new Promise((r) => setTimeout(r, 20));
            const footer = document.querySelector('[data-testid="onb-deck-footer"]');
            expect(footer, `footer host missing on slide ${n}`).toBeTruthy();
            if (n === 2) {
                const premiumCta = document.querySelector('[data-testid="onb-premium-cta"]');
                const premiumSkip = document.querySelector('[data-testid="onb-premium-skip"]');
                expect(premiumCta, 'Premium CTA missing on S3').toBeTruthy();
                expect(premiumSkip, 'Premium skip ghost missing on S3').toBeTruthy();
            } else {
                const cta = footer.querySelector('.cta');
                expect(cta, `footer .cta missing on slide ${n}`).toBeTruthy();
            }
        }
    });

    it('tap final CTA on S4 → writes lumi_onboarding_seen=true and removes root', async () => {
        startOnboarding();
        window.__onbGoto(3);
        await new Promise((r) => setTimeout(r, 20));
        const cta = document.querySelector('[data-testid="onb-deck-footer"] [data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        cta.click();
        await new Promise((r) => setTimeout(r, 800));
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        expect(document.getElementById('onboarding-root')).toBeNull();
    });
});

describe('04.6-r7 — 4-slide enum (not 6, not 5)', () => {
    it('total is 4 in window.__onbState', () => {
        startOnboarding();
        expect(window.__onbState().total).toBe(4);
    });

    it('exactly 4 dots rendered', () => {
        startOnboarding();
        expect(document.querySelectorAll('.dots .dot').length).toBe(4);
    });
});

describe('04.6-r7 — TR locale renders Turkish strings', () => {
    it('TR locale shows several Turkish strings (not EN fallback)', async () => {
        localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'tr', country: 'TR' }));
        window.i18n = {
            currentLang: 'tr',
            translations: {
                tr: {
                    'onboarding.welcome.title': 'Bu akşam ne izlesek?',
                    'onboarding.welcome.cta': 'Sahneyi Hazırla',
                    'onboarding.platforms.title': 'Hangi platformların var?',
                    'onboarding.platforms.sub': 'Birden fazla seçebilirsin.',
                    'onboarding.platforms.skipForNow': 'Daha sonra eklerim →',
                    'onboarding.next': 'Devam',
                    'onboarding.premium.cta': 'Sahneyi Hazırla',
                    'onboarding.ready.cta': "Lumi'yi keşfet",
                },
            },
            t(key) { return this.translations.tr[key] || key; },
        };
        startOnboarding();
        await new Promise((r) => setTimeout(r, 20));

        const seen = new Set();
        const allStrings = [
            'Sahneyi Hazırla',
            'Daha sonra eklerim →',
            'Devam',
            "Lumi'yi keşfet",
        ];
        for (const n of [0, 1, 2, 3]) {
            window.__onbGoto(n);
            await new Promise((r) => setTimeout(r, 20));
            const txt = document.body.textContent;
            for (const tr of allStrings) {
                if (txt.includes(tr)) seen.add(tr);
            }
        }
        expect(seen.size).toBeGreaterThanOrEqual(3);
    });
});

describe('04.6-r7 — Logo asset sanity (Gain/MUBI/Tabii)', () => {
    it('Gain, MUBI, Tabii logo files exist and are non-trivial', () => {
        for (const slug of ['gain', 'mubi', 'tabii']) {
            const png = path.resolve(process.cwd(), `public/img/providers/${slug}.png`);
            const svg = path.resolve(process.cwd(), `public/img/providers/${slug}.svg`);
            const found = fs.existsSync(png) || fs.existsSync(svg);
            expect(found, `${slug} logo missing`).toBe(true);
            const file = fs.existsSync(png) ? png : svg;
            expect(fs.statSync(file).size, `${slug} logo too small`).toBeGreaterThan(200);
        }
    });
});
