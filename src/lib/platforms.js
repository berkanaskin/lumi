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
    'BluTV': 'https://www.blutv.com/ara?q=',
    'blutv': 'https://www.blutv.com/ara?q=',
    'TOD': 'https://www.tod.tv/arama?query=',
    'TOD TV': 'https://www.tod.tv/arama?query=',
    'Tabii': 'https://www.tabii.com/tr/search?q=',
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
    const turkishPlatforms = ['GAIN', 'Gain', 'Exxen', 'BluTV', 'blutv', 'TOD', 'TOD TV', 'Tabii', 'beIN CONNECT', 'puhuTV'];
    return turkishPlatforms.includes(platformName);
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.PLATFORM_URLS = PLATFORM_URLS;
}
