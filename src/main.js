/**
 * LUMI - Main Entry Point
 * v1.0.0-alpha
 * 
 * This is the main entry point for the Vite-powered Lumi app.
 * It imports all modules and initializes the application.
 */

// Import configuration first (sets up window.CONFIG for legacy code)
import { CONFIG, FIREBASE_CONFIG, API_URLS, isDevelopment } from './config.js';

// Log startup in development
if (isDevelopment) {
    console.log('[Lumi] Starting in development mode...');
    console.log('[Lumi] Version:', CONFIG.APP_VERSION);
    console.log('[Lumi] TMDB API Key configured:', !!CONFIG.TMDB_API_KEY);
    console.log('[Lumi] Firebase configured:', !!FIREBASE_CONFIG.apiKey);
}

// Import styles
import '../index_lumi.css';

// Legacy script compatibility
// The existing app.js, api.js, i18n.js use global variables
// We'll gradually migrate these to ES modules

// For now, we just ensure the app runs
console.log('[Lumi] Main module loaded successfully');

// Export for other modules
export { CONFIG, FIREBASE_CONFIG, API_URLS };
