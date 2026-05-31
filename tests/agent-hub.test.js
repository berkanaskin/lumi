import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openAgentHub } from '../src/features/agent-hub.js';
import { PREMIUM_KEY } from '../src/lib/entitlements.js';

describe('agent-hub — Movie Night Agent center (Phase 05-03)', () => {
    beforeEach(() => {
        localStorage.clear();
        document.getElementById('agent-overlay')?.remove();
        document.getElementById('pw-overlay')?.remove();
    });
    afterEach(() => {
        document.getElementById('agent-overlay')?.remove();
        document.getElementById('pw-overlay')?.remove();
        localStorage.clear();
    });

    it('injects the launcher FAB on import', () => {
        expect(document.getElementById('agent-fab')).toBeTruthy();
    });

    it('opens a hub with the three feature cards', () => {
        openAgentHub();
        expect(document.querySelector('[data-testid="agent-hub"]')).toBeTruthy();
        expect(document.querySelectorAll('[data-testid="agent-card"]').length).toBe(3);
    });

    it('free user tapping a feature opens the paywall (not the feature)', () => {
        openAgentHub();
        document.querySelector('[data-testid="agent-card"]').click();
        expect(document.querySelector('[data-testid="paywall-sheet"]')).toBeTruthy();
    });

    it('premium user lands on the Decide-for-Me panel by default', () => {
        localStorage.setItem(PREMIUM_KEY, 'true');
        openAgentHub();
        expect(document.querySelector('[data-testid="decide-go"]')).toBeTruthy();
    });

    it('is idempotent — does not stack overlays', () => {
        openAgentHub();
        openAgentHub();
        expect(document.querySelectorAll('[data-testid="agent-hub"]').length).toBe(1);
    });
});
