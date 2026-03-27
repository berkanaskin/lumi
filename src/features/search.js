// ============================================
// LUMI - Search Feature Module
// v0.12.0
// Search, autocomplete, and results handling
// ============================================

import { state, elements } from '../lib/state.js';
import { CONFIG } from '../config.js';
import { API } from '../services/api.js';
import { renderAutocomplete, getFlatItemsList, getItemText } from '../ui/autocomplete-dropdown.js';

// ============================================
// IMDB RATING CACHE
// ============================================

const imdbRatingCache = new Map();

// ============================================
// AUTOCOMPLETE
// ============================================

/**
 * Handle autocomplete input
 */
export async function handleAutocomplete() {
    const query = elements.searchInput?.value?.trim();

    if (state.autocompleteTimeout) {
        clearTimeout(state.autocompleteTimeout);
    }

    if (!query || query.length < 2) {
        hideAutocomplete();
        return;
    }

    state.autocompleteTimeout = setTimeout(async () => {
        try {
            const data = await API.search(query, state.currentType, state.currentLanguage);

            if (data.results?.length > 0) {
                showAutocomplete(data.results.slice(0, 6));
            } else {
                hideAutocomplete();
            }
        } catch (error) {
            console.error('[handleAutocomplete] Error:', error);
            hideAutocomplete();
        }
    }, 300);
}

/**
 * Show autocomplete dropdown
 */
export function showAutocomplete(results) {
    const dropdown = elements.autocompleteDropdown;
    if (!dropdown) {
        return;
    }

    // Store results for keyboard navigation
    if (!state.autocompleteResults) {
        state.autocompleteResults = [];
        state.activeAutocompleteIndex = -1;
    }
    state.autocompleteResults = results;
    state.activeAutocompleteIndex = -1;

    // Organize results by type
    const suggestions = {
        titles: results.filter(r => r.media_type === 'movie' || r.media_type === 'tv'),
        actors: [],
        genres: [],
    };

    // Render using new component
    dropdown.innerHTML = renderAutocomplete(suggestions, state.activeAutocompleteIndex);

    // Add click handlers to rendered items
    dropdown.querySelectorAll('.autocomplete-item').forEach((itemEl, index) => {
        itemEl.addEventListener('click', () => {
            const result = results[index];
            if (!result) return;

            const mediaType = result.media_type || state.currentType;
            const title = result.title || result.name;
            const original = result.original_title || result.original_name || '';

            // Mark that user came from autocomplete
            state.cameFromAutocomplete = true;
            state.cameFromSearch = false;
            state.searchQuery = '';
            state.searchResults = [];

            hideAutocomplete();

            // Open detail
            if (window.openDetail) {
                window.openDetail(result.id, mediaType, title, '', original);
            }
        });
    });

    dropdown.classList.add('active');
}

/**
 * Hide autocomplete dropdown
 */
export function hideAutocomplete() {
    const dropdown = elements.autocompleteDropdown;
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// ============================================
// SEARCH
// ============================================

/**
 * Handle search submission
 */
export async function handleSearch() {
    const query = elements.searchInput?.value?.trim();
    if (!query) {
        return;
    }

    hideAutocomplete();
    hideAllSections();

    if (elements.searchResultsSection) {
        elements.searchResultsSection.style.display = 'block';
    }

    showLoading();

    if (elements.resultsTitle) {
        elements.resultsTitle.textContent = `"${query}"`;
    }

    try {
        const data = await API.search(query, state.currentType, state.currentLanguage);

        hideLoading();

        if (data.results?.length > 0) {
            // Sort by popularity
            const sortedResults = data.results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

            // Save search state
            state.searchQuery = query;
            state.searchResults = sortedResults;
            state.searchResultsVisible = true;

            // Add to search history
            addToSearchHistory(query);

            // Render results
            renderSearchResults(sortedResults);

            if (elements.resultsCount) {
                elements.resultsCount.textContent = `${sortedResults.length} sonuç`;
            }
        } else {
            state.searchResultsVisible = false;
            showNoResults();
        }
    } catch (error) {
        console.error('[handleSearch] Error:', error);
        hideLoading();
        showNoResults();
    }
}

/**
 * Render search results
 */
export function renderSearchResults(results) {
    if (!elements.resultsGrid) {
        return;
    }

    elements.resultsGrid.innerHTML = '';

    results.forEach(item => {
        const card = createMovieCard(item, item.media_type || 'movie');
        elements.resultsGrid.appendChild(card);
    });
}

/**
 * Create movie card element
 */
export function createMovieCard(item, mediaType) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date;
    const year = date ? new Date(date).getFullYear() : '';
    const tmdbRating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : '';

    const ratingBadgeId = `rating-${item.id}-${mediaType}`;

    card.innerHTML = `
        <div class="movie-poster">
            ${posterUrl
            ? `<img src="${posterUrl}" alt="${title}" loading="lazy">`
            : '<div class="no-image">🎬</div>'
        }
            <span class="card-badge">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
            ${tmdbRating ? `<span class="rating-badge" id="${ratingBadgeId}">⭐ ${tmdbRating}</span>` : ''}
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <span class="movie-year">${year}</span>
        </div>
    `;

    card.addEventListener('click', () => {
        if (window.openDetail) {
            window.openDetail(item.id, mediaType, title, year, item.original_title || item.original_name);
        }
    });

    // Fetch IMDB rating asynchronously
    if (tmdbRating) {
        fetchIMDBRatingForCard(item.id, mediaType, ratingBadgeId);
    }

    return card;
}

