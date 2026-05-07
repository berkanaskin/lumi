// ============================================
// LUMI - Detail Feature Module
// v0.12.0
// Core functions for movie/TV detail modal
// ============================================

import { state, elements } from '../lib/state.js';
import { showToast } from '../ui/toast.js';
import { API, GeoIPService } from '../services/api.js';
import { getStreamingWithCache } from '../services/streaming-cache.js';
import { getPlatformUrl, getLogoOverride } from '../lib/platforms.js';

// ============================================
// MODAL STATE
// ============================================

let currentVideoCategory = 'trailer';

// ============================================
// MODAL OPEN/CLOSE
// ============================================

/**
 * Open detail modal for a movie or TV show
 */
export async function openDetail(id, type, title, year, originalTitle) {
    // Track if user came from search
    const searchInputValue = elements.searchInput?.value?.trim() || '';
    const hasSearchContext = state.searchResultsVisible || searchInputValue.length > 0;

    if (hasSearchContext) {
        state.cameFromSearch = true;
        if (!state.searchQuery || state.searchQuery !== searchInputValue) {
            state.searchQuery = searchInputValue;
        }
        state.searchScrollPosition = window.scrollY;
        console.log('Opening detail from search context:', state.searchQuery);
    } else {
        state.cameFromSearch = false;
    }

    // Store current item for re-render
    state.currentItemId = id;
    state.currentItemType = type;

    // Show modal with loading
    elements.modal.classList.add('active');
    const loadingText = (window.i18n?.t('loading') !== 'loading' ? window.i18n?.t('loading') : null) || 'Yükleniyor...';
    elements.modalBody.innerHTML = `<div class="loading-state visible"><div class="spinner"></div><p>${loadingText}</p></div>`;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    // Hide bottom nav
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }

    const region = state.currentRegion || 'TR';

    try {
        // Phase 1: Fetch core TMDB data in parallel (fast — renders modal immediately)
        const [details, providers, credits, tmdbVideos] = await Promise.all([
            API.getDetails(id, type, state.currentLanguage),
            API.getWatchProviders(id, type, region),
            API.getCredits(id, type),
            API.getTMDBVideos(id, type),
        ]);

        if (!details) {
            elements.modalBody.innerHTML = '<p style="padding: 40px; text-align: center;">Detaylar yüklenemedi.</p>';
            return;
        }

        // Derive title/year/originalTitle from TMDB response
        const resolvedTitle = title || details.title || details.name || '';
        const resolvedYear = year || (details.release_date || details.first_air_date || '').substring(0, 4);
        const resolvedOriginal = originalTitle || details.original_title || details.original_name || '';

        // Save core state and render immediately (no waiting for slow APIs)
        state.currentCredits = credits;
        state.currentAllRatings = null;
        state.currentStreamingData = null;
        state.currentTurkishReleaseDate = null;
        state.currentImdbData = null;
        state.currentTrivia = [];

        // Process TMDB videos (available immediately)
        const trailers = tmdbVideos.filter(v => v.type === 'Trailer' || v.type === 'Teaser');
        const btsVideos = tmdbVideos.filter(v => v.type === 'Behind the Scenes' || v.type === 'Featurette');
        state.currentVideos = {
            trailer: [...trailers],
            behindTheScenes: [...btsVideos],
            reviews: [],
        };
        state.currentVideoCategory = 'trailer';
        state.currentTitle = resolvedTitle;

        // RENDER MODAL NOW — user sees content instantly
        renderDetail(details, providers, type, id, null);

        // Phase 2: Enrich with slow APIs in background (streaming, ratings, YouTube)
        const imdbIdPromise = API.getIMDBId(id, type);
        const youtubePromise = API.getMovieVideos(resolvedTitle, resolvedYear, resolvedOriginal).catch(() => ({ trailer: [], behindTheScenes: [], reviews: [], interview: [] }));
        const releaseDatePromise = type === 'movie' ? API.getReleaseDates(id, 'TR').catch(() => null) : Promise.resolve(null);

        const imdbId = await imdbIdPromise;

        // Fetch streaming + ratings in parallel
        // getStreamingWithCache handles null imdbId by falling back to TMDB watch providers
        // allRatings requires imdbId — skip if not available
        let streamingData = null;
        let allRatings = null;
        try {
            const streamingPromise = getStreamingWithCache(id, imdbId, state.currentRegion || 'TR', type, details);
            const ratingsPromise = imdbId ? API.getAllRatings(imdbId) : Promise.resolve(null);
            [streamingData, allRatings] = await Promise.all([streamingPromise, ratingsPromise]);
        } catch (innerErr) {
            console.warn('Streaming/Ratings fetch error:', innerErr);
        }

        const [youtubeVideos, turkishReleaseDate] = await Promise.all([youtubePromise, releaseDatePromise]);

        // Update state with enriched data
        state.currentAllRatings = allRatings;
        state.currentStreamingData = streamingData;
        state.currentTurkishReleaseDate = turkishReleaseDate;

        // Merge YouTube videos into existing TMDB videos
        state.currentVideos = {
            trailer: mergeVideos(trailers, youtubeVideos.trailer),
            behindTheScenes: mergeVideos(btsVideos, youtubeVideos.behindTheScenes),
            reviews: [...(youtubeVideos.reviews || []), ...(youtubeVideos.interview || [])],
        };

        // Re-render with full data (user already sees modal, this updates sections)
        renderDetail(details, providers, type, id, streamingData);
    } catch (error) {
        console.error('openDetail error:', error);
        elements.modalBody.innerHTML = `<div class="error-state">
            <p>Bir hata oluştu: ${error.message}</p>
            <button onclick="closeModal()">Kapat</button>
        </div>`;
    }
}

