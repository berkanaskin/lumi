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

    // Defaults
    // OMDb and Streaming Availability keys are server-side only (api/omdb.js, api/streaming-availability.js)
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

    // Backend proxy endpoints (for server-side keys)
    // OMDb and Streaming Availability keys are server-side only (api/omdb.js, api/streaming-availability.js)
    GEMINI_PROXY: '/api/gemini',
    REVENUECAT_PROXY: '/api/revenuecat',
    RAPIDAPI_PROXY: '/api/rapidapi',
    EMBEDDINGS_PROXY: '/api/embeddings',
    METRICS_PROXY: '/api/metrics',
    SEARCH_HISTORY_PROXY: '/api/search-history',
};

// OpenAI Configuration (server-side, via Vercel env)
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Embedding Configuration
export const EMBEDDING_CONFIG = {
    model: 'text-embedding-3-small',
    dimensions: 512,
    batchSize: 50,
    confidenceThreshold: 0.75,
};

// Cost Monitoring
export const COST_CONFIG = {
    embeddingCostPer1M: 0.02,  // $/1M tokens
    llmCostPer1M: 0.15,         // $/1M tokens
    monthlyBudgetAlert: 50,     // Alert if > $50/month
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
