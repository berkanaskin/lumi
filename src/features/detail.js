// ============================================
// LUMI - Detail Feature Module
// v0.12.0
// Core functions for movie/TV detail modal
// ============================================

import { state, elements } from '../lib/state.js';
import { showToast } from '../ui/toast.js';
import { API } from '../services/api.js';

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
    const loadingText = window.i18n?.t('loading') || 'Yükleniyor...';
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
        // Fetch TMDB data in parallel (except YouTube which needs title info)
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

        // Derive title/year/originalTitle from TMDB response when not passed
        const resolvedTitle = title || details.title || details.name || '';
        const resolvedYear = year || (details.release_date || details.first_air_date || '').substring(0, 4);
        const resolvedOriginal = originalTitle || details.original_title || details.original_name || '';

        // Now fetch YouTube videos with resolved params
        const youtubeVideos = await API.getMovieVideos(resolvedTitle, resolvedYear, resolvedOriginal);

        // Fetch additional data
        const imdbData = null;
        const triviaData = [];
        let allRatings = null;
        let turkishReleaseDate = null;

        if (type === 'movie') {
            turkishReleaseDate = await API.getReleaseDates(id, 'TR');
        }

        const imdbId = await API.getIMDBId(id, type);
        console.log('IMDB ID:', imdbId);

        if (imdbId) {
            try {
                allRatings = await API.getAllRatings(imdbId);
            } catch (innerErr) {
                console.warn('Ratings fetch error:', innerErr);
            }
        }

        // Save to state
        state.currentImdbData = imdbData;
        state.currentTrivia = triviaData;
        state.currentCredits = credits;
        state.currentAllRatings = allRatings;
        state.currentTurkishReleaseDate = turkishReleaseDate;

        // Process videos
        const trailers = tmdbVideos.filter(v => v.type === 'Trailer' || v.type === 'Teaser');
        const btsVideos = tmdbVideos.filter(v => v.type === 'Behind the Scenes' || v.type === 'Featurette');

        state.currentVideos = {
            trailer: mergeVideos(trailers, youtubeVideos.trailer),
            behindTheScenes: mergeVideos(btsVideos, youtubeVideos.behindTheScenes),
            reviews: [...(youtubeVideos.reviews || []), ...(youtubeVideos.interview || [])],
        };

        state.currentVideoCategory = 'trailer';
        state.currentTitle = title;

        // Render the detail view
        renderDetail(details, providers, type, id);
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
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    // Restore bottom nav
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = '';
    }

    // Restore search state if came from search
    if (state.cameFromSearch && state.searchQuery) {
        if (elements.searchInput) {
            elements.searchInput.value = state.searchQuery;
        }
        // Restore scroll position
        if (state.searchScrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, state.searchScrollPosition);
            }, 100);
        }
    }
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

    const videos = state.currentVideos?.[currentVideoCategory] || [];

    if (videos.length === 0) {
        container.innerHTML = '<p class="no-videos">Bu kategoride video bulunamadı.</p>';
        return;
    }

    container.innerHTML = videos.map(v => `
        <div class="video-card" onclick="playVideo('${v.id.videoId}')">
            <div class="video-thumbnail">
                <img src="${v.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${v.id.videoId}/mqdefault.jpg`}" alt="${v.snippet?.title || 'Video'}">
                <div class="play-overlay">▶️</div>
                ${v.isOfficial ? '<span class="official-badge">Resmi</span>' : ''}
            </div>
            <p class="video-title">${v.snippet?.title || 'Video'}</p>
        </div>
    `).join('');
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
export function renderDetail(details, providers, type, itemId) {
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

    // Watch Providers
    const providersHTML = buildProvidersHTML(providers);

    // Videos
    const videosHTML = buildVideosHTML();

    // Build date & series meta
    const dateMetaHTML = buildDateMetaHTML(details, type);

    // Runtime
    const runtime = details.runtime ? `${details.runtime} dk` : '';
    // Episode runtime for TV
    const episodeRuntime = (type === 'tv' && details.episode_run_time?.length)
        ? `~${details.episode_run_time[0]} dk/bölüm` : '';
    const runtimeDisplay = runtime || episodeRuntime;

    // Premium section
    const premiumHTML = buildPremiumSectionHTML();

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
                <div class="detail-poster-wrap">
                    ${posterUrl
                        ? `<img src="${posterUrl}" alt="${title}" class="detail-poster-img">`
                        : `<div class="detail-poster-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg></div>`
                    }
                </div>
                <div class="detail-core-info">
                    <h1 class="detail-title">${title}</h1>
                    <div class="detail-meta">
                        ${runtimeDisplay ? `<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${runtimeDisplay}</span>` : ''}
                    </div>
                    ${tmdbScore ? `
                    <div class="detail-score-badge">
                        <span class="detail-star-icon">★</span>
                        <span class="detail-score-value">${tmdbScore}</span>
                        <span class="detail-score-max">/ 10</span>
                    </div>` : ''}
                    <!-- Inline Ratings (next to score) -->
                    ${ratingsHTML}
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

        <!-- Watch Providers (right after actions) -->
        ${providersHTML}

        <!-- Overview -->
        <div class="detail-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Özet</h3>
            <p class="detail-overview-text">${details.overview || 'Özet bulunamadı.'}</p>
        </div>

        <!-- Cast -->
        ${castHTML}

        <!-- Date & Series Meta -->
        ${dateMetaHTML}

        <!-- Videos -->
        ${videosHTML}

        <!-- Premium Section -->
        ${premiumHTML}

        <!-- Video Player (hidden) -->
        <div id="video-player"></div>
    `;

    // Attach event listeners
    attachDetailEventListeners(details, type, itemId);

    // Initialize video content
    renderVideoContent();
}

// ============================================
// DETAIL SECTION BUILDERS
// ============================================

function buildRatingsHTML(tmdbScore, allRatings) {
    const pills = [];

    if (allRatings) {
        if (allRatings.imdb) {
            pills.push(`<span class="detail-rating-pill"><span class="detail-rating-icon" style="color:#f5c518">★</span> <span class="detail-rating-label">IMDb</span> <strong>${allRatings.imdb}</strong></span>`);
        }
        const rtScore = allRatings.rottenTomatoes?.tomatometer;
        if (rtScore) {
            pills.push(`<span class="detail-rating-pill"><span class="detail-rating-icon">🍅</span> <strong class="detail-rating-rt">${rtScore}%</strong></span>`);
        }
        if (allRatings.metacritic) {
            pills.push(`<span class="detail-rating-pill"><span class="detail-rating-icon" style="color:#22c55e">▣</span> <strong class="detail-rating-meta">${allRatings.metacritic}</strong></span>`);
        }
    }

    if (pills.length === 0) return '';

    return `<div class="detail-inline-ratings">${pills.join('')}</div>`;
}

function buildCastHTML(credits) {
    if (!credits?.cast?.length) return '';

    const castCards = credits.cast.slice(0, 15).map(person => {
        const photoUrl = person.profile_path
            ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
            : '';
        return `
            <div class="detail-cast-card">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="${person.name}" class="detail-cast-photo">`
                    : `<div class="detail-cast-photo-placeholder">👤</div>`
                }
                <span class="detail-cast-name">${person.name}</span>
                <span class="detail-cast-character">${person.character || ''}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="detail-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Oyuncular</h3>
            <div class="detail-cast-scroll">${castCards}</div>
        </div>
    `;
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
    const reviewCount = videos.reviews?.length || 0;

    if (trailerCount + btsCount + reviewCount === 0) return '';

    return `
        <div class="detail-section">
            <h3 class="detail-section-heading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>Videolar</h3>
            <div class="detail-video-tabs">
                <button class="video-tab active" data-category="trailer">Fragman${trailerCount ? ` (${trailerCount})` : ''}</button>
                <button class="video-tab" data-category="behindTheScenes">Kamera Arkası${btsCount ? ` (${btsCount})` : ''}</button>
                <button class="video-tab" data-category="reviews">İncelemeler${reviewCount ? ` (${reviewCount})` : ''}</button>
            </div>
            <div id="video-container" class="detail-video-scroll"></div>
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
            likeBtn.querySelector('span').textContent = isLiked ? '♥' : '♡';
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
            watchlistBtn.querySelector('span').textContent = isInWatchlist ? '✓' : '+';
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
