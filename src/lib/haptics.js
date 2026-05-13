/**
 * Phase 04-04-r2 — Tiny haptic helper.
 *
 * Three intensities for the onboarding wizard (and other UI):
 *   - haptic.tap()      light tap     (CTA / back / skip)
 *   - haptic.select()   medium thump  (radio/chip select)
 *   - haptic.success()  notif-success (final CTA, completion)
 *
 * Native Capacitor `Haptics` plugin is used when available; otherwise we fall
 * back to `navigator.vibrate(...)` on the web. Both paths are no-ops when the
 * user has `prefers-reduced-motion: reduce`.
 *
 * One haptic per interaction — callers should NOT spam this.
 */

function prefersReducedMotion() {
    try {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

function capacitorHaptics() {
    try {
        return (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Haptics) || null;
    } catch {
        return null;
    }
}

function webVibrate(pattern) {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    } catch {
        /* ignore */
    }
}

export const haptic = {
    tap() {
        if (prefersReducedMotion()) return;
        const h = capacitorHaptics();
        if (h && typeof h.impact === 'function') {
            try { h.impact({ style: 'light' }); return; } catch { /* fall through */ }
        }
        webVibrate(8);
    },

    select() {
        if (prefersReducedMotion()) return;
        const h = capacitorHaptics();
        if (h && typeof h.impact === 'function') {
            try { h.impact({ style: 'medium' }); return; } catch { /* fall through */ }
        }
        webVibrate([8, 40, 8]);
    },

    success() {
        if (prefersReducedMotion()) return;
        const h = capacitorHaptics();
        if (h && typeof h.notification === 'function') {
            try { h.notification({ type: 'SUCCESS' }); return; } catch { /* fall through */ }
        }
        webVibrate([16, 80, 16, 80, 16]);
    },
};

export default haptic;
