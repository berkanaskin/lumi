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
    const year = details.release_date?.substring(0, 4) || details.first_air_date?.substring(0, 4) || '';
    const runtime = details.runtime ? `${Math.floor(details.runtime / 60)}sa ${details.runtime % 60}dk` : '';
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

    // Series-specific info
    const seriesInfoHTML = type === 'tv' ? buildSeriesInfoHTML(details) : '';

    // Turkish release date
    const trRelease = state.currentTurkishReleaseDate;
    const trReleaseHTML = trRelease
        ? `<span class="detail-meta-dot"></span><span>🇹🇷 ${new Date(trRelease).toLocaleDateString('tr-TR')}</span>`
        : '';

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
                        : `<div class="detail-poster-placeholder">🎬</div>`
                    }
                </div>
                <div class="detail-core-info">
                    <h1 class="detail-title">${title}</h1>
                    <div class="detail-meta">
                        <span>${year}</span>
                        ${runtime ? `<span class="detail-meta-dot"></span><span>${runtime}</span>` : ''}
                        ${trReleaseHTML}
                    </div>
                    ${tmdbScore ? `
                    <div class="detail-score-badge">
                        <span class="detail-star-icon">★</span>
                        <span class="detail-score-value">${tmdbScore}</span>
                        <span class="detail-score-max">/ 10</span>
                    </div>` : ''}
                    ${genres ? `<div class="detail-genres">${genres}</div>` : ''}
                    ${seriesInfoHTML}
                </div>
            </div>
        </div>

        <!-- Action Bar -->
        <div class="detail-actions">
            <button id="like-btn" class="detail-action-btn detail-action-like ${isLiked ? 'active' : ''}">
                <div class="detail-action-circle">
                    <span>${isLiked ? '♥' : '♡'}</span>
                </div>
                <span class="detail-action-label">Beğen</span>
            </button>
            <button id="watchlist-btn" class="detail-action-btn detail-action-watchlist ${isInWatchlist ? 'active' : ''}">
                <div class="detail-action-circle">
                    <span>${isInWatchlist ? '✓' : '+'}</span>
                </div>
                <span class="detail-action-label">Listeye Ekle</span>
            </button>
            <button class="detail-action-btn detail-action-rate">
                <div class="detail-action-circle">
                    <span>★</span>
                </div>
                <span class="detail-action-label">Puan Ver</span>
            </button>
        </div>

        <!-- Ratings Row -->
        ${ratingsHTML}

        <!-- Overview -->
        <div class="detail-section">
            <h3 class="detail-section-heading">Özet</h3>
            <p class="detail-overview-text">${details.overview || 'Özet bulunamadı.'}</p>
        </div>

        <!-- Cast -->
        ${castHTML}

        <!-- Watch Providers -->
        ${providersHTML}

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
    const cards = [];

    if (tmdbScore) {
        cards.push(`
            <div class="detail-rating-card">
                <span class="detail-rating-source">TMDB</span>
                <span class="detail-rating-value">${tmdbScore}</span>
            </div>
        `);
    }

    if (allRatings) {
        if (allRatings.imdb) {
            cards.push(`
                <div class="detail-rating-card">
                    <span class="detail-rating-source">IMDb</span>
                    <span class="detail-rating-value">${allRatings.imdb}</span>
                </div>
            `);
        }
        if (allRatings.rottenTomatoes) {
            cards.push(`
                <div class="detail-rating-card">
                    <span class="detail-rating-source">RT</span>
                    <span class="detail-rating-value detail-rating-rt">${allRatings.rottenTomatoes}</span>
                </div>
            `);
        }
        if (allRatings.metacritic) {
            cards.push(`
                <div class="detail-rating-card">
                    <span class="detail-rating-source">METACRITIC</span>
                    <span class="detail-rating-value detail-rating-meta">${allRatings.metacritic}</span>
                </div>
            `);
        }
    }

    if (cards.length === 0) return '';

    return `
        <div class="detail-section detail-ratings-row">
            ${cards.join('')}
        </div>
    `;
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
            <h3 class="detail-section-heading">Oyuncular</h3>
            <div class="detail-cast-scroll">${castCards}</div>
        </div>
    `;
}

function buildProvidersHTML(providers) {
    const region = state.currentRegion || 'TR';
    const regionData = providers?.results?.[region] || providers?.results?.US;
    if (!regionData) return '';

    const flatrate = regionData.flatrate || [];
    const rent = regionData.rent || [];
    const buy = regionData.buy || [];
    const allProviders = [...flatrate, ...rent, ...buy];

    // Deduplicate by provider_id
    const seen = new Set();
    const unique = allProviders.filter(p => {
        if (seen.has(p.provider_id)) return false;
        seen.add(p.provider_id);
        return true;
    });

    if (unique.length === 0) return '';

    const logos = unique.slice(0, 8).map(p => `
        <div class="detail-provider-logo">
            <img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
        </div>
    `).join('');

    return `
        <div class="detail-section">
            <h3 class="detail-section-heading">Nereden İzlenir?</h3>
            <div class="detail-providers-row">${logos}</div>
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
            <h3 class="detail-section-heading">Videolar</h3>
            <div class="detail-video-tabs">
                <button class="video-tab active" data-category="trailer">Fragman${trailerCount ? ` (${trailerCount})` : ''}</button>
                <button class="video-tab" data-category="behindTheScenes">Kamera Arkası${btsCount ? ` (${btsCount})` : ''}</button>
                <button class="video-tab" data-category="reviews">İncelemeler${reviewCount ? ` (${reviewCount})` : ''}</button>
            </div>
            <div id="video-container" class="detail-video-grid"></div>
        </div>
    `;
}

function buildSeriesInfoHTML(details) {
    if (!details.number_of_seasons) return '';
    return `
        <div class="detail-series-info">
            <span>📺 ${details.number_of_seasons} Sezon</span>
            ${details.number_of_episodes ? `<span class="detail-meta-dot"></span><span>${details.number_of_episodes} Bölüm</span>` : ''}
            ${details.status ? `<span class="detail-meta-dot"></span><span>${details.status === 'Ended' ? 'Tamamlandı' : details.status === 'Returning Series' ? 'Devam Ediyor' : details.status}</span>` : ''}
        </div>
    `;
}

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
