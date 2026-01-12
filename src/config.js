// ============================================
// LUMI - Secure Configuration (Vite)
// v1.0.0-alpha
// ============================================

/**
 * Environment-based configuration.
 * API keys are loaded from environment variables.
 * Server-side only keys should use backend proxy.
 */

// Client-side safe configuration (prefixed with VITE_)
export const CONFIG = {
    // TMDB API Key (public, rate-limited)
    TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || '',

    // YouTube Data API Key (public, rate-limited)
    YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY || '',

    // OMDB API Key - IMDb, RT, Metacritic ratings
    OMDB_API_KEY: import.meta.env.VITE_OMDB_API_KEY || '',

    // Defaults
    DEFAULT_COUNTRY: 'TR',
    LANGUAGE: 'tr-TR',

    // App version
    APP_VERSION: import.meta.env.npm_package_version || '1.0.0-alpha',
};

// Firebase Configuration (client-side safe)
export const FIREBASE_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// API URLs - Public endpoints
export const API_URLS = {
    // Direct API calls (with client-side key)
    TMDB_BASE: 'https://api.themoviedb.org/3',
    TMDB_IMAGE: 'https://image.tmdb.org/t/p',
    YOUTUBE_BASE: 'https://www.googleapis.com/youtube/v3',
    OMDB_BASE: 'https://www.omdbapi.com',

    // Backend proxy endpoints (for server-side keys)
    GEMINI_PROXY: '/api/gemini',
    REVENUECAT_PROXY: '/api/revenuecat',
    RAPIDAPI_PROXY: '/api/rapidapi',
};

// Development mode check
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Validate required environment variables in development
if (isDevelopment) {
    const requiredVars = ['VITE_TMDB_API_KEY', 'VITE_FIREBASE_API_KEY'];
    const missing = requiredVars.filter(key => !import.meta.env[key]);

    if (missing.length > 0) {
        console.warn('[Config] Missing environment variables:', missing);
        console.warn('[Config] Please check your .env.local file');
    }
}

// Legacy compatibility - window.CONFIG for non-module scripts
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.API_URLS = API_URLS;
}
