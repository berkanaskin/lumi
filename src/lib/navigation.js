/**
 * LUMI - Navigation Controller with Sidebar + Bottom Nav
 * v2.0.0
 *
 * Handles page navigation, sidebar (desktop) and bottom nav (mobile)
 * with active state indicators and accessibility.
 */

import { state, updateState } from './state.js';

// ============================================
// PAGE DEFINITIONS
// ============================================

export const PAGES = {
    home: {
        id: 'view-home',
        title: 'Lumi',
        icon: 'home'
    },
    wizard: {
        id: 'view-wizard',
        title: 'Ne İzlesem?',
        icon: 'explore'
    },
    discover: {
        id: 'view-wizard',
        title: 'Ne İzlesem?',
        icon: 'explore'
    },
    search: {
        id: 'search-overlay',
        title: 'Ara',
        icon: 'search'
    },
    favorites: {
        id: 'view-favorites',
        title: 'Listem',
        icon: 'favorite'
    },
    profile: {
        id: 'view-profile',
        title: 'Profil',
        icon: 'person'
    }
};

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Navigate to a page
 * @param {string} page - Page name
 */
export function navigateTo(page) {
    // Normalize page names
    if (page === 'wizard') page = 'wizard';
    if (page === 'discover') page = 'wizard';

    if (!PAGES[page]) {
        console.error('[Nav] Unknown page:', page);
        return;
    }

    // Store previous page
    const previousPage = state.currentPage;

    // Hide all sections
    hideAllSections();

    // Show target section
    const pageConfig = PAGES[page];
    const section = document.getElementById(pageConfig.id);
    if (section) {
        section.classList.add('active');
    }

    // Update state
    updateState({
        currentPage: page,
        lastPage: previousPage
    });

    // Update navigation indicators
    updateActiveNavItem(page);

    // Update header title
    updateHeaderTitle(page);

    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('pageChanged', {
        detail: { page, previousPage }
    }));
}

/**
 * Go back to previous page
 */
export function goBack() {
    if (state.lastPage) {
        navigateTo(state.lastPage);
    } else {
        navigateTo('home');
    }
}

/**
 * Hide all page sections
 */
export function hideAllSections() {
    // Hide all view sections
    document.querySelectorAll('section.view').forEach(section => {
        section.classList.remove('active');
    });

    // Hide search overlay
    const searchOverlay = document.getElementById('search-overlay');
    if (searchOverlay) {
        searchOverlay.classList.remove('active');
    }

    // Hide other overlays
    const viewAllSection = document.getElementById('view-all-section');
    const resultsSection = document.getElementById('results-section');
    if (viewAllSection) viewAllSection.classList.remove('active');
    if (resultsSection) resultsSection.classList.remove('active');
}

/**
 * Update active navigation item (sidebar + bottom nav)
 * @param {string} page - Current page name
 */
export function updateActiveNavItem(page) {
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
    });

    // Add active to current page nav items
    const navItems = document.querySelectorAll(`.nav-item[data-page="${page}"]`);
    navItems.forEach(item => {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
    });
}

/**
 * Update header title based on current page
 * @param {string} page - Current page name
 */
export function updateHeaderTitle(page) {
    const headerTitle = document.getElementById('header-section-title');
    const pageConfig = PAGES[page];

    if (headerTitle && pageConfig) {
        headerTitle.textContent = pageConfig.title;
    }
}

/**
 * Initialize navigation system
 * Sets up all nav item click handlers and initial state
 */
export function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Allow default navigation if it's an anchor with href
            if (item.tagName === 'A' && item.href) {
                e.preventDefault();
            }

            const page = item.getAttribute('data-page');

            if (page) {
                navigateTo(page);

                // Trigger page-specific loaders if available
                switch (page) {
                    case 'home':
                        if (window.loadHomePage) window.loadHomePage();
                        break;
                    case 'wizard':
                    case 'discover':
                        if (window.loadDiscoverPage) window.loadDiscoverPage();
                        break;
                    case 'search':
                        if (window.loadSearchPage) window.loadSearchPage();
                        break;
                    case 'favorites':
                        if (window.loadFavoritesPage) window.loadFavoritesPage();
                        break;
                    case 'profile':
                        if (window.loadProfilePage) window.loadProfilePage();
                        break;
                }
            }
        });

        // Keyboard support: Enter key
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });

    // Set initial active state
    const currentPage = state.currentPage || 'home';
    updateActiveNavItem(currentPage);
}

/**
 * Setup bottom nav (legacy compatibility)
 */
export function setupBottomNav() {
    initNavigation();
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.navigateTo = navigateTo;
    window.goBack = goBack;
    window.hideAllSections = hideAllSections;
    window.updateActiveNavItem = updateActiveNavItem;
}
