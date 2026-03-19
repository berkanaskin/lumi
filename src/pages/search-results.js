/**
 * LUMI - Search Results Page
 * v1.0.0
 *
 * Search results page with infinite scroll pagination,
 * personalization, and diversity injection.
 */

import { state, elements } from '../lib/state.js';
import { API, TMDBService, SearchService, EmbeddingService } from '../services/api.js';
import { showToast } from '../ui/toast.js';
import { createMovieCard } from '../ui/movie-card.js';
import { renderDiversitySection } from '../ui/diversity-section.js';
import { hideAllSections, showLoading, hideLoading } from '../ui/loading.js';

// ============================================
// STATE
// ============================================

const searchState = {
    query: '',
    currentPage: 0,
    resultsPerPage: 12,
    allResults: [],
    diversityResults: [],
    isLoading: false,
    hasMoreResults: true,
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize search results page
 */
export function initSearchResults() {
    // Use existing search container from HTML
    const container = document.getElementById('search-results-container');
    if (!container) {
        console.warn('[SearchResults] Container not found');
        return;
    }

    // Wire up infinite scroll
    setupInfiniteScroll(container);

    console.log('[SearchResults] Initialized');
}

// ============================================
// SEARCH SUBMISSION
// ============================================

/**
 * Handle search form submission from autocomplete or main search
 */
export async function handleSearchSubmit(query) {
    if (!query || typeof query !== 'string') {
        showToast('Please enter a search query');
        return;
    }

    query = query.trim();
    if (query.length < 2) {
        showToast('Please enter a search query');
        return;
    }

    // Reset pagination
    searchState.query = query;
    searchState.currentPage = 0;
    searchState.allResults = [];
    searchState.diversityResults = [];
    searchState.hasMoreResults = true;

    // Load first batch
    await loadSearchBatch(0);

    // Log search query (silent, no blocking)
    const userId = window.AuthService?.currentUser?.uid || 'anonymous';
    EmbeddingService.logSearchQuery(query, userId, searchState.allResults.length).catch(() => {
        // Silently fail
    });
}

/**
 * Load a batch of search results
 */
async function loadSearchBatch(page) {
    if (searchState.isLoading || !searchState.hasMoreResults) {
        return;
    }

    searchState.isLoading = true;
    const container = document.getElementById('search-results-container');
    if (!container) return;

    try {
        // Show loading indicator for first page
        if (page === 0) {
            showLoading();
        }

        const userId = window.AuthService?.currentUser?.uid || 'anonymous';

        // Call hybrid search API
        const response = await SearchService.hybridSearch(searchState.query, userId);

        if (!response || !response.results) {
            throw new Error('Invalid response from search');
        }

        const results = response.results || [];

        // Apply pagination locally (API returns all, we paginate on frontend)
        const startIdx = page * searchState.resultsPerPage;
        const endIdx = startIdx + searchState.resultsPerPage;
        const batchResults = results.slice(startIdx, endIdx);

        if (batchResults.length === 0) {
            if (page === 0) {
                showEmptyState(container);
            }
            searchState.hasMoreResults = false;
        } else {
            // Separate into primary and diversity
            const topGenres = extractUserTopGenres();
            const { primary, diversity } = separateByPersonalization(batchResults, topGenres);

            searchState.allResults.push(...primary);
            searchState.diversityResults.push(...diversity);

            // Render results
            renderSearchResults(container, primary, diversity);
        }

        // Log metric
        EmbeddingService.logMetric({
            type: 'search',
            query: searchState.query,
            resultsCount: searchState.allResults.length,
            source: response.source || 'hybrid',
            confidence: response.confidence || 0.8,
            timestamp: new Date().toISOString(),
        }).catch(() => {
            // Silently fail
        });

        hideLoading();
    } catch (error) {
        console.error('[SearchBatch] Error:', error);
        hideLoading();

        if (searchState.currentPage === 0) {
            showErrorState(container, error);
        } else {
            showToast('Failed to load more results');
        }

        searchState.hasMoreResults = false;
    } finally {
        searchState.isLoading = false;
    }
}

// ============================================
// PERSONALIZATION & DIVERSITY
// ============================================

/**
 * Extract user's top genres from watchlist
 */
function extractUserTopGenres() {
    const watchlist = state.watchlist || [];
    const genreCount = {};

    watchlist.forEach(item => {
        const genres = item.genres || [];
        genres.forEach(g => {
            genreCount[g] = (genreCount[g] || 0) + 1;
        });
    });

    // Return top 5 genres
    return Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g]) => g);
}

