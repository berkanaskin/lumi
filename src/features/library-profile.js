/**
 * LUMI — Kitaplık + Profil yeniden tasarımı render yardımcıları (05.5, founder onaylı mockup).
 *
 * index.html'deki loadFavoritesList / loadProfileData inline fonksiyonları
 * window.* üzerinden bu modülü çağırır (self-injecting modül kalıbı; kırılgan
 * inline script büyütülmez). İçerik kaynakları localStorage (liked_items,
 * watchlist_items, userRatings) — mevcut şema korunur.
 */
import { NO_POSTER_URL } from '../lib/constants.js';

const IMG = 'https://image.tmdb.org/t/p/w342';

function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function readList(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// ---- Kitaplık ----------------------------------------------------------------

/** Tek kart: poster + köşe rozeti (❤/🔖) + alt gradyan meta (başlık · yıl · tip). */
export function buildLibraryCard(item, listType) {
    const poster = item.poster_path ? IMG + item.poster_path : NO_POSTER_URL;
    const title = esc(item.title || item.name || '—');
    const year = String(item.release_date || item.first_air_date || '').slice(0, 4);
    const isTv = item.media_type === 'tv';
    const typeLabel = isTv ? 'Dizi' : 'Film';
    const badge = listType === 'watchlist'
        ? '<span class="lib-badge lib-badge-bk"><span class="material-symbols-outlined">bookmark</span></span>'
        : '<span class="lib-badge"><span class="material-symbols-outlined">favorite</span></span>';
    return `
        <div class="lib-card" data-id="${parseInt(item.id, 10)}" data-type="${isTv ? 'tv' : 'movie'}" role="button" tabindex="0">
            <img src="${poster}" alt="${title}" loading="lazy">
            ${badge}
            <div class="lib-meta">${title}<small>${[year, typeLabel].filter(Boolean).join(' · ')}</small></div>
        </div>`;
}

/** "24 film · 8 dizi" istatistik satırı. */
export function libraryStatsText(items) {
    const movies = items.filter((i) => i.media_type !== 'tv').length;
    const tv = items.length - movies;
    const parts = [];
    if (movies) parts.push(`${movies} film`);
    if (tv) parts.push(`${tv} dizi`);
    return parts.join(' · ');
}

/** index.html loadFavoritesList'in çağırdığı tam renderer. */
export function renderLibrary(listType) {
    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('empty-list-message');
    const stats = document.getElementById('library-stats');
    if (!grid) return;

    const items = readList(listType === 'watchlist' ? 'watchlist_items' : 'liked_items');
    if (stats) stats.textContent = libraryStatsText(items);

    if (!items.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = items.map((it) => buildLibraryCard(it, listType)).join('');
    grid.querySelectorAll('.lib-card').forEach((card) => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            const type = card.dataset.type;
            if (window.openDetail) window.openDetail(id, type);
            else if (window.openDetailModal) window.openDetailModal(id, type);
        });
    });
}

// ---- Profil ------------------------------------------------------------------

