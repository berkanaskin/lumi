/**
 * Phase 05.5 eritme — premium sheets.
 * Agent hub/FAB öldü; Decide-for-Me Wizard'a birinci sınıf girişle,
 * Pair Mode Profil'den sheet'le açılıyor. Free kullanıcı → paywall.
 * Gerçek JSDOM kalıbı (tests/setup.js'in mock document'ı render edemez).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let openDecideSheet, openPairSheet, closeSheet, initPremiumSheets, PREMIUM_KEY;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;
    const dom = new JSDOM(`<!doctype html><html><body>
        <div class="discover-console">
            <div class="console-actions"><button id="console-primary-btn"></button></div>
        </div>
    </body></html>`, { url: 'http://localhost/', pretendToBeVisual: true });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    dom.window.i18n = { t: (k) => k, currentLang: 'tr' };

    vi.resetModules();
    const ent = await import('../src/lib/entitlements.js');
    PREMIUM_KEY = ent.PREMIUM_KEY;
    const mod = await import('../src/features/premium-sheets.js');
    openDecideSheet = mod.openDecideSheet;
    openPairSheet = mod.openPairSheet;
    closeSheet = mod.closeSheet;
    initPremiumSheets = mod.initPremiumSheets;
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('premium-sheets (05.5 eritme)', () => {
    it('FAB ve hub artık YOK', () => {
        expect(document.getElementById('agent-fab')).toBeNull();
        expect(document.getElementById('agent-overlay')).toBeNull();
    });

    it("Wizard console'una 'Kararsızım — Lumi Seçsin' girişi enjekte edilir", () => {
        initPremiumSheets();
        const btn = document.getElementById('decide-entry-btn');
        expect(btn).toBeTruthy();
        expect(btn.textContent).toContain('Lumi Seçsin');
    });

    it('free kullanıcı Decide girişine basınca paywall açılır, sheet açılmaz', () => {
        openDecideSheet();
        expect(document.querySelector('[data-testid="premium-sheet"]')).toBeNull();
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeTruthy();
    });

    it('premium kullanıcıya Decide sheet açılır: mood chipleri + Karar Ver', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openDecideSheet();
        const sheet = document.querySelector('[data-testid="premium-sheet"]');
        expect(sheet).toBeTruthy();
        expect(sheet.querySelectorAll('.agent-chip').length).toBeGreaterThan(2);
        expect(sheet.querySelector('[data-testid="decide-go"]')).toBeTruthy();
        // Kullanıcıya görünen marka: Lumi Premium (Agent değil)
        expect(sheet.textContent).toContain('Lumi Premium');
        expect(sheet.textContent).not.toContain('Lumi Agent');
    });

    it('premium kullanıcıya Pair sheet, kayıtlı pair hook\'unu çağırır', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        const hook = vi.fn((body) => { body.textContent = 'pair-panel'; });
        window.lumiAgent = { pair: hook };
        openPairSheet();
        expect(hook).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-testid="premium-sheet"]').textContent).toContain('pair-panel');
    });

    it('closeSheet overlay\'i kaldırır; ikinci open tekil kalır', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openDecideSheet();
        openDecideSheet(); // idempotent
        expect(document.querySelectorAll('#premium-sheet-overlay').length).toBe(1);
        closeSheet();
        expect(document.getElementById('premium-sheet-overlay')).toBeNull();
    });

    it('evening_pick derin-bağlantısı için window.openDecideSheet expose edilir', () => {
        expect(typeof window.openDecideSheet).toBe('function');
    });
});
