/**
 * Phase 05.5 — Kitaplık + Profil redesign render yardımcıları.
 * Gerçek JSDOM kalıbı.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let mod;
let origDocument, origWindow, origLocalStorage;

const LIKED = [
    { id: 1, title: 'Inception', media_type: 'movie', poster_path: '/a.jpg', release_date: '2010-07-15', genres: ['Bilim Kurgu', 'Aksiyon'] },
    { id: 2, title: 'Breaking Bad', media_type: 'tv', poster_path: '/b.jpg', first_air_date: '2008-01-20', genres: ['Dram', 'Suç'] },
    { id: 3, title: 'Interstellar', media_type: 'movie', poster_path: '/c.jpg', release_date: '2014-11-07', genres: ['Bilim Kurgu', 'Dram'] },
];

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="favorites-grid"></div>
        <div id="empty-list-message" style="display:none"></div>
        <div id="library-stats"></div>
        <div id="profile-tier-free"></div>
        <div id="profile-dna" style="display:none"></div>
        <span id="stat-watched">0</span><span id="stat-liked">0</span><span id="stat-watchlist">0</span>
        <div id="profile-shelf-section" style="display:none"><div id="profile-shelf"></div></div>
        <div id="profile-upsell"></div>
        <span id="platforms-value"></span>
    </body></html>`, { url: 'http://localhost/', pretendToBeVisual: true });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    vi.resetModules();
    mod = await import('../src/features/library-profile.js');
    localStorage.clear();
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('Kitaplık renderer', () => {
    it('kartlar poster + rozet + meta (başlık · yıl · tip) içerir; tıklama doğru tiple açar', () => {
        localStorage.setItem('liked_items', JSON.stringify(LIKED));
        const openDetail = vi.fn();
        window.openDetail = openDetail;

        mod.renderLibrary('liked');
        const cards = document.querySelectorAll('.lib-card');
        expect(cards.length).toBe(3);
        expect(cards[1].textContent).toContain('Breaking Bad');
        expect(cards[1].textContent).toContain('Dizi');
        expect(cards[0].textContent).toContain('2010');

        cards[1].dispatchEvent(new window.Event('click', { bubbles: true }));
        expect(openDetail).toHaveBeenCalledWith(2, 'tv');
    });

    it('istatistik satırı "2 film · 1 dizi" üretir', () => {
        expect(mod.libraryStatsText(LIKED)).toBe('2 film · 1 dizi');
    });

    it('watchlist sekmesi bookmark rozeti kullanır ve boş listede empty-state görünür', () => {
        localStorage.setItem('watchlist_items', JSON.stringify([LIKED[0]]));
        mod.renderLibrary('watchlist');
        expect(document.querySelector('.lib-badge-bk')).toBeTruthy();

        localStorage.setItem('watchlist_items', '[]');
        mod.renderLibrary('watchlist');
        expect(document.getElementById('empty-list-message').style.display).toBe('flex');
    });

    it('XSS: başlıktaki HTML kaçışlanır', () => {
        localStorage.setItem('liked_items', JSON.stringify([{ id: 9, title: '<img src=x onerror=alert(1)>', media_type: 'movie' }]));
        mod.renderLibrary('liked');
        expect(document.querySelector('.lib-meta img')).toBeNull();
    });
});

describe('Profil ekstraları', () => {
    it('DNA çipleri en sık türlerden üretilir (≥2 tür varsa görünür)', () => {
        localStorage.setItem('liked_items', JSON.stringify(LIKED));
        mod.renderProfileExtras();
        const dna = document.getElementById('profile-dna');
        expect(dna.style.display).toBe('flex');
        expect(dna.textContent).toContain('Bilim Kurgu'); // 2 kez geçiyor → ilk sırada
        expect(dna.textContent).toContain('Dram');
    });

    it('tür verisi yoksa DNA gizli kalır', () => {
        localStorage.setItem('liked_items', JSON.stringify([{ id: 1, title: 'X', media_type: 'movie' }]));
        mod.renderProfileExtras();
        expect(document.getElementById('profile-dna').style.display).toBe('none');
    });

    it('istatistikler dolar: İzlenen=rating sayısı, Beğenilen, Listemde', () => {
        localStorage.setItem('liked_items', JSON.stringify(LIKED));
        localStorage.setItem('watchlist_items', JSON.stringify([LIKED[0], LIKED[1]]));
        localStorage.setItem('userRatings', JSON.stringify({ 'movie_1': { rating: 5 }, 'tv_2': { rating: 4 } }));
        mod.renderProfileExtras();
        expect(document.getElementById('stat-watched').textContent).toBe('2');
        expect(document.getElementById('stat-liked').textContent).toBe('3');
        expect(document.getElementById('stat-watchlist').textContent).toBe('2');
    });

    it('raf son 5 beğeniyi yeni→eski sırayla basar', () => {
        localStorage.setItem('liked_items', JSON.stringify(LIKED));
        mod.renderProfileExtras();
        const imgs = document.querySelectorAll('#profile-shelf img');
        expect(imgs.length).toBe(3);
        expect(imgs[0].dataset.id).toBe('3'); // en son eklenen önce
    });

    it('premium kullanıcıda upsell + free pill gizlenir', () => {
        localStorage.setItem('lumi_premium', 'true');
        mod.renderProfileExtras();
        expect(document.getElementById('profile-upsell').style.display).toBe('none');
        expect(document.getElementById('profile-tier-free').style.display).toBe('none');
    });
});
