/**
 * Phase 05.5 — regression: AI arama sonucuna tıklayınca ALAKASIZ içerik açılıyordu.
 * Kök neden: displayDiscoverResultsView kart onclick'inde media tipini 'movie'
 * olarak hardcode'luyordu; TMDB'de movie/tv ID uzayları ayrı olduğundan bir dizi
 * kartı aynı ID'li rastgele bir film açıyordu.
 *
 * Gerçek JSDOM kalıbı (tests/setup.js'in mock document'ı DOM render edemez).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let displayDiscoverResultsView;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;

    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="wizard-results">
            <h2 id="wizard-results-title"></h2>
            <div id="wizard-results-grid"></div>
        </div>
    </body></html>`, { url: 'http://localhost/', pretendToBeVisual: true });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;

    vi.resetModules();
    const mod = await import('../src/features/discover.js');
    displayDiscoverResultsView = mod.displayDiscoverResultsView;
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('displayDiscoverResultsView — sonuç kartı tıklaması', () => {
    it("her kart KENDİ media_type'ı ile açılır (tv kartı tv olarak, film film olarak)", () => {
        const openDetailModal = vi.fn();
        window.openDetailModal = openDetailModal;

        displayDiscoverResultsView([
            { id: 1396, media_type: 'tv', title: 'Breaking Bad', poster_path: '/bb.jpg', vote_average: 9.5, release_date: '2008-01-20' },
            { id: 27205, media_type: 'movie', title: 'Inception', poster_path: '/in.jpg', vote_average: 8.4, release_date: '2010-07-15' },
        ], 'ai');

        const cards = document.querySelectorAll('#wizard-results-grid .discover-result-card');
        expect(cards.length).toBe(2);

        cards[0].dispatchEvent(new window.Event('click', { bubbles: true }));
        cards[1].dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(openDetailModal).toHaveBeenNthCalledWith(1, 1396, 'tv');
        expect(openDetailModal).toHaveBeenNthCalledWith(2, 27205, 'movie');
    });

    it("media_type yoksa 'movie' fallback'ine düşer (wizard/surprise eski davranış)", () => {
        const openDetailModal = vi.fn();
        window.openDetailModal = openDetailModal;

        displayDiscoverResultsView([
            { id: 550, title: 'Fight Club', poster_path: '/fc.jpg', vote_average: 8.4, release_date: '1999-10-15' },
        ], 'wizard');

        document.querySelector('#wizard-results-grid .discover-result-card')
            .dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(openDetailModal).toHaveBeenCalledWith(550, 'movie');
    });
});
