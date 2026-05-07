/**
 * LUMI - Profile Edit (Plan 03.2-03 / Track E)
 *
 * Wires the tap-to-edit name flow + avatar picker modal to AuthService.updateUserProfile.
 * Loaded as an ES module from index.html.
 */

import { PRESET_AVATARS, isAllowedPhotoURL } from '../lib/avatars.js';

const NAME_MAX = 40;

function showToast(msg) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg);
    } else {
        console.log('[toast]', msg);
    }
}

/**
 * Replace the profile name node with an inline input.
 * Commit on Enter or blur; Esc cancels.
 */
function openNameEditor() {
    const nameEl = document.getElementById('profile-name');
    if (!nameEl || nameEl.dataset.editing === '1') return;

    const original = nameEl.textContent.trim();
    nameEl.dataset.editing = '1';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'profile-name-input';
    input.value = original === 'Misafir' ? '' : original;
    input.maxLength = NAME_MAX;
    input.setAttribute('aria-label', 'Display name');

    nameEl.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;

    const restore = (text) => {
        const h1 = document.createElement('h1');
        h1.className = 'profile-name';
        h1.id = 'profile-name';
        // textContent only — Threat T-03.2-03-02 (XSS via name)
        h1.textContent = text;
        h1.tabIndex = 0;
        input.replaceWith(h1);
        wireNameTap(h1);
    };

    const cancel = () => {
        if (committed) return;
        committed = true;
        restore(original);
    };

    const commit = async () => {
        if (committed) return;
        committed = true;

        const next = input.value.trim().slice(0, NAME_MAX);
        if (!next || next === original) {
            restore(original);
            return;
        }

        // Optimistic UI
        restore(next);

        try {
            await window.AuthService.updateUserProfile(next, undefined);
            showToast('Profil güncellendi');
        } catch (err) {
            console.error('[profile-edit] name update failed:', err);
            showToast('Güncellenemedi, geri alındı');
            // Revert
            const h1 = document.getElementById('profile-name');
            if (h1) h1.textContent = original;
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        }
    });
    input.addEventListener('blur', commit);
}

function wireNameTap(el) {
    if (!el || el.dataset.tapWired === '1') return;
    el.dataset.tapWired = '1';
    el.addEventListener('click', openNameEditor);
}

/**
 * Render and open the avatar picker bottom-sheet.
 */
function openAvatarPicker() {
    const modal = document.getElementById('avatar-picker-modal');
    if (!modal) return;

    const grid = modal.querySelector('.avatar-picker-grid');
    const user = window.AuthService?.getCurrentUser?.();
    const currentUrl = user?.photoURL || user?.avatar || '';

    grid.innerHTML = '';
    PRESET_AVATARS.forEach((a) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-tile' + (a.url === currentUrl ? ' is-active' : '');
        btn.setAttribute('aria-label', a.label);
        btn.dataset.url = a.url;
        const img = document.createElement('img');
        img.src = a.url;
        img.alt = a.label;
        img.loading = 'lazy';
        btn.appendChild(img);
        btn.addEventListener('click', () => selectAvatar(a.url, modal));
        grid.appendChild(btn);
    });

    modal.classList.add('visible');
}

function closeAvatarPicker() {
    document.getElementById('avatar-picker-modal')?.classList.remove('visible');
}

async function selectAvatar(url, modal) {
    if (!isAllowedPhotoURL(url)) {
        showToast('Geçersiz avatar');
        return;
    }
    // Optimistic UI
    const img = document.getElementById('profile-avatar-img');
    const previous = img?.src;
    if (img) {
        img.src = url;
        img.style.display = '';
    }
    modal.classList.remove('visible');

    try {
        await window.AuthService.updateUserProfile(undefined, url);
        showToast('Avatar güncellendi');
    } catch (err) {
        console.error('[profile-edit] avatar update failed:', err);
        showToast('Avatar güncellenemedi');
        if (img && previous) img.src = previous;
    }
}

/**
 * Refresh the stats cards: "Beğenilen" + "Listede Bekleyen".
 */
function refreshStats() {
    try {
        const liked = JSON.parse(localStorage.getItem('liked_items') || '[]');
        const watchlist = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
        const likedEl = document.getElementById('stat-liked');
        const watchlistEl = document.getElementById('stat-watchlist');
        if (likedEl) likedEl.textContent = String(liked.length);
        if (watchlistEl) watchlistEl.textContent = String(watchlist.length);
    } catch (e) {
        console.warn('[profile-edit] refreshStats failed:', e);
    }
}

/**
 * Refresh avatar + name from current user.
 */
function refreshIdentity() {
    const user = window.AuthService?.getCurrentUser?.();
    const nameEl = document.getElementById('profile-name');
    const img = document.getElementById('profile-avatar-img');
    if (nameEl && nameEl.dataset.editing !== '1') {
        nameEl.textContent = user?.name || user?.displayName || 'Misafir';
    }
    if (img) {
        const url = user?.photoURL || user?.avatar;
        if (url) {
            img.src = url;
            img.style.display = '';
        }
    }
}

function init() {
    // Tap-to-edit name
    const nameEl = document.getElementById('profile-name');
    if (nameEl) wireNameTap(nameEl);

    // Avatar pencil overlay -> opens picker
    const avatarContainer = document.querySelector('.profile-avatar-container');
    if (avatarContainer) {
        avatarContainer.addEventListener('click', openAvatarPicker);
    }

    // Modal close button + backdrop dismiss
    const modal = document.getElementById('avatar-picker-modal');
    if (modal) {
        modal.querySelector('.avatar-picker-close')?.addEventListener('click', closeAvatarPicker);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAvatarPicker();
        });
    }

    // Initial stats + identity
    refreshStats();
    refreshIdentity();

    // React to auth changes (Pitfall 3)
    window.addEventListener('authStateChanged', () => {
        refreshIdentity();
        refreshStats();
    });

    // Refresh stats when user navigates to profile page
    window.addEventListener('hashchange', refreshStats);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose for debugging
window.ProfileEdit = { openNameEditor, openAvatarPicker, refreshStats };