/**
 * Alternative modal opener (for new UI)
 */
export function openDetailModal(id, type) {
    openDetail(id, type);
}

/**
 * Close detail modal
 */
export function closeModal() {
    elements.modal.classList.remove('active');
    // Reset ALL scroll lock mechanisms defensively
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');

    // Restore bottom nav
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = '';
    }

    // Clear search input on modal close
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    state.cameFromSearch = false;
    state.searchQuery = '';
}

// ============================================
// VIDEO UTILITIES
// ============================================

/**
 * Merge TMDB videos with YouTube videos
 */
export function mergeVideos(tmdbVideos, youtubeVideos) {
    const merged = [];
    const seenIds = new Set();

    tmdbVideos.forEach(v => {
        if (!seenIds.has(v.key)) {
            seenIds.add(v.key);
            merged.push({
                id: { videoId: v.key },
                snippet: {
                    title: v.name,
                    thumbnails: { medium: { url: `https://img.youtube.com/vi/${v.key}/mqdefault.jpg` } },
                },
                isOfficial: true,
            });
        }
    });

    if (youtubeVideos) {
        youtubeVideos.forEach(v => {
            const videoId = v.id.videoId;
            if (!seenIds.has(videoId)) {
                seenIds.add(videoId);
                merged.push(v);
            }
        });
    }

    return merged;
}

/**
 * Switch video category
 */
export function switchVideoCategory(category) {
    currentVideoCategory = category;
    state.currentVideoCategory = category;

    // Update tabs
    document.querySelectorAll('.video-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Update content
    renderVideoContent();
}

/**
 * Render video content based on current category
 */
export function renderVideoContent() {
    const container = document.getElementById('video-container');
    if (!container) {
        return;
    }

    // 'interviews' maps to legacy 'reviews' key in state.currentVideos
    const categoryKey = currentVideoCategory === 'interviews' ? 'reviews' : currentVideoCategory;
    const videos = state.currentVideos?.[categoryKey] || [];

    if (videos.length === 0) {
        container.innerHTML = '<p class="no-videos">Bu kategoride video bulunamadı.</p>';
        return;
    }

    container.innerHTML = videos.map(v => {
        const videoId = v.id.videoId;
        const videoTitle = v.snippet?.title || 'Video';
        const thumbUrl = v.snippet?.thumbnails?.medium?.url
            || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        return `
        <div class="video-thumb" role="button" tabindex="0"
            aria-label="Play ${videoTitle.replace(/"/g, '&quot;')}"
            onclick="playVideo('${videoId}')"
            onkeydown="if(event.key==='Enter'||event.key===' ')playVideo('${videoId}')">
            <img src="${thumbUrl}" alt="${videoTitle.replace(/"/g, '&quot;')}"
                style="width:100%;height:100%;object-fit:cover;border-radius:inherit">
            <div class="video-thumb__play">
                <span class="material-symbols-outlined">play_circle</span>
            </div>
            ${v.isOfficial ? '<span class="official-badge">Official</span>' : ''}
        </div>`;
    }).join('');
}

/**
 * Play video in modal
 */
export function playVideo(videoId) {
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer) {
        videoPlayer.innerHTML = `
            <div class="video-player-container">
                <button class="close-video" onclick="closeVideo()">✕</button>
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
        `;
        videoPlayer.classList.add('active');
    }
}

/**
 * Close video player
 */
export function closeVideo() {
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer) {
        videoPlayer.innerHTML = '';
        videoPlayer.classList.remove('active');
    }
}

// ============================================
// FAVORITES & LISTS
// ============================================

/**
 * Toggle like status
 */
export function toggleLike(id, type, title, posterPath, voteAverage, releaseDate) {
    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
    const index = likedItems.findIndex(f => f.id === parseInt(id));

    if (index > -1) {
        likedItems.splice(index, 1);
        showToast('Beğenilenlerden çıkarıldı');
    } else {
        likedItems.push({
            id: parseInt(id),
            title,
            poster_path: posterPath,
            vote_average: voteAverage,
            release_date: releaseDate,
            media_type: type,
            added_at: new Date().toISOString(),
        });
        showToast('Beğenilenlere eklendi ❤️');
    }

    localStorage.setItem('liked_items', JSON.stringify(likedItems));
    return likedItems.some(f => f.id === parseInt(id));
}

/**
 * Toggle watchlist status
 */
export function toggleWatchlist(id, type, title, posterPath, voteAverage, releaseDate) {
    const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
    const index = watchlistItems.findIndex(f => f.id === parseInt(id));

    if (index > -1) {
        watchlistItems.splice(index, 1);
        showToast('Listeden çıkarıldı');
    } else {
        watchlistItems.push({
            id: parseInt(id),
            title,
            poster_path: posterPath,
            vote_average: voteAverage,
            release_date: releaseDate,
            media_type: type,
            added_at: new Date().toISOString(),
        });
        showToast('İzleyeceğim listesine eklendi 📌');
    }

    localStorage.setItem('watchlist_items', JSON.stringify(watchlistItems));
    return watchlistItems.some(f => f.id === parseInt(id));
}

