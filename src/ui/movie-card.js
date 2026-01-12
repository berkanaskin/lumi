/**
 * LUMI - Movie Card Component
 * v1.1.0
 * 
 * Reusable movie/TV card component.
 */

import { getImageUrl } from '../lib/constants.js';
import { escapeHtml } from '../lib/helpers.js';

/**
 * Create a movie card element
 * @param {Object} item - Movie/TV show data
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {Object} options - Additional options
 * @returns {HTMLElement} Card element
 */
export function createMovieCard(item, mediaType = 'movie', options = {}) {
    const {
        showRating = true,
        showYear = true,
        lazy = true,
        onClick = null
    } = options;

    const title = item.title || item.name || 'Unknown';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const rating = item.vote_average?.toFixed(1) || 'N/A';
    const posterUrl = item.poster_path
        ? getImageUrl(item.poster_path, 'poster', 'medium')
        : 'https://via.placeholder.com/342x513?text=No+Poster';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = item.id;
    card.dataset.type = mediaType;

    card.innerHTML = `
        <div class="movie-card-poster">
            <img 
                src="${posterUrl}" 
                alt="${escapeHtml(title)}"
                ${lazy ? 'loading="lazy"' : ''}
            >
            ${showRating ? `
                <div class="movie-card-rating">
                    <span class="rating-star">⭐</span>
                    <span class="rating-value">${rating}</span>
                </div>
            ` : ''}
        </div>
        <div class="movie-card-info">
            <div class="movie-card-title">${escapeHtml(title)}</div>
            ${showYear && year ? `<div class="movie-card-year">${year}</div>` : ''}
        </div>
    `;

    // Add click handler
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
        : 'https://via.placeholder.com/342x513?text=No+Poster';
    const originalTitle = item.original_title || item.original_name || '';

    return `
        <div class="movie-card" 
             onclick="openDetail(${item.id}, '${mediaType}', '${escapeHtml(title).replace(/'/g, "\\'")}', '${year}', '${escapeHtml(originalTitle).replace(/'/g, "\\'")}')"
             data-id="${item.id}" 
             data-type="${mediaType}">
            <div class="movie-card-poster">
                <img src="${posterUrl}" alt="${escapeHtml(title)}" loading="lazy">
                <div class="movie-card-rating">
                    <span class="rating-star">⭐</span>
                    <span class="rating-value">${rating}</span>
                </div>
            </div>
            <div class="movie-card-info">
                <div class="movie-card-title">${escapeHtml(title)}</div>
                <div class="movie-card-year">${year}</div>
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
