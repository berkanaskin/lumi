/**
 * LUMI - Utility Helpers
 * v1.1.0
 * 
 * Common utility functions used across the application.
 */

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to locale string
 * @param {string} dateStr - Date string
 * @param {string} locale - Locale code (default: 'tr-TR')
 * @returns {string} Formatted date
 */
export function formatDate(dateStr, locale = 'tr-TR') {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format runtime to hours and minutes
 * @param {number} minutes - Runtime in minutes
 * @param {string} lang - Language code
 * @returns {string} Formatted runtime
 */
export function formatRuntime(minutes, lang = 'tr') {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (lang === 'tr') {
        return hours > 0 ? `${hours} sa ${mins} dk` : `${mins} dk`;
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/**
 * Format number with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Get year from date string
 * @param {string} dateStr - Date string
 * @returns {string} Year
 */
export function getYear(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('-')[0];
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 11);
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is iOS
 * @returns {boolean}
 */
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Sleep/delay helper
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.debounce = debounce;
    window.throttle = throttle;
    window.formatDate = formatDate;
    window.formatRuntime = formatRuntime;
}
