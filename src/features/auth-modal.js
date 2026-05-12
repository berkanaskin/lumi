/**
 * LUMI - Action-triggered auth modal (Phase 04-03).
 *
 * `requireAuth({ action })` is the gate that replaces the old full-screen
 * login wall. Call it before any social/public action (rate, share, edit
 * profile, comment). Returns a Promise that:
 *   - resolves immediately with `firebase.auth().currentUser` when signed in;
 *   - resolves with the new user once they complete sign-in via the modal;
 *   - rejects with a DOMException('AbortError') when the user cancels.
 *
 * Callers pattern:
 *   try {
 *       const user = await requireAuth({ action: 'rateMovie' });
 *       // ...do the gated thing
 *   } catch (err) {
 *       if (err?.name !== 'AbortError') console.error(err);
 *       // cancelled -> silent no-op
 *   }
 *
 * The modal's "context line" is i18n-keyed via `authGate.{action}` with a
 * fallback to `authGate.default`. See public/i18n.js for the EN/TR strings.
 */

let activeResolve = null;
let activeReject = null;

function t(key) {
    if (typeof window === 'undefined') return null;
    const fn = window.i18n?.t;
    if (typeof fn !== 'function') return null;
    const val = fn.call(window.i18n, key);
    // The i18n.t() fallback chain returns the raw key when nothing matched.
    // Treat that as "not found" so we can fall back to authGate.default.
    return val && val !== key ? val : null;
}

function createModalDOM() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <div class="auth-modal-backdrop" data-auth-cancel></div>
        <div class="auth-modal-card" role="document">
            <h2 class="auth-modal-title" data-i18n="authGate.title">Sign in to continue</h2>
            <p class="auth-modal-context"></p>
            <button class="auth-modal-google" data-auth-google type="button">
                <span data-i18n="continueWithGoogle">Continue with Google</span>
            </button>
            <button class="auth-modal-cancel" data-auth-cancel type="button">
                <span data-i18n="close">Cancel</span>
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        const target = e.target.closest('[data-auth-cancel], [data-auth-google]');
        if (!target) return;
        if (target.matches('[data-auth-cancel]')) {
            _onAuthCancelled();
        } else if (target.matches('[data-auth-google]')) {
            // Delegate the actual sign-in to AuthService; src/main.js'
            // onAuthStateChanged listener will call _onAuthResolved(user)
            // once Firebase confirms.
            const svc = window.AuthService;
            if (svc && typeof svc.loginWithGoogle === 'function') {
                svc.loginWithGoogle().catch((err) => {
                    // eslint-disable-next-line no-console
                    console.warn('[auth-modal] google sign-in failed', err);
                });
            }
        }
    });

    return modal;
}

export function openAuthModal(actionKey) {
    const modal = document.getElementById('auth-modal') || createModalDOM();
    const ctxEl = modal.querySelector('.auth-modal-context');
    if (ctxEl) {
        const copy = t(`authGate.${actionKey}`) || t('authGate.default') || 'Sign in to continue';
        ctxEl.textContent = copy;
    }
    modal.classList.add('open');
    return modal;
}

export function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
}

function _onAuthCancelled() {
    closeAuthModal();
    if (activeReject) {
        const reject = activeReject;
        activeResolve = null;
        activeReject = null;
        const err = (typeof DOMException === 'function')
            ? new DOMException('Authentication cancelled', 'AbortError')
            : Object.assign(new Error('Authentication cancelled'), { name: 'AbortError' });
        reject(err);
    }
}

/**
 * Called by the global onAuthStateChanged listener (src/main.js) when a user
 * successfully signs in. Resolves any pending requireAuth() Promise.
 */
export function _onAuthResolved(user) {
    if (activeResolve) {
        const resolve = activeResolve;
        activeResolve = null;
        activeReject = null;
        closeAuthModal();
        resolve(user);
    }
}

export async function requireAuth({ action } = {}) {
    const auth = (typeof window !== 'undefined' && window.firebase?.auth)
        ? window.firebase.auth()
        : null;
    const current = auth?.currentUser;
    if (current) return current;

    return new Promise((resolve, reject) => {
        activeResolve = resolve;
        activeReject = reject;
        openAuthModal(action);
    });
}

// Expose for inline-script call sites.
if (typeof window !== 'undefined') {
    window.requireAuth = requireAuth;
    window._onAuthResolved = _onAuthResolved;
}
