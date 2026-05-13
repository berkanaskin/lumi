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
    RatingsService,
    GeoIPService
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
    initNavigation,
    updateActiveNavItem,
    PAGES
} from './lib/navigation.js';

// Phase 04-03: optional-auth modules — side-effect import installs
// `window.requireAuth` and `window._onAuthResolved` for inline callers.
import './features/auth-modal.js';

// Phase 04-04: first-launch onboarding wizard (3-step lang/country/platforms)
import { shouldShowOnboarding, startOnboarding } from './features/onboarding.js';

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
    handleConsoleSubmit,
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

import { loadFavoritesItems } from './features/favorites-storage.js';

// Expose helper to legacy inline script in index.html (loadFavoritesList).
window.loadFavoritesItems = loadFavoritesItems;

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
    initAuth,
    loadAuth,
    updateAuthUI,
    openLoginModal,
    closeLoginModal,
    handleSocialLogin,
    handleLogout,
    updateProfileAuthUI,
    getUserStats,
    saveUserRating,
    getUserRating,
    detectUserRegion,
} from './features/profile.js';

import {
    initPersonPage,
    loadPersonPage,
} from './features/person.js';

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
    handleConsoleSubmit,
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
    initAuth,
    loadAuth,
    updateAuthUI,
    openLoginModal,
    closeLoginModal,
    handleSocialLogin,
    handleLogout,
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
    initNavigation,
    updateActiveNavItem,
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

    // Person Feature
    initPersonPage,
    loadPersonPage,
};

// Direct window globals for inline script compatibility
// The inline script in index.html accesses these as bare globals
window.state = state;
window.API = API;
window.toggleTheme = toggleTheme;
// Renamed to avoid overwriting the inline showAutocomplete(query) in index.html
// The inline version handles the full query→fetch→render flow needed by the search input.
// The module version (showAutocompleteSuggestions) accepts a pre-fetched results array.
window.showAutocompleteSuggestions = showAutocomplete;
window.openDetailModal = openDetailModal;
window.loadHomePage = window.LumiModules?.loadHomePage; // defined in inline script
window.updateAuthUI = updateAuthUI;
window.loadPersonPage = loadPersonPage;

// ============================================
// APP INITIALIZATION
// ============================================

/**
 * Update the country selector button display.
 */
function updateCountrySelector() {
    const btn = document.getElementById('country-selector');
    if (!btn) return;
    const code = state.currentRegion || 'TR';
    const codeEl = btn.querySelector('.country-code');
    if (codeEl) codeEl.textContent = code.toUpperCase();
    // Hide flag emoji span — Windows renders flag emojis as duplicate text codes
    const flagEl = btn.querySelector('.country-flag');
    if (flagEl) flagEl.style.display = 'none';
}

/**
 * Initialize country selector dropdown.
 */
function initCountrySelector() {
    const btn = document.getElementById('country-selector');
    const dropdown = document.getElementById('country-dropdown');
    if (!btn || !dropdown) return;

    // Set initial display
    updateCountrySelector();

    // Toggle dropdown on button click
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        btn.classList.toggle('active');
    });

    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
        btn.classList.remove('active');
    });

    // Handle country selection
    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.country-item');
        if (!item) return;

        const code = item.dataset.code;
        const name = item.dataset.name;

        state.currentRegion = code;
        state.countryName = name;
        localStorage.setItem('lumi_country', code);
        localStorage.setItem('lumi_country_name', name);

        // Update active item styling
        dropdown.querySelectorAll('.country-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        dropdown.classList.add('hidden');
        btn.classList.remove('active');
        updateCountrySelector();

        // If detail page is open, re-fetch streaming data
        if (state.currentItemId && state.currentItemType) {
            const { openDetail } = window.LumiModules || {};
            if (openDetail) openDetail(state.currentItemId, state.currentItemType);
        }
    });
}

// Phase 04-04: boot-time onboarding trigger.
//
// Runs in parallel with the main DOMContentLoaded boot. Awaits Firebase auth
// state restore (one-shot onAuthStateChanged → currentUser is null at boot
// until the first event fires). For guests, both fields are null/undefined and
// shouldShowOnboarding still works against localStorage flags only. For auth
// users, the Firestore prefs check runs and hydrates LS if found.
//
// Does NOT block DOMContentLoaded — the wizard mounts on top of the rendered
// app and is dismissed by the user (or auto-dismissed if cross-device prefs
// already exist).
async function bootOnboardingCheck() {
    try {
        // Dev/QA reset hook: ?reset-onboarding clears the seen flag + onboarding
        // payload from localStorage, then re-runs the show check so the wizard
        // appears again. Strips the param from the URL so reloads don't loop.
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('reset-onboarding')) {
                localStorage.removeItem('lumi_onboarding_seen');
                localStorage.removeItem('lumi_onboarding');
                params.delete('reset-onboarding');
                const qs = params.toString();
                const newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
                window.history.replaceState({}, '', newUrl);
                console.info('[onboarding] reset via ?reset-onboarding — flag cleared');
            }
        } catch {}

        let user = null;
        let db = null;
        if (typeof window !== 'undefined' && window.firebase) {
            try {
                const auth = window.firebase.auth?.();
                if (auth) {
                    user = await new Promise((resolve) => {
                        const unsub = auth.onAuthStateChanged((u) => {
                            try { unsub(); } catch {}
                            resolve(u);
                        });
                    });
                }
                if (window.firebase.firestore) db = window.firebase.firestore();
            } catch {}
        }
        if (await shouldShowOnboarding({ user, db })) {
            startOnboarding({ user, db });
        }
    } catch (err) {
        console.error('[main] onboarding boot check failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize login wall with Firebase
    initAuth();

    // Phase 04-04: fire-and-forget onboarding check (does not block boot).
    bootOnboardingCheck();

    // Initialize DOM element references
    initElements();

    // Load saved theme
    loadTheme();

    // Wire theme toggle button
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    // Initialize navigation system (sidebar + bottom nav)
    initNavigation();

    // Initialize discover module (loads daily recommendation + timer)
    initDiscoverModule();

    // Load auth state
    loadAuth();
    updateAuthUI();

    // Initialize person page
    initPersonPage();

    // Initialize country selector in header
    initCountrySelector();

    // Auto-detect user country (if not already saved)
    if (!state.countryDetected) {
        const saved = localStorage.getItem('lumi_country');
        if (saved) {
            state.currentRegion = saved;
            // Convert stored country code to locale-appropriate name (handles old 'Turkey' entries)
            try {
                const displayNames = new Intl.DisplayNames(['tr'], { type: 'region' });
                state.countryName = displayNames.of(saved) || localStorage.getItem('lumi_country_name') || saved;
            } catch {
                state.countryName = localStorage.getItem('lumi_country_name') || saved;
            }
            state.countryDetected = true;
            updateCountrySelector();
        } else {
            GeoIPService.detectCountry().then(({ countryCode, countryName }) => {
                state.currentRegion = countryCode;
                state.countryName = countryName;
                state.countryDetected = true;
                localStorage.setItem('lumi_country', countryCode);
                localStorage.setItem('lumi_country_name', countryName);
                updateCountrySelector();
            }).catch(err => {
                console.warn('[Lumi] GeoIP detection failed:', err);
            });
        }
    }

    console.log('[Lumi] App initialized');
});

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
