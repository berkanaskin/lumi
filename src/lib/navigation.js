/**
 * LUMI - Navigation Controller
 * v1.1.0
 * 
 * Handles page navigation and bottom nav state.
 */

import { state, updateState } from './state.js';

// ============================================
// PAGE DEFINITIONS
// ============================================

export const PAGES = {
    home: {
        id: 'home-section',
        title: 'Lumi',
        icon: 'home'
    },
    discover: {
        id: 'discover-section',
        title: 'Ne İzlesem?',
        icon: 'explore'
    },
    favorites: {
        id: 'favorites-section',
        title: 'Listem',
        icon: 'favorite'
    },
    profile: {
        id: 'profile-section',
        title: 'Profil',
        icon: 'person'
    }
};

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Navigate to a page
 * @param {string} page - Page name (home, discover, favorites, profile)
 */
export function navigateTo(page) {
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

    // Update bottom nav
    updateBottomNav(page);

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
    Object.values(PAGES).forEach(page => {
        const section = document.getElementById(page.id);
        if (section) {
            section.classList.remove('active');
        }
    });

    // Also hide view-all and results sections
    const viewAllSection = document.getElementById('view-all-section');
    const resultsSection = document.getElementById('results-section');

    if (viewAllSection) viewAllSection.classList.remove('active');
    if (resultsSection) resultsSection.classList.remove('active');
}

/**
 * Update bottom navigation active state
 * @param {string} page - Current page name
 */
export function updateBottomNav(page) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const itemPage = item.dataset.page || item.getAttribute('onclick')?.match(/load(\w+)Page/)?.[1]?.toLowerCase();
        if (itemPage === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
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
 * Setup bottom nav click handlers
 */
export function setupBottomNav() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Determine page from data attribute or onclick
            let page = item.dataset.page;
            if (!page) {
                const onclick = item.getAttribute('onclick');
                if (onclick) {
                    if (onclick.includes('loadHomePage')) page = 'home';
                    else if (onclick.includes('loadDiscoverPage')) page = 'discover';
                    else if (onclick.includes('loadFavoritesPage')) page = 'favorites';
                    else if (onclick.includes('loadProfilePage')) page = 'profile';
                }
            }

            if (page) {
                navigateTo(page);

                // Trigger page-specific loaders
                switch (page) {
                    case 'home':
                        if (window.loadHomePage) window.loadHomePage();
                        break;
                    case 'discover':
                        if (window.loadDiscoverPage) window.loadDiscoverPage();
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
    });
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.navigateTo = navigateTo;
    window.goBack = goBack;
    window.hideAllSections = hideAllSections;
}
