// ============================================
// LUMI - Profile Feature Module
// v0.12.0
// Profile, authentication, and user management
// ============================================

import { state } from '../lib/state.js';
import { showToast } from '../ui/toast.js';

// ============================================
// LOGIN WALL INITIALIZATION
// ============================================

/**
 * Initialize login wall with Firebase authentication handlers
 */
export function initAuth() {
    // Wire up Google login button
    const googleBtn = document.getElementById('btn-google');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }

    // Wire up email/password form
    const emailForm = document.getElementById('email-login-form-wall');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailLogin);
    }

    // Listen for auth state changes
    window.addEventListener('authStateChanged', (event) => {
        const user = event.detail?.user;
        if (user) {
            hideLoginWall();
        } else {
            showLoginWall();
        }
    });

    // Check initial auth state
    if (window.AuthService) {
        const currentUser = window.AuthService.getCurrentUser?.();
        if (currentUser) {
            hideLoginWall();
        } else {
            showLoginWall();
        }
    }
}

/**
 * Show login wall (blocks access)
 */
export function showLoginWall() {
    const wall = document.getElementById('login-wall');
    if (wall) {
        wall.classList.add('active');
        wall.style.pointerEvents = 'auto';
    }
}

/**
 * Hide login wall (allows access)
 */
export function hideLoginWall() {
    const wall = document.getElementById('login-wall');
    if (wall) {
        wall.classList.remove('active');
        wall.style.pointerEvents = 'none';
    }
}

/**
 * Show login error message
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('visible');
        setTimeout(() => {
            errorDiv.classList.remove('visible');
        }, 5000);
    }
}

/**
 * Handle Google OAuth login
 */
async function handleGoogleLogin() {
    const googleBtn = document.getElementById('btn-google');
    if (googleBtn) {
        googleBtn.textContent = 'Signing in...';
        googleBtn.disabled = true;
    }

    try {
        if (!window.AuthService) {
            showLoginError('Authentication service not available');
            return;
        }

        const user = await window.AuthService.loginWithGoogle();
        if (user) {
            state.currentUser = {
                uid: user.id || user.uid,
                email: user.email,
                displayName: user.name || user.displayName || user.email
            };
            hideLoginWall();
        }
    } catch (error) {
        console.error('[Google Login] Error:', error);
        showLoginError('Login failed: ' + (error.message || 'Unknown error'));
    } finally {
        if (googleBtn) {
            googleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg><span>Continue with Google</span>';
            googleBtn.disabled = false;
        }
    }
}

/**
 * Handle email/password login or signup
 */
async function handleEmailLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email-input-wall');
    const passwordInput = document.getElementById('password-input-wall');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!emailInput?.value || !passwordInput?.value) {
        showLoginError('Please enter email and password');
        return;
    }

    if (submitBtn) {
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
    }

    try {
        if (!window.AuthService) {
            showLoginError('Authentication service not available');
            return;
        }

        let user;

        // Try to login first
        try {
            user = await window.AuthService.loginWithEmail(emailInput.value, passwordInput.value);
        } catch (error) {
            // If login fails and it's a user-not-found error, try to register
            if (error.code === 'auth/user-not-found' || error.message?.includes('user-not-found')) {
                user = await window.AuthService.registerWithEmail(
                    emailInput.value,
                    passwordInput.value,
                    emailInput.value.split('@')[0] // Use email prefix as display name
                );
            } else {
                throw error;
            }
        }

        if (user) {
            state.currentUser = {
                uid: user.id || user.uid,
                email: user.email,
                displayName: user.name || user.displayName || user.email
            };
            hideLoginWall();
            emailInput.value = '';
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('[Email Login] Error:', error);
        showLoginError('Authentication failed: ' + (error.message || 'Unknown error'));
    } finally {
        if (submitBtn) {
            submitBtn.textContent = 'Continue with Email';
            submitBtn.disabled = false;
        }
    }
}

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
        updateHeaderProfileDropdown();
        showToast('Çıkış yapıldı');
    } catch (error) {
        console.error('Logout error:', error);
        state.currentUser = null;
        state.userTier = 'guest';
        updateAuthUI();
        updateProfileAuthUI();
        updateHeaderProfileDropdown();
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

    const isLoggedIn = state.currentUser != null || (window.AuthService && window.AuthService.isLoggedIn());
    const isPremium = state.userTier === 'premium' || (window.AuthService && window.AuthService.isPremium());

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
 * Sync header profile button and dropdown with current login state
 */
export function updateHeaderProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const dropdownInfo = document.getElementById('profile-dropdown-info');
    const loginTrigger = document.getElementById('login-trigger');

    if (state.currentUser) {
        // User logged in — update profile button appearance
        if (profileBtn) {
            profileBtn.classList.remove('guest');
            profileBtn.classList.add('logged-in');
        }
        // Update dropdown header
        if (dropdownInfo) {
            const nameEl = dropdownInfo.querySelector('.profile-dropdown-name');
            const tierEl = dropdownInfo.querySelector('.profile-dropdown-tier');
            const avatarEl = dropdownInfo.querySelector('.profile-dropdown-avatar');
            if (nameEl) nameEl.textContent = state.currentUser.name || 'Kullanıcı';
            if (tierEl) tierEl.textContent = state.userTier === 'premium' ? '⭐ Premium' : 'Ücretsiz';
            if (avatarEl) {
                const initial = state.currentUser.name?.charAt(0).toUpperCase() || '👤';
                avatarEl.innerHTML = `<span class="material-symbols-outlined" style="font-size: 32px; color: var(--accent)">${initial === '👤' ? 'person' : ''}</span>`;
                if (initial !== '👤') {
                    avatarEl.innerHTML = `<span style="font-size: 24px; font-weight: 700; color: var(--accent)">${initial}</span>`;
                }
            }
        }
        // Hide login button, could show logout instead
        if (loginTrigger) {
            loginTrigger.innerHTML = '<span class="material-symbols-outlined">logout</span><span>Çıkış Yap</span>';
            loginTrigger.onclick = () => handleLogout();
        }
    } else {
        // Guest mode
        if (profileBtn) {
            profileBtn.classList.add('guest');
            profileBtn.classList.remove('logged-in');
        }
        if (dropdownInfo) {
            const nameEl = dropdownInfo.querySelector('.profile-dropdown-name');
            const tierEl = dropdownInfo.querySelector('.profile-dropdown-tier');
            if (nameEl) nameEl.textContent = 'Misafir';
            if (tierEl) tierEl.textContent = 'Ücretsiz';
        }
        if (loginTrigger) {
            loginTrigger.innerHTML = '<span class="material-symbols-outlined">login</span><span>Giriş Yap</span>';
            loginTrigger.onclick = () => openLoginModal();
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
    window.updateProfileAuthUI = updateProfileAuthUI;
    window.updateHeaderProfileDropdown = updateHeaderProfileDropdown;
    window.getUserStats = getUserStats;
    window.saveUserRating = saveUserRating;
    window.getUserRating = getUserRating;
}
