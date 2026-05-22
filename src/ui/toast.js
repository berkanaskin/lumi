/**
 * LUMI - Toast Notifications
 * v2.0.0
 *
 * Premium toast notifications with glassmorphism,
 * semantic colors, and top-center positioning.
 */

import { escapeHtml } from '../lib/helpers.js';

/**
 * Toast type definitions
 */
const TOAST_TYPES = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning'
};

/**
 * Get icon for toast type
 * @param {string} type - Toast type
 * @returns {string} Material icon name
 */
function getIconForType(type) {
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };
    return icons[type] || 'info';
}

/**
 * Show a toast notification at top-center
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning' (default: 'info')
 * @param {number} duration - Duration in milliseconds (default: 3000, 0 = infinite)
 * @returns {HTMLElement} Toast element
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Validate type
    if (!TOAST_TYPES[type]) {
        console.warn(`[Toast] Unknown type "${type}", defaulting to "info"`);
        type = 'info';
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const iconName = getIconForType(type);

    // Sanitize message for security
    const safeMessage = escapeHtml(message);

    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">
                <span class="material-symbols-outlined">${iconName}</span>
            </span>
            <p>${safeMessage}</p>
            <button class="toast-close" aria-label="Close notification">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    return toast;
}

/**
 * Show success toast
 * @param {string} message
 * @param {number} duration
 */
export function showSuccessToast(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

/**
 * Show error toast
 * @param {string} message
 * @param {number} duration
 */
export function showErrorToast(message, duration = 3000) {
    return showToast(message, 'error', duration);
}

/**
 * Show info toast
 * @param {string} message
 * @param {number} duration
 */
export function showInfoToast(message, duration = 3000) {
    return showToast(message, 'info', duration);
}

/**
 * Show warning toast
 * @param {string} message
 * @param {number} duration
 */
export function showWarningToast(message, duration = 3000) {
    return showToast(message, 'warning', duration);
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.showSuccessToast = showSuccessToast;
    window.showErrorToast = showErrorToast;
    window.showInfoToast = showInfoToast;
    window.showWarningToast = showWarningToast;
}
