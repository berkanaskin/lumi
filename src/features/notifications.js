/**
 * LUMI — in-app Notification Center (Phase 05-05).
 *
 * Wires the EXISTING header bell (#notifications-btn / #notifications-list, defined in
 * index.html) to a real Firestore-backed inbox (users/{uid}/notifications), written by the
 * detect-changes + evening-assistant crons. Self-injecting (no index.html structural edit),
 * mirroring the agent-hub / paywall pattern.
 *
 * - Injects an unread `.notification-badge` into the bell (the legacy mark-all handler at
 *   index.html:1120 already expects that selector; we supersede its behavior with a real one).
 * - Renders one `.notification-item` per event; `.unread` drives the badge.
 * - Tapping an item marks it read + deep-links via payload (detail page / agent hub).
 * - Only wires for premium users (the feature is premium); guests see the static empty state.
 *
 * Real push (APNs/FCM) is Phase 6 — the event schema already maps onto a push payload.
 */
import { isPremium } from '../lib/entitlements.js';
import { listEvents, subscribe, markRead, markAllRead, unreadCount } from '../lib/notif-store.js';

function isTR() {
    const lang = (window.i18n?.currentLang || document.documentElement?.getAttribute?.('lang') || navigator.language || 'tr');
    return String(lang).toLowerCase().startsWith('tr');
}
const T = (tr, en) => (isTR() ? tr : en);

const ICONS = {
    platform_change: '📺',
    new_episode: '🔔',
    evening_pick: '🌙',
};

function relTime(createdAt) {
    let ms = 0;
    if (createdAt == null) return '';
    if (typeof createdAt === 'number') ms = createdAt;
    else if (typeof createdAt?.toMillis === 'function') ms = createdAt.toMillis();
    else if (typeof createdAt?.seconds === 'number') ms = createdAt.seconds * 1000;
    if (!ms) return '';
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return T('az önce', 'just now');
    if (m < 60) return `${m}d`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}sa`;
    return `${Math.floor(h / 24)}g`;
}

function currentUid() {
    // Only REAL users (premium) — anonymous guests aren't premium so this won't fire for them.
    return window.AuthService?.currentUser?.uid
        || (window.firebase?.auth?.()?.currentUser && !window.firebase.auth().currentUser.isAnonymous
            ? window.firebase.auth().currentUser.uid
            : null);
}

function ensureBadge(btn) {
    let badge = btn.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.display = 'none';
        btn.appendChild(badge);
    }
    return badge;
}

function renderInbox(events) {
    const list = document.getElementById('notifications-list');
    const btn = document.getElementById('notifications-btn');
    if (!list || !btn) return;

    const badge = ensureBadge(btn);
    const unread = unreadCount(events);
    if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }

    if (!events.length) {
        list.innerHTML = `<div class="dropdown-empty">
            <span class="material-symbols-outlined" style="font-size:32px;opacity:.3;margin-bottom:8px">notifications_off</span>
            <p>${T('Henüz bildirim yok', 'No notifications yet')}</p>
            <p style="font-size:11px;opacity:.6">${T('Yeni bölüm ve platform haberlerini buradan alacaksın.', 'New-episode and platform alerts will land here.')}</p>
        </div>`;
        return;
    }

    list.innerHTML = '';
    for (const ev of events) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'notification-item' + (ev.read ? '' : ' unread');
        item.setAttribute('data-testid', 'notif-item');
        item.innerHTML = `
            <span class="notif-ico">${ICONS[ev.type] || '✨'}</span>
            <span class="notif-text">
                <span class="notif-title">${(ev.title || '').replace(/[<>&]/g, '')}</span>
                <span class="notif-body">${(ev.body || '').replace(/[<>&]/g, '')}</span>
            </span>
            <span class="notif-time">${relTime(ev.createdAt)}</span>`;
        item.addEventListener('click', () => onItemClick(ev));
        list.appendChild(item);
    }
}

function onItemClick(ev) {
    const uid = currentUid();
    if (uid && !ev.read) markRead(uid, ev.id).catch(() => {});
    const p = ev.payload || {};
    if (p.tmdbId && typeof window.openDetail === 'function') {
        const type = p.mediaType === 'tv' ? 'tv' : (p.mediaType || 'movie');
        document.getElementById('notifications-dropdown')?.classList.remove('active');
        window.openDetail(p.tmdbId, type);
    } else if (ev.type === 'evening_pick' && typeof window.openDecideSheet === 'function') {
        // 05.5 eritme: hub öldü, akşam seçimi Decide sheet'ine derin-bağlanır.
        document.getElementById('notifications-dropdown')?.classList.remove('active');
        window.openDecideSheet();
    }
}

let _unsub = null;
let _wiredUid = null;

async function wireForUser() {
    const uid = currentUid();
    const list = document.getElementById('notifications-list');
    if (!list) return;

    // Only premium users get a live inbox; others keep the static empty state.
    if (!uid || !isPremium()) {
        if (_unsub) { _unsub(); _unsub = null; _wiredUid = null; }
        return;
    }
    if (_wiredUid === uid && _unsub) return; // already wired

    if (_unsub) { _unsub(); _unsub = null; }
    _wiredUid = uid;

    // Live subscription if available, else one-shot.
    _unsub = subscribe(uid, renderInbox);
    if (!_unsub || _unsub.toString() === '() => {}') {
        try { renderInbox(await listEvents(uid)); } catch { /* ignore */ }
    }

    // Supersede the legacy localStorage mark-all handler with a Firestore one.
    const markBtn = document.getElementById('mark-all-read');
    if (markBtn && !markBtn.dataset.lumiWired) {
        markBtn.dataset.lumiWired = '1';
        markBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const u = currentUid();
            if (u) await markAllRead(u).catch(() => {});
        });
    }
}

export function initNotifications() {
    if (typeof document === 'undefined') return;
    const run = () => {
        wireForUser();
        // Re-evaluate whenever auth/entitlement changes (login, premium flip).
        window.addEventListener('authStateChanged', wireForUser);
        window.addEventListener('lumi:premium-unlocked', wireForUser);
    };
    if (document.body) run();
    else document.addEventListener('DOMContentLoaded', run);
}

// Exposed for tests + deep-link callers.
export { renderInbox };

if (typeof window !== 'undefined' && !window.__lumiNotifWired) {
    window.__lumiNotifWired = true;
    initNotifications();
}