// ============================================
// IMDB RATING
// ============================================

/**
 * Fetch IMDB rating for a card
 */
export async function fetchIMDBRatingForCard(tmdbId, mediaType, badgeId) {
    const cacheKey = `${mediaType}_${tmdbId}`;

    // Check cache first
    if (imdbRatingCache.has(cacheKey)) {
        const cachedRating = imdbRatingCache.get(cacheKey);
        if (cachedRating) {
            updateRatingBadge(badgeId, cachedRating);
        }
        return;
    }

    try {
        // Get IMDB ID from TMDB first
        const imdbId = await API.getIMDBId(tmdbId, mediaType);
        if (!imdbId) {
            imdbRatingCache.set(cacheKey, null);
            return;
        }

        // Fetch rating from movies-ratings2 API
        const response = await fetch(
            `https://movies-ratings2.p.rapidapi.com/ratings?id=${imdbId}`,
            {
                headers: {
                    'X-RapidAPI-Key': CONFIG.MOVIEDB_API_KEY || '',
                    'X-RapidAPI-Host': 'movies-ratings2.p.rapidapi.com',
                },
            }
        );

        if (!response.ok) {
            imdbRatingCache.set(cacheKey, null);
            return;
        }

        const data = await response.json();
        const ratings = data.ratings || data;
        const imdbRating = ratings.imdb?.score || ratings.imdb?.rating;

        if (imdbRating) {
            imdbRatingCache.set(cacheKey, imdbRating);
            updateRatingBadge(badgeId, imdbRating);
        } else {
            imdbRatingCache.set(cacheKey, null);
        }
    } catch {
        // Silently fail - keep TMDB rating
        imdbRatingCache.set(cacheKey, null);
    }
}

/**
 * Update rating badge with IMDB rating
 */
export function updateRatingBadge(badgeId, rating) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : rating;
        badge.textContent = `⭐ ${formattedRating}`;
        badge.classList.add('imdb-loaded');
        badge.title = 'IMDB Rating';
    }
}

// ============================================
// SEARCH HISTORY
// ============================================

const SEARCH_HISTORY_KEY = 'lumi_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Get search history
 */
export function getSearchHistory() {
    try {
        return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Add to search history
 */
export function addToSearchHistory(query) {
    if (!query || query.length < 2) {
        return;
    }

    const history = getSearchHistory();

    // Remove if already exists
    const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());

    // Add to beginning
    filtered.unshift(query);

    // Limit to max items
    const limited = filtered.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limited));
}

/**
 * Clear search history
 */
export function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/**
 * Remove from search history
 */
export function removeFromSearchHistory(query) {
    const history = getSearchHistory();
    const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Show loading state
 */
export function showLoading() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.classList.add('visible');
    }
}

/**
 * Hide loading state
 */
export function hideLoading() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.classList.remove('visible');
    }
}

/**
 * Hide all sections
 */
export function hideAllSections() {
    const sections = ['home', 'discover-view', 'profile-view', 'favorites-view', 'search-results'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });
}

/**
 * Show no results message
 */
export function showNoResults() {
    if (elements.resultsGrid) {
        elements.resultsGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>Sonuç Bulunamadı</h3>
                <p>Farklı bir arama terimi deneyin.</p>
            </div>
        `;
    }
    if (elements.resultsCount) {
        elements.resultsCount.textContent = '0 sonuç';
    }
}

/**
 * Clear search and restore home
 */
export function clearSearch() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }

    hideAutocomplete();
    state.searchQuery = '';
    state.searchResults = [];
    state.searchResultsVisible = false;

    // Show home section
    const homeSection = document.getElementById('home');
    if (homeSection) {
        homeSection.style.display = 'block';
    }
    if (elements.searchResultsSection) {
        elements.searchResultsSection.style.display = 'none';
    }
}

// ============================================
// WINDOW EXPORTS (Legacy Compatibility)
// ============================================

if (typeof window !== 'undefined') {
    window.handleAutocomplete = handleAutocomplete;
    // Renamed to avoid overwriting the inline showAutocomplete(query) in index.html
    window.showAutocompleteSuggestions = showAutocomplete;
    window.hideAutocomplete = hideAutocomplete;
    window.handleSearch = handleSearch;
    window.createMovieCard = createMovieCard;
    window.clearSearch = clearSearch;
    window.getSearchHistory = getSearchHistory;
    window.addToSearchHistory = addToSearchHistory;
    window.clearSearchHistory = clearSearchHistory;
}
