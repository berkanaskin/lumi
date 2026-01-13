// ============================================
// LUMI - Profile Feature Module
// v0.12.0
// Profile, authentication, and user management
// ============================================

import { state } from '../lib/state.js';
import { showToast } from '../ui/toast.js';

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Load authentication state
 */
export function loadAuth() {
    if (!window.AuthService) {
        console.warn('[loadAuth] AuthService not available');
        return;
    }

    state.currentUser = window.AuthService.getCurrentUser();

    // Check localStorage for premium tier (set by purchase)
    const savedTier = localStorage.getItem('userTier');
    if (savedTier) {
        state.userTier = savedTier;
    } else if (state.currentUser) {
        state.userTier = state.currentUser.tier || 'free';
    } else {
        state.userTier = 'guest';
    }

    console.log('User loaded:', state.currentUser?.name, 'Tier:', state.userTier);
    updateAuthUI();
}

/**
 * Update auth area in header
 */
export function updateAuthUI() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) {
        return;
    }

    const i18n = window.i18n || { t: (key) => key };

    if (state.currentUser) {
        // User is logged in - show avatar with dropdown
        const initial = state.currentUser.name?.charAt(0).toUpperCase() || '👤';
        const isPremium = state.userTier === 'premium';

        authArea.innerHTML = `
            <div class="user-menu-container">
                <button class="user-avatar-btn" id="user-menu-btn">
                    <span class="user-avatar">${initial}</span>
                    <span class="user-name-text">${state.currentUser.name?.split(' ')[0] || i18n.t('guest')}</span>
                    <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
                <div class="user-dropdown" id="user-dropdown">
                    <a href="#" class="dropdown-item" data-action="profile">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        ${i18n.t('sectionProfile')}
                    </a>
                    <a href="#" class="dropdown-item" data-action="favorites">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                        ${i18n.t('navFavorites')}
                    </a>
                    ${!isPremium ? `
                    <a href="#" class="dropdown-item premium-upgrade" data-action="upgrade">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Premium'a Yükselt
                    </a>
                    ` : ''}
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item logout" data-action="logout">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        ${i18n.t('logout')}
                    </a>
                </div>
            </div>
        `;

        setupUserMenuHandlers();
    } else {
        // Guest - show login button
        authArea.innerHTML = `
            <button class="login-btn" id="login-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                ${i18n.t('login')}
            </button>
        `;
        document.getElementById('login-btn')?.addEventListener('click', openLoginModal);
    }
}

/**
 * Setup user menu dropdown handlers
 */
function setupUserMenuHandlers() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown?.classList.contains('visible');
        closeAllDropdowns();
        if (!isOpen && dropdown) {
            dropdown.classList.add('visible');
        }
    });

    dropdown?.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.remove('visible');

            const action = item.dataset.action;
            switch (action) {
                case 'profile':
                    document.querySelector('.nav-item[data-page="profile"]')?.click();
                    break;
                case 'favorites':
                    document.querySelector('.nav-item[data-page="favorites"]')?.click();
                    break;
                case 'upgrade':
                    if (window.showPremiumModal) {
                        window.showPremiumModal();
                    }
                    break;
                case 'logout':
                    handleLogout();
                    break;
            }
        });
    });

    document.addEventListener('click', () => {
        dropdown?.classList.remove('visible');
    });
}

/**
 * Close all dropdown menus
 */
export function closeAllDropdowns() {
    document.querySelectorAll('.user-dropdown.visible').forEach(d => d.classList.remove('visible'));
}

// ============================================
// LOGIN MODAL
// ============================================

/**
 * Open login modal
 */
export function openLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.add('visible');
    }
}

/**
 * Close login modal
 */
export function closeLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.remove('visible');
    }
}

/**
 * Handle social login
 */
