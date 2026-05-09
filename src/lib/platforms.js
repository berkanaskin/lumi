/**
 * LUMI - Platform URLs
 * v1.1.0
 * 
 * Platform deep linking URLs for streaming services.
 */

export const PLATFORM_URLS = {
    // Global Streaming Platforms
    'Netflix': 'https://www.netflix.com/search?q=',
    'Amazon Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Amazon Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Disney Plus': 'https://www.disneyplus.com/search?q=',
    'Disney+': 'https://www.disneyplus.com/search?q=',
    'Apple TV Plus': 'https://tv.apple.com/search?term=',
    'Apple TV+': 'https://tv.apple.com/search?term=',
    'HBO Max': 'https://play.hbomax.com/search?q=',
    'Max': 'https://play.max.com/search?q=',
    'Hulu': 'https://www.hulu.com/search?q=',
    'Paramount Plus': 'https://www.paramountplus.com/search/?q=',
    'Paramount+': 'https://www.paramountplus.com/search/?q=',
    'Peacock': 'https://www.peacocktv.com/search?q=',
    'Mubi': 'https://mubi.com/search?q=',

    // Turkish Platforms
    'GAIN': 'https://www.gain.tv/search?q=',
    'Gain': 'https://www.gain.tv/search?q=',
    'Exxen': 'https://www.exxen.com/tr/arama?q=',
    'TOD': 'https://www.tod.tv/arama?query=',
    'TOD TV': 'https://www.tod.tv/arama?query=',
    'Tabii': 'https://www.tabii.com/tr/search?q=',
    'TV+': 'https://www.tvplus.com.tr/search?q=',
    'Turk Telekom TV+': 'https://www.tvplus.com.tr/search?q=',
    'Türk Telekom TV+': 'https://www.tvplus.com.tr/search?q=',
    'beIN CONNECT': 'https://www.beinconnect.com.tr/arama?query=',
    'puhuTV': 'https://puhutv.com/arama?q=',

    // Rent/Buy Platforms
    'Google Play Movies': 'https://play.google.com/store/search?q=',
    'YouTube': 'https://www.youtube.com/results?search_query=',
    'iTunes': 'https://itunes.apple.com/search?term=',
    'Vudu': 'https://www.vudu.com/content/movies/search?searchString=',

    // Fallback
    'default': 'https://www.google.com/search?q='
};

/**
 * Display-name map for short platform IDs used in the curated TR catalog
 * (src/data/turkish-platform-catalog.json). Keys are lowercase IDs.
 */
export const PLATFORM_DISPLAY_NAMES = {
    gain: 'Gain',
    exxen: 'Exxen',
    tabii: 'Tabii',
    tod: 'TOD',
    puhutv: 'Puhu TV',
    netflix: 'Netflix',
    atv: 'ATV',
    trt: 'TRT',
    startv: 'Star TV',
    showtv: 'Show TV',
};

/**
 * URL templates for short platform IDs (paired with PLATFORM_DISPLAY_NAMES).
 * Search query suffix is appended by callers.
 */
export const PLATFORM_ID_URLS = {
    gain: 'https://www.gain.tv/search?q=',
    exxen: 'https://www.exxen.com/tr/arama?q=',
    tabii: 'https://www.tabii.com/tr/search?q=',
    tod: 'https://www.tod.tv/arama?query=',
    puhutv: 'https://puhutv.com/arama?q=',
    netflix: 'https://www.netflix.com/search?q=',
    atv: 'https://www.atv.com.tr/arama?q=',
    trt: 'https://www.trtizle.com/arama?q=',
    startv: 'https://www.startv.com.tr/arama?q=',
    showtv: 'https://www.showtv.com.tr/arama?q=',
};

/**
 * Local logo paths for short platform IDs used in the curated TR catalog.
 * These resolve to /public/img/platforms/*.png assets shipped with the app.
 * Use a leading "/img/" so the renderer can detect and skip the TMDB CDN prefix.
 */
export const PLATFORM_LOGO_PATHS = {
    gain: '/img/platforms/gain.png',
    exxen: '/img/platforms/exxen.png',
    tabii: '/img/platforms/tabii.png',
    tod: '/img/platforms/tod.png',
    puhutv: '/img/platforms/puhutv.png',
};

/**
 * Logo overrides for providers whose CDN-supplied logos are broken or missing.
 * Lookup is case-sensitive against provider.serviceName from streaming-cache.js.
 * URLs should resolve to a 40x40 (or larger) PNG.
 */
export const LOGO_OVERRIDES = {
    'HBO Max': 'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4wleZS.png',
    'Max': 'https://image.tmdb.org/t/p/original/jDDC8aYsBwkRgPL7L1stVpRMB7n.png',
};

/**
 * Get a logo URL override for a given provider name (or null if none set).
 * @param {string} providerName
 * @returns {string|null}
 */
export function getLogoOverride(providerName) {
    if (!providerName) return null;
    return LOGO_OVERRIDES[providerName] || null;
}

/**
 * Get platform URL for a movie/show title
 * @param {string} platformName - Name of the streaming platform
 * @param {string} title - Title to search
 * @returns {string} Full URL with encoded title
 */
export function getPlatformUrl(platformName, title) {
    const baseUrl = PLATFORM_URLS[platformName] || PLATFORM_URLS['default'];
    return baseUrl + encodeURIComponent(title);
}

/**
 * Check if platform is a Turkish platform
 * @param {string} platformName - Name of the platform
 * @returns {boolean}
 */
export function isTurkishPlatform(platformName) {
    const turkishPlatforms = ['GAIN', 'Gain', 'Exxen', 'TOD', 'TOD TV', 'Tabii', 'TV+', 'Turk Telekom TV+', 'Türk Telekom TV+', 'beIN CONNECT', 'puhuTV'];
    return turkishPlatforms.includes(platformName);
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.PLATFORM_URLS = PLATFORM_URLS;
}
