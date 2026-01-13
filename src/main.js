/**
 * LUMI - Main Entry Point
 * v1.1.0
 * 
 * This is the main entry point for the Vite-powered Lumi app.
 * It imports all modules and initializes the application.
 */

// ============================================
// CORE IMPORTS
// ============================================

// Configuration (must be first - sets up window.CONFIG)
import { CONFIG, FIREBASE_CONFIG, API_URLS, isDevelopment } from './config.js';

// API Services (modern replacement for api.js)
import {
    API,
    TMDBService,
    YouTubeService,
    RatingsService
} from './services/api.js';

// State Management
import {
    state,
    elements,
    initElements,
    updateState,
    loadFavorites,
    APP_VERSION
} from './lib/state.js';

// Constants
import {
    GENRES,
    getGenreName,
    getImageUrl,
    AI_PLACEHOLDERS,
    getRandomPlaceholder,
    DAILY_REC_KEY,
    DAILY_REC_CATEGORIES
} from './lib/constants.js';

// Navigation
import {
    navigateTo,
    goBack,
    hideAllSections,
    setupBottomNav,
    PAGES
} from './lib/navigation.js';

// UI Components
import { showToast } from './ui/toast.js';
import { loadTheme, toggleTheme } from './ui/theme.js';
import {
    showLoading,
    hideLoading,
    showNoResults,
    hideNoResults,
    updateArrowVisibility,
    closeAllDropdowns
} from './ui/loading.js';
import {
    createMovieCard,
    createMovieCardHTML,
    renderMoviesToGrid
} from './ui/movie-card.js';

// Utilities
import {
    debounce,
    throttle,
    formatDate,
    formatRuntime,
    truncate,
    escapeHtml,
    getYear,
    isMobile
} from './lib/helpers.js';
import { PLATFORM_URLS, getPlatformUrl, isTurkishPlatform } from './lib/platforms.js';

// Features
import {
    initDiscoverModule,
    handleAISearch,
    handleWizardSearch,
    handleSurpriseMe,
    closeWizardResults,
    loadDailyRecommendation,
    openDailyRecommendation,
    setRandomPlaceholder,
    extractMovieKeywords,
    POETIC_PLACEHOLDERS,
} from './features/discover.js';

import {
    openDetail,
    openDetailModal,
    closeModal,
    playVideo,
    closeVideo,
    toggleLike,
    toggleWatchlist,
    switchVideoCategory,
    mergeVideos,
} from './features/detail.js';

import {
    handleAutocomplete,
    showAutocomplete,
    hideAutocomplete,
    handleSearch,
    clearSearch,
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,
} from './features/search.js';

import {
    loadAuth,
    updateAuthUI,
    openLoginModal,
    closeLoginModal,
    handleSocialLogin,
    handleLogout,
    handleTesterLoginFree,
    handleTesterLoginPremium,
    updateProfileAuthUI,
    getUserStats,
    saveUserRating,
    getUserRating,
    detectUserRegion,
} from './features/profile.js';

// ============================================
// INITIALIZATION
// ============================================

if (isDevelopment) {
    console.log('╔══════════════════════════════════════╗');
    console.log('║         LUMI v' + APP_VERSION + ' - DEV MODE        ║');
    console.log('╠══════════════════════════════════════╣');
    console.log('║  Build: Vite + ES Modules            ║');
    console.log('║  Modules: 10+ loaded                 ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('[Lumi] TMDB API:', CONFIG.TMDB_API_KEY ? '✓' : '✗');
    console.log('[Lumi] Firebase:', FIREBASE_CONFIG.apiKey ? '✓' : '✗');
}

// ============================================
// GLOBAL EXPORTS (Legacy Compatibility)
// ============================================

// Make modules available globally for legacy code
window.LumiModules = {
    // API Services
    API,
    TMDBService,
    YouTubeService,
    RatingsService,

    // Discover Feature
    initDiscoverModule,
    handleAISearch,
    handleWizardSearch,
    handleSurpriseMe,
    closeWizardResults,
    loadDailyRecommendation,
    openDailyRecommendation,
    setRandomPlaceholder,
    extractMovieKeywords,
    POETIC_PLACEHOLDERS,

    // Detail Feature
    openDetail,
    openDetailModal,
    closeModal,
    playVideo,
    closeVideo,
    toggleLike,
    toggleWatchlist,
    switchVideoCategory,
    mergeVideos,

    // Search Feature
    handleAutocomplete,
    showAutocomplete,
    hideAutocomplete,
    handleSearch,
    clearSearch,
    getSearchHistory,
    addToSearchHistory,
    clearSearchHistory,

    // Profile Feature
    loadAuth,
    updateAuthUI,
    openLoginModal,
    closeLoginModal,
    handleSocialLogin,
    handleLogout,
    handleTesterLoginFree,
    handleTesterLoginPremium,
    updateProfileAuthUI,
    getUserStats,
    saveUserRating,
    getUserRating,
    detectUserRegion,

    // State
    state,
    elements,
    initElements,
    updateState,
    loadFavorites,

    // Constants
    GENRES,
    getGenreName,
    getImageUrl,
    AI_PLACEHOLDERS,
    getRandomPlaceholder,
    DAILY_REC_KEY,
    DAILY_REC_CATEGORIES,

    // Navigation
    navigateTo,
    goBack,
    hideAllSections,
    setupBottomNav,
    PAGES,

    // UI
    showToast,
    loadTheme,
    toggleTheme,
    showLoading,
    hideLoading,
    showNoResults,
    hideNoResults,
    updateArrowVisibility,
    closeAllDropdowns,
    createMovieCard,
    createMovieCardHTML,
    renderMoviesToGrid,

    // Helpers
    debounce,
    throttle,
    formatDate,
    formatRuntime,
    truncate,
    escapeHtml,
    getYear,
    isMobile,

    // Platforms
    PLATFORM_URLS,
    getPlatformUrl,
    isTurkishPlatform,
};

// Log successful initialization
console.log('[Lumi] Modular architecture loaded');
console.log('[Lumi] Modules: state, constants, navigation, toast, theme, loading, movie-card, helpers, platforms');

// ============================================
// EXPORT FOR OTHER MODULES
// ============================================

export {
    // Config
    CONFIG,
    FIREBASE_CONFIG,
    API_URLS,
    isDevelopment,

    // API Services
    API,
    TMDBService,
    YouTubeService,
    RatingsService,

    // State
    state,
    elements,
    updateState,
    APP_VERSION,

    // Constants
    GENRES,
    getGenreName,
    getImageUrl,

    // Navigation
    navigateTo,
    goBack,
    hideAllSections,

    // UI
    showToast,
    loadTheme,
    toggleTheme,
    showLoading,
    hideLoading,
    createMovieCard,
    createMovieCardHTML,

    // Helpers
    debounce,
    throttle,
    formatDate,
    formatRuntime,

    // Platforms
    PLATFORM_URLS,
    getPlatformUrl,
};