/**
 * Legacy toggle favorite
 */
export function toggleFavorite(details, type) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.findIndex(f => f.id === details.id);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({
            id: details.id,
            title: details.title || details.name,
            poster_path: details.poster_path,
            vote_average: details.vote_average,
            release_date: details.release_date || details.first_air_date,
            media_type: type,
        });
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// ============================================
// STAR RATING
// ============================================

/**
 * Initialize star rating UI
 */
export function initStarRating(containerId, onRate) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    const stars = container.querySelectorAll('.star');
    let currentRating = 0;

    stars.forEach(star => {
        // Hover effects
        star.addEventListener('mouseenter', (e) => {
            const rect = star.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const isLeftHalf = x < rect.width / 2;
            const value = isLeftHalf ? parseFloat(star.dataset.halfLeft) : parseFloat(star.dataset.value);
            updateStarDisplay(stars, value);
        });

        // Click
        star.addEventListener('click', (e) => {
            const rect = star.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const isLeftHalf = x < rect.width / 2;
            currentRating = isLeftHalf ? parseFloat(star.dataset.halfLeft) : parseFloat(star.dataset.value);
            updateStarDisplay(stars, currentRating);

            const valueDisplay = document.getElementById('star-value');
            if (valueDisplay) {
                valueDisplay.textContent = currentRating.toFixed(1);
            }

            if (onRate) {
                onRate(currentRating);
            }
        });

        // Mouse leave
        star.addEventListener('mouseleave', () => {
            updateStarDisplay(stars, currentRating);
        });
    });
}

/**
 * Update star display based on rating
 */
export function updateStarDisplay(stars, rating) {
    stars.forEach(star => {
        const fullValue = parseFloat(star.dataset.value);
        const halfValue = parseFloat(star.dataset.halfLeft);

        star.classList.remove('full', 'half', 'empty');

        if (rating >= fullValue) {
            star.classList.add('full');
        } else if (rating >= halfValue) {
            star.classList.add('half');
        } else {
            star.classList.add('empty');
        }
    });
}

// ============================================
// RENDER DETAIL — Full Cinematic Implementation
// ============================================

/**
 * Render cinematic detail content
 * Design: Stitch MCP validated — hero backdrop, poster+info, actions,
 * ratings, cast, providers, video tabs, premium section
 */
