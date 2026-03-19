/**
 * LUMI - Theme Management with OS Preference Detection
 * v1.2.0
 *
 * Handles dark/light theme switching with OS preference detection,
 * localStorage persistence, and smooth theme transitions.
 */

/**
 * Initialize theme on app start
 * - Reads localStorage for saved preference
 * - Falls back to OS preference if no saved theme
 * - Applies theme before page render to prevent flash
 */
export function initTheme() {
    // Check for saved preference first
    const savedTheme = localStorage.getItem('theme');

    let themeToApply;

    if (savedTheme) {
        // Use saved preference
        themeToApply = savedTheme;
    } else {
        // Use OS preference
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            themeToApply = 'light';
        } else {
            themeToApply = 'dark';
        }
        // Don't store OS default — respect user's system preference
    }

    applyTheme(themeToApply);
    setupThemeListener();
    updateThemeIcon();
    updateLogoForTheme();

    if (window.state) {
        window.state.theme = themeToApply;
    }
}

/**
 * Apply theme to the document
 * @param {string} theme - 'dark' or 'light'
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update meta theme-color for browser UI
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#050505' : '#f8f9fa');
    }
}

/**
 * Toggle between dark and light themes
 * Saves preference to localStorage
 * @returns {string} The new theme value
 */
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (window.state) {
        window.state.theme = newTheme;
    }

    updateThemeIcon();
    updateLogoForTheme();

    return newTheme;
}

/**
 * Get current theme
 * @returns {string} 'dark' or 'light'
 */
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

/**
 * Set up listener for OS theme preference changes
 * Only applies change if user hasn't manually set a preference
 */
function setupThemeListener() {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', (e) => {
        // Only apply change if user hasn't saved a preference
        const savedTheme = localStorage.getItem('theme');

        if (!savedTheme) {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);

            if (window.state) {
                window.state.theme = newTheme;
            }

            updateThemeIcon();
            updateLogoForTheme();
        }
    });
}

/**
 * Update theme toggle icon
 */
function updateThemeIcon() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const icon = themeBtn.querySelector('.material-symbols-outlined');

    if (icon) {
        icon.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

/**
 * Update logo based on current theme
 * (Extensible for image logo switching)
 */
function updateLogoForTheme() {
    const logo = document.getElementById('brand-logo');
    if (!logo) return;

    // Logo is text-based with CSS variables
    // This function can be extended for theme-specific image logos
}

/**
 * Load theme (legacy compatibility)
 */
export function loadTheme() {
    initTheme();
}

/* Legacy compatibility */
if (typeof window !== 'undefined') {
    window.loadTheme = loadTheme;
    window.toggleTheme = toggleTheme;
    window.initTheme = initTheme;
}
