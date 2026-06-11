/**
 * LUMI - Constants & Configuration
 * v1.1.0
 * 
 * App-wide constants, categories, and configuration values.
 */

// ============================================
// DAILY RECOMMENDATION CONFIG
// ============================================

export const DAILY_REC_KEY = 'lumi_daily_recommendation';

// 04-04-r1 dev/QA override flag'i. Burada yaşıyor ki profile.js, 1.650
// satırlık onboarding.js'i statik import etmeden erişebilsin (lazy chunk).
export const ALWAYS_SHOW_FLAG = 'lumi_always_show_onboarding';

export const DAILY_REC_CATEGORIES = [
    { list: 'popular', label: 'Popüler' },
    { list: 'top_rated', label: 'En İyiler' },
    { list: 'now_playing', label: 'Vizyondakiler' },
    { genres: [18, 10749], label: 'Klasik Drama' },
    { genres: [878, 28], label: 'Aksiyon & Bilim Kurgu' },
    { genres: [35, 14], label: 'Fantastik Komedi' }
];

// ============================================
// GENRE MAPPINGS
// ============================================

export const GENRES = {
    28: 'Aksiyon',
    12: 'Macera',
    16: 'Animasyon',
    35: 'Komedi',
    80: 'Suç',
    99: 'Belgesel',
    18: 'Drama',
    10751: 'Aile',
    14: 'Fantastik',
    36: 'Tarih',
    27: 'Korku',
    10402: 'Müzik',
    9648: 'Gizem',
    10749: 'Romantik',
    878: 'Bilim Kurgu',
    10770: 'TV Film',
    53: 'Gerilim',
    10752: 'Savaş',
    37: 'Western'
};

export const GENRES_EN = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

/**
 * Get genre name by ID
 * @param {number} genreId - Genre ID
 * @param {string} lang - Language code ('tr' or 'en')
 * @returns {string} Genre name
 */
export function getGenreName(genreId, lang = 'tr') {
    const genres = lang === 'en' ? GENRES_EN : GENRES;
    return genres[genreId] || '';
}

/**
 * Get genre ID by name
 * @param {string} name - Genre name
 * @returns {number|null} Genre ID
 */
export function getGenreId(name) {
    const normalized = name.toLowerCase();
    for (const [id, genreName] of Object.entries(GENRES)) {
        if (genreName.toLowerCase() === normalized) {
            return parseInt(id);
        }
    }
    for (const [id, genreName] of Object.entries(GENRES_EN)) {
        if (genreName.toLowerCase() === normalized) {
            return parseInt(id);
        }
    }
    return null;
}

// ============================================
// AI SEARCH PLACEHOLDERS
// ============================================

export const AI_PLACEHOLDERS = [
    'Christopher Nolan tarzı zihin bükücü filmler...',
    "Nostaljik hissettiren 90'lar komedileri...",
    'Yağmurlu bir akşam için hüzünlü ama umutlu bir film...',
    'Tarkovsky gibi yavaş akan, düşündürücü sinema...',
    'Wes Anderson estetiğinde renkli ve tuhaf...',
    'Hayata bakış açımı değiştirecek bir belgesel...',
    'İzlerken zaman durmuş gibi hissedeceğim sinematik bir şaheser...',
    'Aşkı ve kaybı anlamlandıran derin bir anlatı arıyorum...',
    'Finali beni günlerce düşündürecek felsefi bir film...',
];

/**
 * Get random AI search placeholder
 * @returns {string} Random placeholder text
 */
export function getRandomPlaceholder() {
    return AI_PLACEHOLDERS[Math.floor(Math.random() * AI_PLACEHOLDERS.length)];
}

// ============================================
// NE İZLESEM FILTER DEFAULTS
// ============================================

export const DEFAULT_FILTERS = {
    type: 'all',
    style: 'popular',
    genres: [],
    platforms: [],
    era: '',
    page: 1
};

// ============================================
// IMAGE PATHS
// ============================================

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Poster/avatar yoksa harici placeholder servisi yerine yerel data-URI:
// via.placeholder.com yavaş/engellenebilir ve her eksik görselde ağ isteği demek.
export const NO_POSTER_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 342 513'%3E%3Crect width='342' height='513' fill='%2315151a'/%3E%3Ccircle cx='171' cy='240' r='36' fill='%23232330'/%3E%3Crect x='121' y='300' width='100' height='10' rx='5' fill='%23232330'/%3E%3C/svg%3E";
export const NO_AVATAR_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%2315151a'/%3E%3Ccircle cx='60' cy='46' r='22' fill='%23232330'/%3E%3Cellipse cx='60' cy='102' rx='38' ry='26' fill='%23232330'/%3E%3C/svg%3E";

export const IMAGE_SIZES = {
    poster: {
        small: 'w185',
        medium: 'w342',
        large: 'w500',
        original: 'original'
    },
    backdrop: {
        small: 'w300',
        medium: 'w780',
        large: 'w1280',
        original: 'original'
    },
    profile: {
        small: 'w45',
        medium: 'w185',
        large: 'h632',
        original: 'original'
    }
};

/**
 * Get TMDB image URL
 * @param {string} path - Image path from TMDB
 * @param {string} type - Image type (poster, backdrop, profile)
 * @param {string} size - Size (small, medium, large, original)
 * @returns {string} Full image URL
 */
export function getImageUrl(path, type = 'poster', size = 'medium') {
    if (!path) return '';
    const sizeCode = IMAGE_SIZES[type]?.[size] || 'w342';
    return `${TMDB_IMAGE_BASE}/${sizeCode}${path}`;
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.GENRES = GENRES;
    window.getGenreName = getGenreName;
    window.getImageUrl = getImageUrl;
    window.AI_PLACEHOLDERS = AI_PLACEHOLDERS;
}