export function renderDetail(details, providers, type, itemId, streamingData) {
    const title = details.title || details.name;
    const tmdbScore = details.vote_average ? details.vote_average.toFixed(1) : '';

    // Image URLs
    const backdropUrl = details.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : '';
    const posterUrl = details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : '';

    // Genres
    const genres = (details.genres || []).map(g =>
        `<span class="detail-genre-pill">${g.name}</span>`
    ).join('');

    // Check like/watchlist state
    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
    const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
    const isLiked = likedItems.some(f => f.id === parseInt(itemId));
    const isInWatchlist = watchlistItems.some(f => f.id === parseInt(itemId));

    // Ratings
    const allRatings = state.currentAllRatings;
    const ratingsHTML = buildRatingsHTML(tmdbScore, allRatings);

    // Credits / Cast
    const credits = state.currentCredits;
    const castHTML = buildCastHTML(credits);

    // Streaming (new enriched section)
    const effectiveStreamingData = streamingData || state.currentStreamingData;
    const streamingHTML = buildStreamingHTML(effectiveStreamingData, title);

    // Cinema badge (overlaid on poster)
    const cinemaBadgeHTML = buildCinemaBadgeHTML(type, details);

    // Videos (with category tabs)
    const videosHTML = buildVideosHTML();

    // Trivia gate
    const triviaGateHTML = buildTriviaGateHTML(allRatings);

    // Build date & series meta
    const dateMetaHTML = buildDateMetaHTML(details, type);

    // Runtime
    const runtime = details.runtime ? `${details.runtime} dk` : '';
    // Episode runtime for TV
    const episodeRuntime = (type === 'tv' && details.episode_run_time?.length)
        ? `~${details.episode_run_time[0]} dk/bölüm` : '';
    const runtimeDisplay = runtime || episodeRuntime;

    elements.modalBody.innerHTML = `
        <!-- Hero Backdrop -->
        <div class="detail-hero">
            ${backdropUrl
                ? `<img src="${backdropUrl}" alt="${title}" class="detail-backdrop-img">`
                : `<div class="detail-backdrop-placeholder"></div>`
            }
            <div class="detail-backdrop-gradient"></div>

            <!-- Poster + Core Info overlaid on hero -->
            <div class="detail-hero-content">
                <div class="detail-poster-wrap" style="position:relative">
                    ${posterUrl
                        ? `<img src="${posterUrl}" alt="${title}" class="detail-poster-img">`
                        : `<div class="detail-poster-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg></div>`
                    }
                    ${cinemaBadgeHTML}
                </div>
                <div class="detail-core-info">
                    <h2 class="detail-title">${title}</h2>
                    <div class="detail-meta">
                        ${runtimeDisplay ? `<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${runtimeDisplay}</span>` : ''}
                    </div>
                    <div class="detail-hero-ratings" id="hero-ratings"></div>
                    ${genres ? `<div class="detail-genres">${genres}</div>` : ''}
                </div>
            </div>
        </div>

        <!-- Action Bar -->
        <div class="detail-actions-inline">
            <button id="like-btn" class="detail-inline-btn ${isLiked ? 'active' : ''}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Beğen
            </button>
            <button id="watchlist-btn" class="detail-inline-btn ${isInWatchlist ? 'active' : ''}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isInWatchlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Listeye Ekle
            </button>
            <button class="detail-inline-btn detail-inline-rate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Puan Ver
            </button>
        </div>

        <!-- Where to Watch (Streaming) -->
        ${streamingHTML}

        <!-- Overview -->
        <div class="detail-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Özet</h3>
            <p class="detail-overview-text">${details.overview || 'Özet bulunamadı.'}</p>
        </div>

        <!-- Cast -->
        ${castHTML}

        <!-- Date & Series Meta -->
        ${dateMetaHTML}

        <!-- Videos (with Trailers / BTS / Interviews tabs) -->
        ${videosHTML}

        <!-- Awards -->
        ${triviaGateHTML}

        <!-- Trivia (loaded async from Gemini) -->
        <div class="detail-section" id="trivia-section" style="display:none">
            <h3 class="detail-section-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Biliyor muydunuz?
            </h3>
            <div id="trivia-container">
                <div class="ratings-skeleton" style="height:80px"></div>
            </div>
        </div>

        <!-- Video Player (hidden) -->
        <div id="video-player"></div>
    `;

    // Attach event listeners
    attachDetailEventListeners(details, type, itemId);

    // Initialize video content
    renderVideoContent();

    // Update hero ratings when allRatings is available
    updateHeroRatings();

    // Load trivia from Gemini (async, fills in after render)
    loadTrivia(details, type);
}

/**
 * Update hero area ratings with IMDb/RT/MC mini badges
 */
function updateHeroRatings() {
    const el = document.getElementById('hero-ratings');
    if (!el) return;
    const allRatings = state.currentAllRatings;
    if (!allRatings) return;

    const items = [];
    if (allRatings.imdb) {
        items.push(`<span class="hero-rating-item"><span style="background:#f5c518;color:#000;padding:0 3px;border-radius:2px;font-size:9px;font-weight:800;letter-spacing:-0.5px">IMDb</span> ${allRatings.imdb}</span>`);
    }
    const rt = allRatings.rottenTomatoes?.tomatometer;
    if (rt != null) {
        items.push(`<span class="hero-rating-item"><span style="font-size:11px">🍅</span> ${rt}%</span>`);
    }
    if (allRatings.metacritic) {
        const mcColor = allRatings.metacritic >= 60 ? '#6c3' : allRatings.metacritic >= 40 ? '#fc3' : '#f00';
        items.push(`<span class="hero-rating-item"><span style="background:${mcColor};color:#000;padding:0 3px;border-radius:2px;font-size:9px;font-weight:800">MC</span> ${allRatings.metacritic}</span>`);
    }
    el.innerHTML = items.join('');
}

/**
 * Load trivia from Gemini AI
 */
async function loadTrivia(details, type) {
    const triviaSection = document.getElementById('trivia-section');
    const triviaContainer = document.getElementById('trivia-container');
    if (!triviaContainer || !triviaSection) return;
    triviaSection.style.display = '';

    const title = details.title || details.name;
    const year = (details.release_date || details.first_air_date || '').substring(0, 4);
    const mediaType = type === 'tv' ? 'dizi' : 'film';

    try {
        const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `"${title}" (${year}) ${mediaType} hakkinda 5 ilginc trivia bilgisi yaz. Gercek, dogru ve ilginc bilgiler olsun. Set arkasi hikayeleri, gizli detaylar, oyuncu anektodlari gibi. Her birini 1-2 cumleyle yaz. Sadece bilgileri yaz, baslik veya numara koyma. Her bilgiyi yeni satirda yaz.`
            }),
        });

        if (!res.ok) {
            triviaContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Trivia yuklenemedi.</p>';
            return;
        }

        const data = await res.json();
        const text = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (text) {
            const facts = text.split('\n').filter(l => l.trim().length > 10).slice(0, 5);
            triviaContainer.innerHTML = facts.map(fact =>
                `<div style="display:flex;gap:8px;margin-bottom:var(--space-sm);align-items:flex-start">
                    <span style="color:var(--primary);font-size:1.1rem;flex-shrink:0">•</span>
                    <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;margin:0">${fact.trim()}</p>
                </div>`
            ).join('');
        } else {
            triviaContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Trivia bulunamadi.</p>';
        }
    } catch {
        triviaContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Trivia yuklenemedi.</p>';
    }
}

// ============================================
// DETAIL SECTION BUILDERS
// ============================================

function buildRatingsHTML(tmdbScore, allRatings) {
    if (!allRatings) return '';

    const items = [];

    // IMDb — logo + score/10
    if (allRatings.imdb) {
        items.push(`
            <div class="ratings-bar__item">
                <img class="ratings-bar__logo" height="24"
                    src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg"
                    alt="IMDb" loading="lazy">
                <span class="ratings-bar__score">${allRatings.imdb}/10</span>
            </div>`);
    }

    // Rotten Tomatoes — skip for TV shows (OMDb does not return RT for TV)
    const rtScore = allRatings.rottenTomatoes?.tomatometer;
    if (rtScore != null) {
        const rtFresh = parseInt(rtScore, 10) >= 60;
        items.push(`
            <div class="ratings-bar__item">
                <img class="ratings-bar__logo" height="24"
                    src="https://upload.wikimedia.org/wikipedia/commons/5/5b/Rotten_Tomatoes.svg"
                    alt="Rotten Tomatoes" loading="lazy">
                <span class="ratings-bar__score">${rtScore}%</span>
            </div>`);
    }

    // Metacritic — logo + score/100
    if (allRatings.metacritic) {
        items.push(`
            <div class="ratings-bar__item">
                <img class="ratings-bar__logo" height="24"
                    src="https://upload.wikimedia.org/wikipedia/commons/2/20/Metacritic.svg"
                    alt="Metacritic" loading="lazy">
                <span class="ratings-bar__score">${allRatings.metacritic}/100</span>
            </div>`);
    }

    if (items.length === 0) return '';

    return `<div class="ratings-bar">${items.join('')}</div>`;
}

/**
 * Build the "Where to Watch" streaming section with grouped providers.
 */
function buildStreamingHTML(streamingData, title) {
    const t = (key, fallback) => window.i18n?.t(key) !== key ? window.i18n.t(key) : fallback;
    const sectionLabel = t('streaming.whereToWatch', 'Nerede İzlenir');

    if (!streamingData) {
        return `
            <div class="streaming-section">
                <h3 class="detail-section-heading">${sectionLabel}</h3>
                <div class="skeleton ratings-skeleton" style="height:60px;border-radius:8px;"></div>
            </div>`;
    }

    // Defensive dedup pass — Set on lowercased serviceId, fallback to serviceName
    // (RESEARCH.md "Duplicate Results Fix"). Streaming-cache merges already dedup,
    // but a second pass guards against legacy cached docs and TMDB fallback path.
    const rawProviders = streamingData.providers || [];
    const seenKeys = new Set();
    const providers = [];
    for (const p of rawProviders) {
        const idKey = String(p.serviceId || '').toLowerCase().trim();
        const nameKey = String(p.serviceName || '').toLowerCase().trim();
        const key = idKey || nameKey;
        if (!key || seenKeys.has(key) || (nameKey && seenKeys.has(nameKey))) continue;
        seenKeys.add(key);
        if (nameKey) seenKeys.add(nameKey);
        providers.push(p);
    }

    // No providers
    if (providers.length === 0) {
        const countryName = state.countryName || state.currentRegion || 'this country';
        const noAvailText = t('streaming.notAvailable', '{country} için yayın platformu bulunamadı')
            .replace('{country}', countryName);
        return `
            <div class="streaming-section">
                <h3 class="detail-section-heading">${sectionLabel}</h3>
                <p class="label streaming-freshness">${noAvailText}</p>
            </div>`;
    }

    // Group by stream / rent / buy
    const groups = { stream: [], rent: [], buy: [] };
    for (const p of providers) {
        const g = p.group || 'stream';
        if (groups[g]) groups[g].push(p);
    }

    const groupLabels = {
        stream: t('streaming.stream', 'İzle'),
        rent: t('streaming.rent', 'Kirala'),
        buy: t('streaming.buy', 'Satın Al'),
    };

    let groupsHTML = '';
    for (const [key, list] of Object.entries(groups)) {
        if (list.length === 0) continue;
        const tiles = list.map(provider => {
            const deepLink = provider.link || getPlatformUrl(provider.serviceName, title);
            // Logo URL resolution order:
            // 1. LOGO_OVERRIDES[serviceName] — manual override for broken CDN URLs (e.g. HBO Max)
            // 2. provider.logoPath if full http URL
            // 3. provider.logoPath prefixed with TMDB CDN
            const overrideUrl = getLogoOverride(provider.serviceName);
            const logoUrl = overrideUrl
                ? overrideUrl
                : (provider.logoPath
                    ? (provider.logoPath.startsWith('http') ? provider.logoPath : `https://image.tmdb.org/t/p/w92${provider.logoPath}`)
                    : '');
            const safeName = provider.serviceName.replace(/"/g, '&quot;');
            const logoImg = logoUrl
                ? `<img src="${logoUrl}" alt="${safeName}"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
                        width="40" height="40" loading="lazy">
                   <div class="streaming-tile__fallback" style="display:none">${provider.serviceName.charAt(0)}</div>`
                : `<div class="streaming-tile__fallback" style="display:flex">${provider.serviceName.charAt(0)}</div>`;
            return `
                <button class="streaming-tile" onclick="window.open('${deepLink}','_blank')"
                    title="${safeName}" aria-label="Watch on ${safeName}">
                    <div class="streaming-tile__logo-wrap">
                        ${logoImg}
                    </div>
                    <span class="label">${provider.serviceName}</span>
                </button>`;
        }).join('');
        groupsHTML += `
            <div class="streaming-group">
                <span class="label streaming-group__label">${groupLabels[key]}</span>
                <div class="streaming-tiles">${tiles}</div>
            </div>`;
    }

    // Freshness line
    let freshnessHTML = '';
    if (streamingData.fetchedAt) {
        const ageMs = Date.now() - (streamingData.fetchedAt?.toMillis?.() || streamingData.fetchedAt);
        const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
        const ageMin = Math.floor(ageMs / (1000 * 60));
        const isStale = ageMs > 24 * 60 * 60 * 1000;
        const timeStr = ageHours > 0 ? `${ageHours}h` : `${ageMin}m`;
        const updatedText = t('streaming.updatedAgo', '{time} önce güncellendi').replace('{time}', timeStr);
        const staleText = t('streaming.staleWarning', 'Veriler güncel olmayabilir');
        if (isStale) {
            freshnessHTML = `<p class="label streaming-freshness streaming-freshness--stale">
                <span class="material-symbols-outlined" style="font-size:18px;vertical-align:-4px">warning</span>
                ${staleText}</p>`;
        } else {
            freshnessHTML = `<p class="label streaming-freshness">${updatedText}</p>`;
        }
    }

    // Fallback indicator
    const fallbackHTML = streamingData.fallback
        ? `<span class="label" style="color:var(--text-muted);font-size:12px"> ${t('streaming.tmdbFallback', '(TMDB verisi)')}</span>`
        : '';

    return `
        <div class="streaming-section">
            <h3 class="detail-section-heading">${sectionLabel}${fallbackHTML}</h3>
            ${groupsHTML}
            ${freshnessHTML}
        </div>`;
}

