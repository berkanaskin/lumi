/**
 * LUMI - Movie Card Component
 * v2.0.0
 *
 * Redesigned movie card with poster-dominant layout,
 * info overlay on hover, and premium Letterboxd-inspired aesthetic.
 */

import { getImageUrl, NO_POSTER_URL } from '../lib/constants.js';
import { escapeHtml } from '../lib/helpers.js';

/**
 * Create a movie card element with poster-dominant layout
 * @param {Object} item - Movie/TV show data
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {Object} options - Additional options
 * @returns {HTMLElement} Card element
 */
export function createMovieCard(item, mediaType = 'movie', options = {}) {
    const {
        showRating = true,
        showYear: _showYear = true,
        lazy = true,
        onClick = null
    } = options;

    const title = item.title || item.name || 'Unknown';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const rating = item.vote_average?.toFixed(1) || 'N/A';
    const posterUrl = item.poster_path
        ? getImageUrl(item.poster_path, 'poster', 'medium')
        : NO_POSTER_URL;

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = item.id;
    card.dataset.type = mediaType;

    // Use innerHTML with escapeHtml for XSS prevention
    card.innerHTML = escapeHtml(`
        <div class="movie-card-image">
            <img
                src="${posterUrl}"
                alt="${title} (${year})"
                ${lazy ? 'loading="lazy"' : ''}
                class="movie-poster"
            />
        </div>
        <div class="movie-card-overlay">
            <div class="movie-card-content">
                <h3 class="movie-title">${title}</h3>
                <p class="movie-year">${year}</p>
                ${showRating ? `<p class="movie-rating">★ ${rating}</p>` : ''}
                <button class="btn-add-watchlist" data-id="${item.id}">
                    Add to Watchlist
                </button>
            </div>
        </div>
    `);

    // Add rating badge if needed
    if (showRating) {
        const ratingBadge = document.createElement('div');
        ratingBadge.className = 'movie-card-rating';
        ratingBadge.innerHTML = `
            <span class="rating-star">⭐</span>
            <span class="rating-value">${rating}</span>
        `;
        card.querySelector('.movie-card-image').appendChild(ratingBadge);
    }

    // Add click handler for detail modal
    card.addEventListener('click', () => {
        if (onClick) {
            onClick(item, mediaType);
        } else if (window.openDetail) {
            window.openDetail(item.id, mediaType, title, year, item.original_title || item.original_name);
        }
    });

    return card;
}

/**
 * Create a movie card HTML string (for innerHTML usage)
 * @param {Object} item - Movie/TV show data
 * @param {string} mediaType - 'movie' or 'tv'
 * @returns {string} HTML string
 */
export function createMovieCardHTML(item, mediaType = 'movie') {
    const title = item.title || item.name || 'Unknown';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const rating = item.vote_average?.toFixed(1) || 'N/A';
    const posterUrl = item.poster_path
        ? getImageUrl(item.poster_path, 'poster', 'medium')
        : NO_POSTER_URL;
    const originalTitle = item.original_title || item.original_name || '';

    // Sanitize for inline onclick
    const escapedTitle = escapeHtml(title).replace(/'/g, "\\'");
    const escapedOriginal = escapeHtml(originalTitle).replace(/'/g, "\\'");

    return `
        <div class="movie-card"
             onclick="openDetail(${item.id}, '${mediaType}', '${escapedTitle}', '${year}', '${escapedOriginal}')"
             data-id="${item.id}"
             data-type="${mediaType}">
            <div class="movie-card-image">
                <img
                    src="${posterUrl}"
                    alt="${escapeHtml(title)}"
                    loading="lazy"
                    class="movie-poster"
                />
                <div class="movie-card-rating">
                    <span class="rating-star">⭐</span>
                    <span class="rating-value">${rating}</span>
                </div>
            </div>
            <div class="movie-card-overlay">
                <div class="movie-card-content">
                    <h3 class="movie-title">${escapeHtml(title)}</h3>
                    <p class="movie-year">${year}</p>
                    <p class="movie-rating">★ ${rating}</p>
                    <button class="btn-add-watchlist" data-id="${item.id}">
                        Add to Watchlist
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create a horizontal slider of movie cards
 * @param {Array} items - Array of movie/TV data
 * @param {string} mediaType - 'movie' or 'tv'
 * @returns {HTMLElement} Slider container
 */
export function createMovieSlider(items, mediaType = 'movie') {
    const container = document.createElement('div');
    container.className = 'movie-slider';

    items.forEach(item => {
        const card = createMovieCard(item, mediaType);
        container.appendChild(card);
    });

    return container;
}

/**
 * Render movies to a grid container
 * @param {HTMLElement} container - Grid container
 * @param {Array} items - Array of movie/TV data
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {boolean} append - Append or replace
 */
export function renderMoviesToGrid(container, items, mediaType = 'movie', append = false) {
    if (!container) {
        console.error('[MovieCard] Container not found');
        return;
    }

    if (!append) {
        container.innerHTML = '';
    }

    items.forEach(item => {
        container.innerHTML += createMovieCardHTML(item, mediaType);
    });
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.createMovieCard = createMovieCard;
    window.createMovieCardHTML = createMovieCardHTML;
}
