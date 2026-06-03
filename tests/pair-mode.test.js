/**
 * Phase 05-04 — Pair Mode UI. Real JSDOM (repo mocks `document`).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let renderPairPanel;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/', pretendToBeVisual: true,
    });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;

    vi.resetModules();
    const mod = await import('../src/features/pair-mode.js');
    renderPairPanel = mod.renderPairPanel;
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('pair-mode UI (Phase 05-04)', () => {
    it('registers the window.lumiAgent.pair hook on import', () => {
        expect(typeof window.lumiAgent?.pair).toBe('function');
    });

    it('an anonymous user is prompted to create an account (no generate/redeem UI)', async () => {
        window.firebase = { auth: () => ({ currentUser: { isAnonymous: true } }) };
        const body = document.createElement('div');
        await renderPairPanel(body);
        expect(body.textContent).toMatch(/hesap|account/i);
        expect(body.querySelector('[data-testid="pair-generate"]')).toBeFalsy();
    });

    it('a real, unpaired user sees generate + redeem controls', async () => {
        window.firebase = { auth: () => ({ currentUser: { isAnonymous: false, uid: 'real1' } }) };
        window.AuthService = { getIdToken: async () => 'tok', currentUser: { uid: 'real1' } };
        // status → not paired
        globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, paired: false }) });
        const body = document.createElement('div');
        await renderPairPanel(body);
        expect(body.querySelector('[data-testid="pair-generate"]')).toBeTruthy();
        expect(body.querySelector('[data-testid="pair-redeem"]')).toBeTruthy();
        expect(body.querySelector('[data-testid="pair-input"]')).toBeTruthy();
    });

    it('a paired user sees the paired status + recommend button', async () => {
        window.firebase = { auth: () => ({ currentUser: { isAnonymous: false, uid: 'real1' } }) };
        window.AuthService = { getIdToken: async () => 'tok', currentUser: { uid: 'real1' } };
        globalThis.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, paired: true, partner: 'real2' }) });
        const body = document.createElement('div');
        await renderPairPanel(body);
        expect(body.querySelector('[data-testid="pair-status"]')).toBeTruthy();
        expect(body.querySelector('[data-testid="pair-recommend"]')).toBeTruthy();
    });

    it('generate button shows the issued code', async () => {
        window.firebase = { auth: () => ({ currentUser: { isAnonymous: false, uid: 'real1' } }) };
        window.AuthService = { getIdToken: async () => 'tok', currentUser: { uid: 'real1' } };
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ json: async () => ({ ok: true, paired: false }) })       // status
            .mockResolvedValueOnce({ json: async () => ({ ok: true, code: 'A1B2C3' }) });       // generate
        const body = document.createElement('div');
        await renderPairPanel(body);
        body.querySelector('[data-testid="pair-generate"]').click();
        await new Promise((r) => setTimeout(r, 0));
        expect(body.querySelector('[data-testid="pair-code"]').textContent).toBe('A1B2C3');
    });
});
