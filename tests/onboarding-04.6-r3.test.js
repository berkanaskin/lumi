/**
 * Phase 04.6-r3 — Swipe-deck rebuild integration tests.
 *
 * Architecture summary (locked):
 *   - 4 slides: Welcome → Platforms → Premium → Ready
 *   - CSS-text wordmark <span class="onb-wordmark">LUMI</span> (no <img>)
 *   - Inline locale picker: lang + country chips in normal flow (no modal sheet)
 *   - Always-visible footer band (.onb-deck__footer) — primary CTAs portal there
 *   - Swipe handler excludes inline picker (no accidental advance on chip tap)
 *
 * These tests assert the contract of the locked architecture. Future
 * changes touching any of these surfaces must update both the source and
 * the corresponding test below — no silent drift.
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

describe('04.6-r3 — CSS-text wordmark (no image)', () => {
    it('wordmark renders as <span class="onb-wordmark">LUMI</span>', () => {
        startOnboarding();
        const w = document.querySelector('[data-testid="onb-wordmark"]');
        expect(w).toBeTruthy();
        expect(w.tagName.toLowerCase()).toBe('span');
        expect(w.classList.contains('onb-wordmark')).toBe(true);
        expect(w.textContent.trim()).toBe('LUMI');
    });

    it('does NOT render an <img> wordmark anywhere in the wizard', () => {
        startOnboarding();
        expect(document.querySelector('img.onb-wordmark-img')).toBeFalsy();
        expect(document.querySelector('[data-testid="onb-logo-img"]')).toBeFalsy();
    });
});

describe('04.6-r3 — Inline locale picker (no floating sheet)', () => {
    it('lang + country chips are direct descendants of the welcome slide', () => {
        startOnboarding();
        const welcome = document.querySelector('.onb-slide-welcome');
        expect(welcome).toBeTruthy();
        const container = welcome.querySelector('.onb-locale-inline');
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
        const chip = document.querySelector('.onb-locale-chip-wrap');
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

describe('04.6-r3 — Footer CTA always visible at every slide', () => {
    it('every slide has an advancing CTA (footer for S1/S2/S4, inline Premium CTA for S3)', async () => {
        // 04.6-r5 — S3 (Premium) owns its own inline CTA instead of portaling
        // to the footer. The footer host stays present (empty), and the slide
        // exposes the gradient "Premium'u Dene" button + ghost "Şimdilik geç".
        startOnboarding();
        for (const n of [0, 1, 2, 3]) {
            window.__onbGoto(n);
            await new Promise((r) => setTimeout(r, 20));
            const footer = document.querySelector('.onb-deck__footer');
            expect(footer, `footer host missing on slide ${n}`).toBeTruthy();
            if (n === 2) {
                // S3: inline Premium CTA + ghost skip live inside the slide.
                const premiumCta = document.querySelector('[data-testid="onb-premium-cta"]');
                const premiumSkip = document.querySelector('[data-testid="onb-premium-skip"]');
                expect(premiumCta, 'inline Premium CTA missing on S3').toBeTruthy();
                expect(premiumSkip, 'inline Premium skip ghost missing on S3').toBeTruthy();
            } else {
                const cta = footer.querySelector('.onb-cta');
                expect(cta, `footer .onb-cta missing on slide ${n}`).toBeTruthy();
            }
        }
    });

    it('tap final CTA on S4 → writes lumi_onboarding_seen=true and removes root', async () => {
        startOnboarding();
        window.__onbGoto(3);
        await new Promise((r) => setTimeout(r, 20));
        const cta = document.querySelector('.onb-deck__footer [data-testid="onb-ready-cta"]');
        expect(cta).toBeTruthy();
        cta.click();
        await new Promise((r) => setTimeout(r, 800));
        expect(localStorage.getItem('lumi_onboarding_seen')).toBe('true');
        expect(document.getElementById('onboarding-root')).toBeNull();
    });
});

describe('04.6-r3 — 4-slide enum (not 6, not 5)', () => {
    it('SLIDE_TOTAL is 4 in window.__onbState', () => {
        startOnboarding();
        expect(window.__onbState().total).toBe(4);
    });

    it('exactly 4 pills rendered', () => {
        startOnboarding();
        expect(document.querySelectorAll('.onb-pill').length).toBe(4);
    });
});

describe('04.6-r3 — TR locale renders Turkish strings', () => {
    it('TR locale shows 8+ Turkish strings (not EN fallback)', async () => {
        // Seed TR locale and load the i18n bundle that the wizard reads.
        localStorage.setItem('lumi_locale', JSON.stringify({ lang: 'tr', country: 'TR' }));
        // Mock minimal window.i18n with TR keys from public/i18n.js so the
        // onboarding t() helper resolves Turkish (without booting full i18n).
        window.i18n = {
            currentLang: 'tr',
            translations: {
                tr: {
                    'onboarding.welcome.title': 'Bu akşam ne izlesek?',
                    'onboarding.welcome.cta': 'Sahneyi hazırla',
                    'onboarding.platforms.title': 'Hangi platformların var?',
                    'onboarding.platforms.sub': 'Birden fazla seçebilirsin.',
                    'onboarding.platforms.skipForNow': 'Daha sonra eklerim',
                    'onboarding.next': 'Devam',
                    'onboarding.premium.title': 'Lumi Premium',
                    'onboarding.premium.sub': 'Film Gecesi Asistanın',
                    'onboarding.premium.cta': "Premium'u dene",
                    'onboarding.ready.title': 'Hazırız.',
                    'onboarding.ready.sub': 'Sana özel seçimler hazır.',
                    'onboarding.ready.cta': "Lumi'yi keşfet",
                },
            },
            t(key) { return this.translations.tr[key] || key; },
        };
        startOnboarding();
        await new Promise((r) => setTimeout(r, 20));

        // Walk all 4 slides and collect Turkish strings.
        const seen = new Set();
        const allStrings = [
            'Sahneyi hazırla',
            'Hangi platformların var?',
            'Birden fazla seçebilirsin.',
            'Daha sonra eklerim',
            'Devam',
            'Lumi Premium',
            'Film Gecesi Asistanın',
            "Premium'u dene",
            'Hazırız.',
            'Sana özel seçimler hazır.',
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
        expect(seen.size).toBeGreaterThanOrEqual(8);
    });
});

describe('04.6-r3 — Logo asset sanity (Gain/MUBI/Tabii)', () => {
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
