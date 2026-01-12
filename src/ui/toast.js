/**
 * LUMI - Toast Notifications
 * v1.1.0
 * 
 * Provides toast notification functionality.
 */

// Inject toast animations CSS
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    .toast {
        background: var(--glass-bg);
        color: var(--text-primary);
        padding: 12px 20px;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        pointer-events: auto;
        animation: toastIn 0.3s ease;
        max-width: 300px;
        text-align: center;
    }
    .toast.hide {
        animation: toastOut 0.3s ease forwards;
    }
`;
document.head.appendChild(toastStyles);

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('[Toast] Container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.showToast = showToast;
}
