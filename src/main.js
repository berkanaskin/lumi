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

// State Management
import {
    state,
    elements,
    initElements,
    updateState,
    loadFavorites,
    APP_VERSION
} from './lib/state.js';

// UI Components
import { showToast } from './ui/toast.js';
import { loadTheme, toggleTheme } from './ui/theme.js';

// Utilities
import { debounce, throttle, formatDate, formatRuntime } from './lib/helpers.js';
import { PLATFORM_URLS, getPlatformUrl } from './lib/platforms.js';

// Styles
import '../index_lumi.css';

// ============================================
// INITIALIZATION
// ============================================

if (isDevelopment) {
    console.log('╔══════════════════════════════════════╗');
    console.log('║         LUMI v' + APP_VERSION + ' - DEV MODE        ║');
    console.log('╠══════════════════════════════════════╣');
    console.log('║  Build: Vite + ES Modules            ║');
    console.log('║  Framework: Vanilla JS               ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('[Lumi] TMDB API:', CONFIG.TMDB_API_KEY ? '✓' : '✗');
    console.log('[Lumi] Firebase:', FIREBASE_CONFIG.apiKey ? '✓' : '✗');
}

// ============================================
// GLOBAL EXPORTS (Legacy Compatibility)
// ============================================

// Make modules available globally for legacy code
window.LumiModules = {
    state,
    elements,
    initElements,
    updateState,
    loadFavorites,
    showToast,
    loadTheme,
    toggleTheme,
    debounce,
    throttle,
    formatDate,
    formatRuntime,
    PLATFORM_URLS,
    getPlatformUrl,
};

// Log successful initialization
console.log('[Lumi] Modular architecture loaded successfully');
console.log('[Lumi] Modules: state, toast, theme, helpers, platforms');

// ============================================
// EXPORT FOR OTHER MODULES
// ============================================

export {
    CONFIG,
    FIREBASE_CONFIG,
    API_URLS,
    state,
    elements,
    showToast,
    loadTheme,
    toggleTheme,
    debounce,
    throttle,
    PLATFORM_URLS,
    APP_VERSION,
};