/**
 * Separate results into primary (personalized) and diversity
 * Diversity = 10-15% from genres NOT in user's watchlist
 */
function separateByPersonalization(results, userTopGenres) {
    const diversityRatio = 0.15; // 15%
    const primary = [];
    const diversity = [];

    results.forEach(item => {
        const itemGenres = item.genres || [];
        const matchesUserGenres = itemGenres.some(g => userTopGenres.includes(g));

        if (matchesUserGenres) {
            primary.push(item);
        } else if (diversity.length < Math.ceil(results.length * diversityRatio)) {
            diversity.push(item);
        } else {
            primary.push(item);
        }
    });

    return { primary, diversity };
}

// ============================================
// RENDERING
// ============================================

/**
 * Render search results to page
 */
function renderSearchResults(container, primaryResults, diversityResults) {
    const gridContainer = container.querySelector('#search-grid') || container.querySelector('.search-results-grid');
    if (!gridContainer) return;

    // Append primary results
    primaryResults.forEach(result => {
        const mediaType = result.media_type || 'movie';
        const card = createMovieCard(result, mediaType);
        gridContainer.appendChild(card);
    });

    // Add diversity section if has results
    if (diversityResults && diversityResults.length > 0) {
        const diversitySection = document.createElement('div');
        diversitySection.className = 'results-diversity';
        const diversityHTML = renderDiversitySection(diversityResults);
        diversitySection.innerHTML = diversityHTML;
        container.appendChild(diversitySection);
    }
}

/**
 * Show empty state
 */
function showEmptyState(container) {
    const gridContainer = container.querySelector('#search-grid') || container.querySelector('.search-results-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
            <div class="no-results-icon">🔍</div>
            <h3>We didn't find exact matches</h3>
            <p>Try: cozy 90s rom-coms, dark thrillers, anime for beginners</p>
            <div class="no-results-suggestions" style="margin-top: 24px;">
                <button class="suggestion-btn" data-query="cozy 90s rom-coms">Cozy 90s rom-coms</button>
                <button class="suggestion-btn" data-query="dark thrillers">Dark thrillers</button>
                <button class="suggestion-btn" data-query="anime for beginners">Anime for beginners</button>
            </div>
        </div>
    `;

    // Wire up suggestion buttons
    gridContainer.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            handleSearchSubmit(query);
        });
    });
}

/**
 * Show error state
 */
function showErrorState(container, error) {
    const gridContainer = container.querySelector('#search-grid') || container.querySelector('.search-results-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = `
        <div class="error-state" style="grid-column: 1 / -1;">
            <div class="error-icon">⚠️</div>
            <h3>Search temporarily unavailable</h3>
            <p>${error.message || 'Please try again in a moment'}</p>
            <button class="retry-btn" onclick="location.reload()">Try Again</button>
        </div>
    `;
}

// ============================================
// INFINITE SCROLL
// ============================================

/**
 * Setup infinite scroll listener
 */
function setupInfiniteScroll(container) {
    if (!container) {
        container = document.getElementById('search-results-container');
    }
    if (!container) return;

    container.addEventListener('scroll', throttle(() => {
        const scrollPercentage = (container.scrollTop + container.clientHeight) / container.scrollHeight;

        // Load more when at 85% depth
        if (scrollPercentage > 0.85 && searchState.hasMoreResults && !searchState.isLoading) {
            searchState.currentPage++;
            loadSearchBatch(searchState.currentPage);
        }
    }, 300));
}

/**
 * Throttle helper
 */
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

// ============================================
// CLEARING RESULTS
// ============================================

/**
 * Clear search and restore home
 */
export function clearSearchResults() {
    const container = document.getElementById('search-results-container');
    if (!container) return;

    searchState.query = '';
    searchState.currentPage = 0;
    searchState.allResults = [];
    searchState.diversityResults = [];
    searchState.hasMoreResults = true;

    const gridContainer = container.querySelector('#search-grid') || container.querySelector('.search-results-grid');
    if (gridContainer) {
        gridContainer.innerHTML = '';
    }

    const diversitySections = container.querySelectorAll('.results-diversity');
    diversitySections.forEach(section => section.remove());
}

