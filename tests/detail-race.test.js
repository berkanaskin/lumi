/**
 * Phase 05.5 — regression: detay modal yarış durumu.
 * A'yı aç → hızla B'yi aç → A'nın GEÇ gelen yanıtı B'nin modalını ezmemeli.
 * Guard: openDetail başına istek sayacı; await sonrası sayaç değiştiyse render yok.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

vi.mock('../src/services/api.js', () => {
    const pending = new Map();
    return {
        API: {
            getDetailsBundle: vi.fn((id) => new Promise((resolve) => pending.set(id, resolve))),
            getMovieVideos: vi.fn(async () => ({ trailer: [], behindTheScenes: [], reviews: [], interview: [] })),
            getReleaseDates: vi.fn(async () => null),
            getAllRatings: vi.fn(async () => null),
        },
        __pending: pending,
        processCredits: (d) => ({ cast: [], crew: [] }),
        dedupeYouTubeVideos: (v) => v || [],
    };
});
vi.mock('../src/services/streaming-cache.js', () => ({
    getStreamingWithCache: vi.fn(async () => null),
}));

let origDocument, origWindow, origLocalStorage;

function bundleFor(id, title) {
    return {
        details: { id, title, overview: '', genres: [], release_date: '2020-01-01' },
        credits: { cast: [], crew: [] },
        videos: [],
        providers: null,
        imdbId: null,
    };
}

beforeEach(() => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="detail-modal"><div id="modal-body"></div></div>
        <div class="bottom-nav"></div>
    </body></html>`, { url: 'http://localhost/', pretendToBeVisual: true });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    // Gerçek sayfada i18n.js her zaman yüklü; t helper'ı i18n yokken
    // window.i18n.t'ye optional-chaining'siz dokunduğu için stub şart.
    dom.window.i18n = { t: (k) => k, currentLang: 'tr' };
    vi.resetModules();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
    vi.clearAllMocks();
});

describe('openDetail — yarış guard\'ı', () => {
    it("önce açılan isteğin GEÇ yanıtı sonra açılan modalı ezmez", async () => {
        const api = await import('../src/services/api.js');
        const { state, elements } = await import('../src/lib/state.js');
        elements.modal = document.getElementById('detail-modal');
        elements.modalBody = document.getElementById('modal-body');
        elements.searchInput = null;

        const { openDetail } = await import('../src/features/detail.js');

        const pA = openDetail(100, 'movie', 'Film A', '2020');
        const pB = openDetail(200, 'movie', 'Film B', '2021');

        // B'nin yanıtı önce gelir → B render edilir
        api.__pending.get(200)(bundleFor(200, 'Film B'));
        await pB;
        expect(elements.modalBody.innerHTML).toContain('Film B');

        // A'nın yanıtı GEÇ gelir → render EDİLMEMELİ
        api.__pending.get(100)(bundleFor(100, 'Film A'));
        await pA;
        expect(elements.modalBody.innerHTML).toContain('Film B');
        expect(elements.modalBody.innerHTML).not.toContain('Film A');
        expect(state.currentItemId).toBe(200);
    });
});