export async function handleSocialLogin(provider) {
    const btn = document.querySelector(`.social-btn.${provider}`);
    if (btn) {
        btn.textContent = 'Giriş yapılıyor...';
    }

    try {
        const user = await window.AuthService.login(provider);
        if (user) {
            state.currentUser = user;
            state.userTier = user.tier;
            closeLoginModal();
            updateAuthUI();

            // Reload home page if needed
            if (window.loadHomePage) {
                await window.loadHomePage();
            }
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('Giriş yapılamadı. Lütfen tekrar deneyin.');
    }
}

/**
 * Handle logout
 */
export async function handleLogout() {
    if (!confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        return;
    }

    try {
        if (window.AuthService) {
            await window.AuthService.logout();
        }
        state.currentUser = null;
        state.userTier = 'guest';
        localStorage.removeItem('userTier');
        localStorage.removeItem('lumi_user');
        updateAuthUI();
        updateProfileAuthUI();
        showToast('Çıkış yapıldı');
    } catch (error) {
        console.error('Logout error:', error);
        state.currentUser = null;
        state.userTier = 'guest';
        updateAuthUI();
        updateProfileAuthUI();
    }
}

// ============================================
// TESTER LOGIN
// ============================================

/**
 * Tester login as free user
 */
export async function handleTesterLoginFree() {
    try {
        if (window.AuthService) {
            await window.AuthService.loginAsTesterFree();
            state.currentUser = window.AuthService.currentUser;
            state.userTier = 'free';
            updateAuthUI();
            updateProfileAuthUI();
            showToast('Test Kullanıcı olarak giriş yapıldı!');
        }
    } catch (error) {
        console.error('Tester login error:', error);
        showToast('Giriş yapılamadı.');
    }
}

/**
 * Tester login as premium user
 */
export async function handleTesterLoginPremium() {
    try {
        if (window.AuthService) {
            await window.AuthService.loginAsTester();
            state.currentUser = window.AuthService.currentUser;
            state.userTier = 'premium';
            localStorage.setItem('userTier', 'premium');
            updateAuthUI();
            updateProfileAuthUI();
            showToast('Test Premium olarak giriş yapıldı!');
        }
    } catch (error) {
        console.error('Tester premium login error:', error);
        showToast('Giriş yapılamadı.');
    }
}

// ============================================
// PROFILE UI
// ============================================

/**
 * Update profile auth UI buttons
 */
export function updateProfileAuthUI() {
    const guestButtons = document.getElementById('guest-buttons');
    const freeUserButtons = document.getElementById('free-user-buttons');
    const premiumUserButtons = document.getElementById('premium-user-buttons');

    // Hide all first
    if (guestButtons) {
        guestButtons.style.display = 'none';
    }
    if (freeUserButtons) {
        freeUserButtons.style.display = 'none';
    }
    if (premiumUserButtons) {
        premiumUserButtons.style.display = 'none';
    }

    const isLoggedIn = window.AuthService && window.AuthService.isLoggedIn();
    const isPremium = window.AuthService && window.AuthService.isPremium();

    if (!isLoggedIn) {
        if (guestButtons) {
            guestButtons.style.display = 'block';
        }
    } else if (isPremium) {
        if (premiumUserButtons) {
            premiumUserButtons.style.display = 'block';
        }
    } else {
        if (freeUserButtons) {
            freeUserButtons.style.display = 'block';
        }
    }
}

/**
 * Get user stats
 */
export function getUserStats() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    const watchlist = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');

    return {
        favoritesCount: favorites.length,
        ratingsCount: Object.keys(userRatings).length,
        watchlistCount: watchlist.length,
        likedCount: likedItems.length,
        tier: state.userTier,
        username: state.currentUser?.name || 'Misafir',
    };
}

/**
 * Get user ratings list
 */
export function getUserRatings() {
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    return Object.entries(userRatings).map(([key, ratingData]) => {
        const [type, id] = key.split('_');
        const rating = typeof ratingData === 'object' ? ratingData.value : ratingData;
        const title = typeof ratingData === 'object' ? ratingData.title : 'Film/Dizi';
        return { key, id, type, rating, title };
    });
}

/**
 * Save user rating
 */
export function saveUserRating(type, id, rating, title) {
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    const key = `${type}_${id}`;
    userRatings[key] = { value: rating, title };
    localStorage.setItem('userRatings', JSON.stringify(userRatings));
}

/**
 * Get user rating for an item
 */
export function getUserRating(type, id) {
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    const key = `${type}_${id}`;
    const rating = userRatings[key];
    return typeof rating === 'object' ? rating.value : rating;
}

// ============================================
// USER REGION
// ============================================

/**
 * Detect user region from IP
 */
export async function detectUserRegion() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return data.country_code || 'TR';
    } catch {
        return 'TR';
    }
}

// ============================================
// WINDOW EXPORTS (Legacy Compatibility)
// ============================================

if (typeof window !== 'undefined') {
    window.loadAuth = loadAuth;
    window.updateAuthUI = updateAuthUI;
    window.openLoginModal = openLoginModal;
    window.closeLoginModal = closeLoginModal;
    window.handleSocialLogin = handleSocialLogin;
    window.handleLogout = handleLogout;
    window.handleTesterLoginFree = handleTesterLoginFree;
    window.handleTesterLoginPremium = handleTesterLoginPremium;
    window.updateProfileAuthUI = updateProfileAuthUI;
    window.getUserStats = getUserStats;
    window.saveUserRating = saveUserRating;
    window.getUserRating = getUserRating;
}