/**
 * Build cinema release badge (overlaid on poster top-left).
 */
function buildCinemaBadgeHTML(type, details) {
    if (type !== 'movie') return '';

    const t = (key, fallback) => window.i18n?.t(key) !== key ? window.i18n.t(key) : fallback;
    const locale = state.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
    const now = new Date();

    const trRelease = state.currentTurkishReleaseDate;

    // Path 1: Turkish-specific release info available
    if (trRelease && trRelease.date) {
        const releaseType = trRelease.type; // 3 = theatrical, 4 = digital
        const releaseDate = new Date(trRelease.date);
        const diffDays = (releaseDate - now) / (1000 * 60 * 60 * 24);
        const formattedDate = releaseDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' });

        if (releaseType === 3) {
            if (diffDays > 0) {
                return `<div class="cinema-badge">${t('cinema.inCinemasDate', '{date} sinemalarda').replace('{date}', formattedDate)}</div>`;
            } else if (diffDays > -60) {
                return `<div class="cinema-badge cinema-badge--active">${t('cinema.nowInCinemas', 'Şu an sinemalarda')}</div>`;
            }
            return '';
        } else if (releaseType === 4) {
            if (diffDays > 0) {
                // Upcoming digital — red ribbon
                return `<div class="cinema-badge">${t('cinema.streamingDate', '{date} yayına giriyor').replace('{date}', formattedDate)}</div>`;
            }
            return '';
        }
    }

    // Path 2: Fallback — generic upcoming based on details.release_date
    if (details?.release_date) {
        const releaseDate = new Date(details.release_date);
        if (!isNaN(releaseDate.getTime()) && releaseDate > now) {
            const formattedDate = releaseDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
            return `<div class="cinema-badge">${t('cinema.upcomingDate', '{date} vizyonda').replace('{date}', formattedDate)}</div>`;
        }
    }

    return '';
}

