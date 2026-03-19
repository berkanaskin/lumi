/**
 * LUMI - Diversity Section Component
 * v1.0.0
 *
 * "Belki de bunu beğenirsin" / "You Might Also Like"
 * Reusable component for displaying diversity injection results
 */

import { createMovieCard } from './movie-card.js';

/**
 * Render diversity section with results
 * @param {Array} diversityResults - Array of movie/TV results
 * @returns {string} HTML string for diversity section
 */
export function renderDiversitySection(diversityResults) {
    if (!diversityResults || diversityResults.length === 0) {
        return '';
    }

    const containerDiv = document.createElement('div');
    containerDiv.className = 'results-diversity-content';

    // Header
    const header = document.createElement('h3');
    header.className = 'diversity-header';
    header.textContent = 'Belki de bunu beğenirsin'; // Turkish: "You might like this"
    containerDiv.appendChild(header);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'diversity-subtitle';
    subtitle.textContent = 'Yeni türleri keşfet'; // Turkish: "Explore new genres"
    containerDiv.appendChild(subtitle);

    // Cards grid
    const grid = document.createElement('div');
    grid.className = 'diversity-cards-grid';

    diversityResults.forEach(result => {
        const mediaType = result.media_type || 'movie';
        const card = createMovieCard(result, mediaType);
        grid.appendChild(card);
    });

    containerDiv.appendChild(grid);

    return containerDiv.innerHTML;
}

/**
 * Get diversity results (items from genres NOT in user's watchlist)
 * @param {Array} allResults - All search results
 * @param {Array} userTopGenres - User's top genres from watchlist
 * @param {number} diversityRatio - Ratio of diversity items (default 0.15 = 15%)
 * @returns {Object} { primary, diversity }
 */
export function filterDiversityResults(allResults, userTopGenres, diversityRatio = 0.15) {
    const primary = [];
    const diversity = [];

    allResults.forEach(item => {
        const itemGenres = item.genres || [];
        const matchesUserGenres = itemGenres.some(g => userTopGenres.includes(g));

        if (matchesUserGenres && primary.length < allResults.length * (1 - diversityRatio)) {
            primary.push(item);
        } else if (!matchesUserGenres && diversity.length < Math.ceil(allResults.length * diversityRatio)) {
            diversity.push(item);
        } else {
            primary.push(item);
        }
    });

    return { primary, diversity };
}