/** Beğenilenlerde depolanan tür adlarından en sık 3'ü (yoksa boş dizi). */
export function topGenres(items) {
    const counts = new Map();
    for (const it of items) {
        for (const g of (Array.isArray(it.genres) ? it.genres : [])) {
            counts.set(g, (counts.get(g) || 0) + 1);
        }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
}

const GENRE_EMOJI = {
    'Bilim Kurgu': '🛸', 'Bilim-Kurgu': '🛸', 'Science Fiction': '🛸',
    'Dram': '🎭', 'Drama': '🎭',
    'Gerilim': '🔪', 'Thriller': '🔪',
    'Komedi': '😂', 'Comedy': '😂',
    'Aksiyon': '💥', 'Action': '💥',
    'Korku': '👻', 'Horror': '👻',
    'Romantik': '💘', 'Romance': '💘',
    'Animasyon': '🎨', 'Animation': '🎨',
    'Fantastik': '🐉', 'Fantasy': '🐉',
    'Suç': '🕵️', 'Crime': '🕵️',
};

/** Profil ekstralarını doldurur: tier pill, DNA, 3'lü istatistik, raf, upsell. */
export function renderProfileExtras() {
    const liked = readList('liked_items');
    const watchlist = readList('watchlist_items');
    let ratings = {};
    try { ratings = JSON.parse(localStorage.getItem('userRatings') || '{}'); } catch { /* ignore */ }
    const premium = localStorage.getItem('lumi_premium') === 'true';

    // Tier pill: premium rozeti zaten var (#profile-badge); free pill'i biz yönetiriz.
    const freePill = document.getElementById('profile-tier-free');
    if (freePill) freePill.style.display = premium ? 'none' : 'inline-flex';

    // Zevk DNA'sı (genre verisi olan beğeniler birikince görünür)
    const dna = document.getElementById('profile-dna');
    if (dna) {
        const genres = topGenres(liked);
        if (genres.length >= 2) {
            dna.innerHTML = genres
                .map((g) => `<span>${GENRE_EMOJI[g] || '🎬'} ${esc(g)}</span>`)
                .join('');
            dna.style.display = 'flex';
        } else {
            dna.style.display = 'none';
        }
    }

    // İstatistikler
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = String(v); };
    set('stat-watched', Object.keys(ratings).length);
    set('stat-liked', liked.length);
    set('stat-watchlist', watchlist.length);

    // Son Beğendiklerin rafı
    const shelfSection = document.getElementById('profile-shelf-section');
    const shelf = document.getElementById('profile-shelf');
    if (shelf && shelfSection) {
        const recent = liked.slice(-5).reverse();
        if (recent.length) {
            shelfSection.style.display = '';
            shelf.innerHTML = recent.map((it) => {
                const poster = it.poster_path ? IMG + it.poster_path : NO_POSTER_URL;
                const isTv = it.media_type === 'tv';
                return `<img src="${poster}" alt="${esc(it.title || '')}" loading="lazy"
                            data-id="${parseInt(it.id, 10)}" data-type="${isTv ? 'tv' : 'movie'}">`;
            }).join('');
            shelf.querySelectorAll('img').forEach((img) => {
                img.addEventListener('click', () => {
                    if (window.openDetail) window.openDetail(parseInt(img.dataset.id, 10), img.dataset.type);
                });
            });
        } else {
            shelfSection.style.display = 'none';
        }
    }

    // Premium upsell kartı (premium'da gizli)
    const upsell = document.getElementById('profile-upsell');
    if (upsell) upsell.style.display = premium ? 'none' : '';

    // Platformlarım satır değeri (onboarding seçimi)
    const platVal = document.getElementById('platforms-value');
    if (platVal) {
        let names = [];
        try {
            const ob = JSON.parse(localStorage.getItem('lumi_onboarding') || '{}');
            names = ob.platforms || ob.data?.platforms || [];
        } catch { /* ignore */ }
        platVal.textContent = names.length
            ? (names.length === 1 ? String(names[0]) : `${names[0]} +${names.length - 1}`)
            : '—';
    }

    // Dil satır değeri
    const langVal = document.getElementById('language-value');
    if (langVal && window.i18n?.currentLang) {
        const NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', ja: '日本語', ko: '한국어' };
        langVal.textContent = NAMES[window.i18n.currentLang] || window.i18n.currentLang;
    }
}

/** Profil etkileşimlerini bağlar (bir kez). */
export function wireProfileExtras() {
    if (window.__lumiProfileExtrasWired) return;
    window.__lumiProfileExtrasWired = true;

    // Çift Modu satırı
    document.getElementById('pair-mode-row')?.addEventListener('click', () => {
        if (window.openPairSheet) window.openPairSheet();
    });

    // Premium upsell
    document.getElementById('profile-upsell-cta')?.addEventListener('click', () => {
        if (window.openPaywall) window.openPaywall({ trigger: 'upgrade' });
    });

    // Dil seçici (ülke dropdown kalıbının aynısı)
    const btn = document.getElementById('language-selector');
    const dd = document.getElementById('language-dropdown');
    if (btn && dd) {
        btn.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('hidden'); });
        dd.querySelectorAll('.country-item').forEach((item) => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                if (window.i18n?.setLanguage) window.i18n.setLanguage(code);
                dd.classList.add('hidden');
                renderProfileExtras();
            });
        });
        document.addEventListener('click', () => dd.classList.add('hidden'));
    }

    // Platformlarım → onboarding'i yeniden aç (skippable; platform seçimi orada)
    document.getElementById('platforms-row')?.addEventListener('click', async () => {
        try {
            const { startOnboarding } = await import('./onboarding.js');
            startOnboarding({ user: null, db: null });
        } catch (e) { console.error('[profile] onboarding open failed', e); }
    });

    // Kitaplık "Bu akşam ne izlesen?" bandı
    document.getElementById('library-tonight')?.addEventListener('click', () => {
        if (window.openDecideSheet) window.openDecideSheet();
    });
}

// Self-expose: inline loadFavoritesList/loadProfileData buradan çağırır.
if (typeof window !== 'undefined') {
    window.renderLibrary = renderLibrary;
    window.renderProfileExtras = renderProfileExtras;
    const wire = () => wireProfileExtras();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
}
