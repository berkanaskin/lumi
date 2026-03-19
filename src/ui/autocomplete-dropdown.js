/**
 * LUMI - Autocomplete Dropdown Component
 * v1.0.0
 *
 * Reusable component to render autocomplete dropdown with:
 * - Section headers (Titles, Actors, Genres)
 * - Poster thumbnails for title suggestions
 * - Active item highlighting
 * - Keyboard navigation support
 */

import { getImageUrl } from '../lib/constants.js';
import { escapeHtml } from '../lib/helpers.js';

/**
 * Render autocomplete dropdown with suggestions
 * @param {Object} suggestions - Grouped suggestions { titles: [], actors: [], genres: [] }
 * @param {number} activeIndex - Index of currently highlighted item (0-based across all sections)
 * @param {Function} onSelect - Callback when item selected
 * @returns {string} HTML string for dropdown
 */
export function renderAutocomplete(suggestions, activeIndex = -1, onSelect = null) {
    if (!suggestions || ((!suggestions.titles?.length) && (!suggestions.actors?.length) && (!suggestions.genres?.length))) {
        return `
            <div class="autocomplete-empty">
                <div class="autocomplete-empty-icon">🔍</div>
                <div class="autocomplete-empty-text">No matches. Try another search.</div>
            </div>
        `;
    }

    const items = [];
    let currentIndex = 0;

    // Helper to build items array with tracking
    const addItem = (type, data, sectionIndex) => {
        return {
            type,
            data,
            index: currentIndex++,
            isActive: currentIndex - 1 === activeIndex,
        };
    };

    // Titles section
    if (suggestions.titles && suggestions.titles.length > 0) {
        items.push({
            type: 'header',
            text: 'Titles',
            isSection: true,
        });
        suggestions.titles.slice(0, 6).forEach(title => {
            items.push(addItem('title', title, 'titles'));
        });
    }

    // Actors section
    if (suggestions.actors && suggestions.actors.length > 0) {
        items.push({
            type: 'header',
            text: 'Actors',
            isSection: true,
        });
        suggestions.actors.slice(0, 6).forEach(actor => {
            items.push(addItem('actor', actor, 'actors'));
        });
    }

    // Genres section
    if (suggestions.genres && suggestions.genres.length > 0) {
        items.push({
            type: 'header',
            text: 'Genres',
            isSection: true,
        });
        suggestions.genres.slice(0, 6).forEach(genre => {
            items.push(addItem('genre', genre, 'genres'));
        });
    }

    // Build HTML
    const itemsHTML = items.map(item => {
        if (item.type === 'header') {
            return `<div class="autocomplete-header">${escapeHtml(item.text)}</div>`;
        }

        const isActive = item.isActive ? 'active' : '';
        const dataAttrs = `data-index="${item.index}" data-item-type="${item.type}"`;

        switch (item.type) {
            case 'title':
                const title = item.data.title || item.data.name || 'Unknown';
                const year = (item.data.release_date || item.data.first_air_date || '').substring(0, 4);
                const posterUrl = item.data.poster_path
                    ? getImageUrl(item.data.poster_path, 'poster', 'small')
                    : '';
                const mediaType = item.data.media_type || 'movie';

                return `
                    <div class="autocomplete-item ${isActive}" ${dataAttrs}>
                        <div class="autocomplete-poster">
                            ${posterUrl
                        ? `<img src="${posterUrl}" alt="${escapeHtml(title)}" loading="lazy" />`
                        : '<div class="autocomplete-poster-placeholder">🎬</div>'
                    }
                        </div>
                        <div class="autocomplete-content">
                            <div class="autocomplete-title">${escapeHtml(title)}</div>
                            <div class="autocomplete-meta">
                                <span>${year}</span>
                                <span class="autocomplete-type">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
                            </div>
                        </div>
                    </div>
                `;

            case 'actor':
                return `
                    <div class="autocomplete-item autocomplete-actor ${isActive}" ${dataAttrs}>
                        <div class="autocomplete-text">${escapeHtml(item.data)}</div>
                    </div>
                `;

            case 'genre':
                return `
                    <div class="autocomplete-item autocomplete-genre ${isActive}" ${dataAttrs}>
                        <div class="autocomplete-text">${escapeHtml(item.data)}</div>
                    </div>
                `;

            default:
                return '';
        }
    }).join('');

    return `
        <div class="autocomplete-dropdown-content">
            ${itemsHTML}
        </div>
    `;
}

/**
 * Get flat list of all selectable items (for keyboard navigation)
 * @param {Object} suggestions - Grouped suggestions
 * @returns {Array} Array of item objects with type and data
 */
export function getFlatItemsList(suggestions) {
    const items = [];

    if (suggestions.titles && suggestions.titles.length > 0) {
        suggestions.titles.slice(0, 6).forEach(title => {
            items.push({ type: 'title', data: title });
        });
    }

    if (suggestions.actors && suggestions.actors.length > 0) {
        suggestions.actors.slice(0, 6).forEach(actor => {
            items.push({ type: 'actor', data: actor });
        });
    }

    if (suggestions.genres && suggestions.genres.length > 0) {
        suggestions.genres.slice(0, 6).forEach(genre => {
            items.push({ type: 'genre', data: genre });
        });
    }

    return items;
}

/**
 * Get display text for selected item
 * @param {Object} item - Item object { type, data }
 * @returns {string} Display text suitable for input field
 */
export function getItemText(item) {
    if (!item) return '';

    switch (item.type) {
        case 'title':
            return item.data.title || item.data.name || '';
        case 'actor':
        case 'genre':
            return item.data;
        default:
            return '';
    }
}
