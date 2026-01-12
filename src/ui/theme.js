/**
 * LUMI - Theme Management
 * v1.1.0
 * 
 * Handles dark/light theme switching and persistence.
 */

// Note: Using window.state for legacy compatibility

/**
 * Load theme from localStorage on app start
 */
export function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (window.state) window.state.theme = savedTheme;
    updateThemeIcon();
    updateLogoForTheme();
}

/**
 * Toggle between dark and light themes
 */
export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if (window.state) window.state.theme = newTheme;

    updateThemeIcon();
    updateLogoForTheme();
}

/**
 * Update theme toggle icon
 */
export function updateThemeIcon() {
    const themeBtn = document.getElementById('theme-btn');
    if (!themeBtn) return;

    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = themeBtn.querySelector('.material-symbols-outlined');

    if (icon) {
        icon.textContent = currentTheme === 'dark' ? 'dark_mode' : 'light_mode';
    }
}

/**
 * Update logo based on current theme
 */
export function updateLogoForTheme() {
    const logo = document.getElementById('brand-logo');
    if (!logo) return;

    // Logo is text-based, theme handles via CSS variables
    // This function can be extended for image logos
}

/**
 * Get current theme
 * @returns {string} 'dark' or 'light'
 */
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.loadTheme = loadTheme;
    window.toggleTheme = toggleTheme;
}