/**
 * Build trivia & awards section with Premium gate.
 */
function buildTriviaGateHTML(allRatings) {
    // Awards from OMDb — show when available, hide "N/A" or empty
    const awards = allRatings?.awards;
    if (!awards || awards === 'N/A' || awards.trim() === '') return '';

    return `
        <div class="detail-section">
            <h3 class="detail-section-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                Oduller
            </h3>
            <p style="color:var(--text-secondary);font-size:0.9375rem;line-height:1.6">${awards}</p>
        </div>`;
}

function buildCastHTML(credits) {
    let html = '';

    // Crew — Director, Writer, Producer (compact list above cast)
    if (credits?.crew?.length) {
        const keyRoles = ['Director', 'Writer', 'Screenplay', 'Producer', 'Music', 'Director of Photography'];
        const seen = new Set();
        const crewItems = [];

        for (const person of credits.crew) {
            if (keyRoles.includes(person.job) && !seen.has(person.name + person.job)) {
                seen.add(person.name + person.job);
                const roleMap = {
                    'Director': 'Yonetmen',
                    'Writer': 'Senarist',
                    'Screenplay': 'Senarist',
                    'Producer': 'Yapimci',
                    'Music': 'Muzik',
                    'Director of Photography': 'Goruntu Yonetmeni',
                };
                crewItems.push({ name: person.name, role: roleMap[person.job] || person.job, id: person.id });
            }
        }

        if (crewItems.length > 0) {
            html += `
                <div class="detail-section">
                    <h3 class="detail-section-heading">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="m15.2 8.4-2.1 2.1M22 2l-7.6 7.6"/><circle cx="12" cy="12" r="10"/><path d="M2 12h4"/><path d="M12 2v4"/></svg>
                        Ekip
                    </h3>
                    <div style="display:flex;flex-wrap:wrap;gap:var(--space-sm)">
                        ${crewItems.slice(0, 6).map(c => `
                            <div class="detail-info-pill" data-person-id="${c.id}" role="button" tabindex="0" style="cursor:pointer">
                                <span class="detail-info-label">${c.role}</span>
                                <span class="detail-info-value">${c.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // Cast — actor photos in horizontal scroll
    if (credits?.cast?.length) {
        const castCards = credits.cast.slice(0, 15).map(person => {
            const photoUrl = person.profile_path
                ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                : '';
            return `
                <div class="detail-cast-card" data-person-id="${person.id}"
                    role="button" tabindex="0" aria-label="${person.name}" style="cursor:pointer">
                    ${photoUrl
                        ? `<img src="${photoUrl}" alt="${person.name}" class="detail-cast-photo" loading="lazy">`
                        : `<div class="detail-cast-photo-placeholder">👤</div>`
                    }
                    <span class="detail-cast-name">${person.name}</span>
                    <span class="detail-cast-character">${person.character || ''}</span>
                </div>
            `;
        }).join('');

        html += `
            <div class="detail-section">
                <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Oyuncular</h3>
                <div class="detail-cast-scroll">${castCards}</div>
            </div>
        `;
    }

    return html;
}

function buildProvidersHTML(providers) {
    const regionData = providers;
    if (!regionData) return '';

    // Merge all providers, deduplicate by provider_id
    const allProviders = [
        ...(regionData.flatrate || []),
        ...(regionData.rent || []),
        ...(regionData.buy || []),
    ];
    const seen = new Set();
    const unique = allProviders.filter(p => {
        if (seen.has(p.provider_id)) return false;
        seen.add(p.provider_id);
        return true;
    });

    if (unique.length === 0) return '';

    const logos = unique.slice(0, 10).map(p => `
        <img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}" class="detail-provider-logo-compact">
    `).join('');

    return `
        <div class="detail-section detail-providers-compact">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>Nereden İzlenir?</h3>
            <div class="detail-providers-row-compact">${logos}</div>
        </div>
    `;
}

function buildVideosHTML() {
    const videos = state.currentVideos || {};
    const trailerCount = videos.trailer?.length || 0;
    const btsCount = videos.behindTheScenes?.length || 0;
    const interviewCount = videos.interviews?.length || videos.reviews?.length || 0;

    if (trailerCount + btsCount + interviewCount === 0) return '';

    const t = (key, fallback) => window.i18n?.t(key) !== key ? window.i18n.t(key) : fallback;
    const trailersLabel = t('videos.trailers', 'Fragmanlar');
    const btsLabel = t('videos.behindTheScenes', 'Kamera Arkası');
    const interviewsLabel = t('videos.interviews', 'Röportajlar');

    return `
        <div class="detail-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>Videolar</h3>
            <div class="video-tabs">
                <button class="video-tab active" data-category="trailer">${trailersLabel}${trailerCount ? ` (${trailerCount})` : ''}</button>
                <button class="video-tab" data-category="behindTheScenes">${btsLabel}${btsCount ? ` (${btsCount})` : ''}</button>
                <button class="video-tab" data-category="interviews">${interviewsLabel}${interviewCount ? ` (${interviewCount})` : ''}</button>
            </div>
            <div id="video-container" class="video-scroll"></div>
        </div>
    `;
}

/**
 * Build date & series metadata section
 * Movies: Turkish theatrical release or global release date
 * TV: first_air_date – last_air_date year range, season/episode count, status, next season info
 */
function buildDateMetaHTML(details, type) {
    const items = [];

    if (type === 'movie') {
        // Turkish release date from API.getReleaseDates
        const trRelease = state.currentTurkishReleaseDate;
        if (trRelease?.date) {
            const trDate = new Date(trRelease.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="detail-info-label">TR Vizyon</span><span class="detail-info-value">${trDate}</span></div>`);
        }
        // Global release date
        if (details.release_date) {
            const globalDate = new Date(details.release_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span class="detail-info-label">Yayın</span><span class="detail-info-value">${globalDate}</span></div>`);
        }
    } else if (type === 'tv') {
        // Year range
        const startYear = details.first_air_date?.substring(0, 4) || '';
        const lastYear = details.last_air_date?.substring(0, 4) || '';
        const isEnded = details.status === 'Ended' || details.status === 'Canceled';
        const yearRange = startYear ? (isEnded ? `${startYear} – ${lastYear}` : `${startYear} – Devam Ediyor`) : '';

        if (yearRange) {
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span class="detail-info-label">Dönem</span><span class="detail-info-value">${yearRange}</span></div>`);
        }
        // First air date
        if (details.first_air_date) {
            const firstAirDate = new Date(details.first_air_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg><span class="detail-info-label">İlk Yayın</span><span class="detail-info-value">${firstAirDate}</span></div>`);
        }
        // Season & Episode count
        const seasonEp = [];
        if (details.number_of_seasons) seasonEp.push(`${details.number_of_seasons} Sezon`);
        if (details.number_of_episodes) seasonEp.push(`${details.number_of_episodes} Bölüm`);
        if (seasonEp.length) {
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><span class="detail-info-label">Toplam</span><span class="detail-info-value">${seasonEp.join(' · ')}</span></div>`);
        }
        // Status
        const statusLabel = {
            'Returning Series': 'Devam Ediyor',
            'Ended': 'Tamamlandı',
            'Canceled': 'İptal Edildi',
            'In Production': 'Yapım Aşamasında',
            'Planned': 'Planlanıyor',
        };
        if (details.status) {
            items.push(`<div class="detail-info-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="detail-info-label">Durum</span><span class="detail-info-value">${statusLabel[details.status] || details.status}</span></div>`);
        }
        // Next episode / next season info
        if (details.next_episode_to_air) {
            const nextDate = new Date(details.next_episode_to_air.air_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            const nextEpName = details.next_episode_to_air.name || '';
            const seasonNum = details.next_episode_to_air.season_number;
            const epNum = details.next_episode_to_air.episode_number;
            items.push(`<div class="detail-info-pill detail-info-highlight"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span class="detail-info-label">Yeni Bölüm</span><span class="detail-info-value">S${seasonNum}E${epNum}${nextEpName ? ` — ${nextEpName}` : ''}<br><small>${nextDate}</small></span></div>`);
        }
    }

    if (items.length === 0) return '';

    return `
        <div class="detail-section detail-info-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Bilgiler</h3>
            <div class="detail-info-pills">${items.join('')}</div>
        </div>
    `;
}

// buildSeriesInfoHTML is deprecated — series info handled by buildDateMetaHTML

function buildPremiumSectionHTML() {
    // Check premium status — default to locked
    const isPremium = state.isPremium || false;

    if (isPremium) {
        // TODO: render actual trivia/goofs content when available
        return `
            <div class="detail-section detail-premium-section detail-premium-unlocked">
                <h3 class="detail-section-heading">✨ Premium İçerik</h3>
                <div class="detail-premium-content">
                    <div class="detail-premium-item">
                        <h4>🎬 Trivia</h4>
                        <p class="detail-premium-placeholder">Yakında eklenecek...</p>
                    </div>
                    <div class="detail-premium-item">
                        <h4>🤦 Goofs</h4>
                        <p class="detail-premium-placeholder">Yakında eklenecek...</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="detail-section detail-premium-section detail-premium-locked">
            <div class="detail-premium-header">
                <h3 class="detail-section-heading">Premium İçerik</h3>
                <span class="detail-premium-lock">🔒</span>
            </div>
            <div class="detail-premium-blur-wrap">
                <div class="detail-premium-blur-overlay"></div>
                <div class="detail-premium-blur-content">
                    <div class="detail-premium-skeleton-row">
                        <div class="detail-premium-skeleton-circle"></div>
                        <div class="detail-premium-skeleton-lines">
                            <div class="detail-premium-skeleton-line short"></div>
                            <div class="detail-premium-skeleton-line"></div>
                        </div>
                    </div>
                    <div class="detail-premium-skeleton-block"></div>
                </div>
                <div class="detail-premium-cta-layer">
                    <p class="detail-premium-cta-text">Trivia, goofs ve özel içeriklere erişmek için</p>
                    <button class="detail-premium-cta-btn" onclick="window.showPremiumModal && window.showPremiumModal()">
                        <span>Premium'a Geç</span>
                        <span>✨</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to detail modal
 */
export function attachDetailEventListeners(details, type, itemId) {
    // Like button
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.onclick = () => {
            const isLiked = toggleLike(
                itemId,
                type,
                details.title || details.name,
                details.poster_path,
                details.vote_average,
                details.release_date || details.first_air_date
            );
            likeBtn.classList.toggle('active', isLiked);
            const svgPath = likeBtn.querySelector('svg');
            if (svgPath) svgPath.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        };
    }

    // Watchlist button
    const watchlistBtn = document.getElementById('watchlist-btn');
    if (watchlistBtn) {
        watchlistBtn.onclick = () => {
            const isInWatchlist = toggleWatchlist(
                itemId,
                type,
                details.title || details.name,
                details.poster_path,
                details.vote_average,
                details.release_date || details.first_air_date
            );
            watchlistBtn.classList.toggle('active', isInWatchlist);
            const svgPath = watchlistBtn.querySelector('svg');
            if (svgPath) svgPath.setAttribute('fill', isInWatchlist ? 'currentColor' : 'none');
            // Replace label text node ("Listeye Ekle" / "Listede ✓") preserving SVG
            const textNode = Array.from(watchlistBtn.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
            if (textNode) textNode.textContent = isInWatchlist ? ' Listede ✓' : ' Listeye Ekle';
        };
    }

    // Star rating
    initStarRating('stars-container', (rating) => {
        console.log('User rated:', rating);
    });

    // Video tabs
    document.querySelectorAll('.video-tab').forEach(tab => {
        tab.onclick = () => switchVideoCategory(tab.dataset.category);
    });

    // Cast card + crew pill — navigate to person page
    document.querySelectorAll('[data-person-id]').forEach(card => {
        card.addEventListener('click', () => {
            const personId = card.dataset.personId;
            if (!personId) return;
            // Save return context
            state.returnToDetail = { id: itemId, type };
            closeModal();
            if (window.loadPersonPage) {
                window.loadPersonPage(parseInt(personId));
            } else {
                showToast('Kişi sayfası yüklenemedi');
            }
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}

// ============================================
// WINDOW EXPORTS (Legacy Compatibility)
// ============================================

if (typeof window !== 'undefined') {
    window.openDetail = openDetail;
    window.openDetailModal = openDetailModal;
    window.closeModal = closeModal;
    window.playVideo = playVideo;
    window.closeVideo = closeVideo;
    window.toggleLike = toggleLike;
    window.toggleWatchlist = toggleWatchlist;
    window.switchVideoCategory = switchVideoCategory;
}
