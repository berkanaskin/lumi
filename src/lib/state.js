/**
 * LUMI - Global State Management
 * v1.1.0
 * 
 * Centralized state for the entire application.
 * Legacy compatibility: Also exposes to window.state
 */

// ============================================
// APP VERSION
// ============================================
export const APP_VERSION = '1.1.0';

// ============================================
// LANGUAGE TO REGION MAPPING
// ============================================
export const LANGUAGE_REGIONS = {
    'tr': { lang: 'tr-TR', region: 'TR' },
    'en': { lang: 'en-US', region: 'US' },
    'de': { lang: 'de-DE', region: 'DE' },
    'fr': { lang: 'fr-FR', region: 'FR' },
    'es': { lang: 'es-ES', region: 'ES' },
    'it': { lang: 'it-IT', region: 'IT' },
    'pt': { lang: 'pt-BR', region: 'BR' },
    'ru': { lang: 'ru-RU', region: 'RU' },
    'ja': { lang: 'ja-JP', region: 'JP' },
    'ko': { lang: 'ko-KR', region: 'KR' },
    'zh': { lang: 'zh-CN', region: 'CN' },
};

// ============================================
// APPLICATION STATE
// ============================================
export const state = {
    // Current language settings
    currentLanguage: 'tr',
    currentRegion: 'TR',

    // Country detection state (set by GeoIPService on app init)
    countryDetected: false,  // true once auto-detection has run
    countryName: 'Turkey',   // display name for country selector

    // Current page/view
    currentPage: 'home',
    lastPage: null,

    // Search state
    searchQuery: '',
    searchResults: [],

    // Modal state
    modalOpen: false,
    currentModal: null,
    lastScrollPosition: 0,
    lastView: null,

    // Auth state
    currentUser: null,
    userTier: 'guest', // 'guest', 'free', 'premium'

    // Favorites
    favorites: [],
    watchlist: [],

    // Cache
    dailyRecommendation: null,
    trendingCache: null,

    // View All pagination
    viewAllSection: null,
    viewAllPage: 1,
    isLoadingMore: false,
};

// ============================================
// DOM ELEMENTS CACHE
// ============================================
export const elements = {
    // Search
    searchInput: null,
    searchClear: null,
    autocompleteDropdown: null,

    // Navigation
    bottomNav: null,
    navItems: [],

    // Main sections
    homeSection: null,
    discoverSection: null,
    favoritesSection: null,
    profileSection: null,

    // Sliders
    trendingSlider: null,
    newReleasesSlider: null,
    classicsSlider: null,
    suggestedSlider: null,

    // Grids
    resultsGrid: null,
    discoverGrid: null,
    favoritesGrid: null,

    // Modals
    modal: null,
    modalBody: null,
    modalClose: null,

    // Loading
    loadingIndicator: null,
    noResults: null,
};

// ============================================
// INITIALIZE ELEMENTS
// ============================================
export function initElements() {
    elements.searchInput = document.getElementById('search-input');
    elements.searchClear = document.getElementById('search-clear');
    elements.autocompleteDropdown = document.getElementById('autocomplete-dropdown');

    elements.bottomNav = document.querySelector('.bottom-nav');
    elements.navItems = document.querySelectorAll('.nav-item');

    elements.homeSection = document.getElementById('home-section');
    elements.discoverSection = document.getElementById('discover-section');
    elements.favoritesSection = document.getElementById('favorites-section');
    elements.profileSection = document.getElementById('profile-section');

    elements.trendingSlider = document.getElementById('trending-slider');
    elements.newReleasesSlider = document.getElementById('new-releases-slider');
    elements.classicsSlider = document.getElementById('classics-slider');
    elements.suggestedSlider = document.getElementById('suggested-slider');

    elements.resultsGrid = document.getElementById('results-grid');
    elements.discoverGrid = document.getElementById('discover-grid');
    elements.favoritesGrid = document.getElementById('favorites-grid');

    elements.modal = document.getElementById('detail-modal');
    elements.modalBody = document.getElementById('modal-body');
    elements.modalClose = document.getElementById('modal-close');

    elements.loadingIndicator = document.getElementById('loading-indicator');
    elements.noResults = document.getElementById('no-results');
}

// ============================================
// STATE HELPERS
// ============================================
export function updateState(updates) {
    Object.assign(state, updates);
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('stateChanged', { detail: updates }));
}

export function getState(key) {
    return key ? state[key] : state;
}

// ============================================
// FAVORITES HELPERS
// ============================================
export function loadFavorites() {
    try {
        state.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        state.watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    } catch (e) {
        console.error('[State] Failed to load favorites:', e);
        state.favorites = [];
        state.watchlist = [];
    }
}

export function saveFavorites() {
    try {
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
    } catch (e) {
        console.error('[State] Failed to save favorites:', e);
    }
}

export function isFavorite(id) {
    return state.favorites.some(item => item.id === id);
}

export function isInWatchlist(id) {
    return state.watchlist.some(item => item.id === id);
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================
if (typeof window !== 'undefined') {
    window.state = state;
    window.elements = elements;
    window.APP_VERSION = APP_VERSION;
}
