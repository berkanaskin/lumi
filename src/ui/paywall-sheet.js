/**
 * LUMI — in-app Premium paywall sheet (Phase 05-02).
 *
 * A self-contained bottom sheet that mirrors the onboarding premium slide's content
 * (4 proactive features + 3 tiers + 3-day trial) but is INDEPENDENT of onboarding —
 * it does not touch onboarding.js/onboarding.css (which are locked, heavily-tested).
 *
 * Triggers (Phase 05-01 dispatches these):
 *   window.dispatchEvent(new CustomEvent('lumi:paywall', { detail: { trigger } }))
 *     trigger: 'quota'  → free user hit the daily AI cap (6th query)
 *     trigger: 'feature'→ free user tapped a premium-gated feature (05-03+)
 *
 * CTA is environment-split (PREMIUM-PRICING.md §4 — no web sale):
 *   - production: "iOS/Android app'imizde Premium" → store links (filled in Phase 6)
 *   - dev:        a "Mock Premium (dev)" button that flips the entitlement so the four
 *                 premium features can be tested in the browser.
 *
 * This module SELF-REGISTERS the 'lumi:paywall' listener on import, so any module that
 * imports it (discover.js) wires the trigger with no main.js change.
 */
import '../styles/paywall.css';
import { setPremiumMock, isPremium } from '../lib/entitlements.js';

// Store listing URLs — placeholders until the publishing account is chosen (Phase 6).
const APP_STORE_URL = 'https://apps.apple.com/app/lumi';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.lumi';

const FEATURE_SVGS = {
    decide: '<svg viewBox="0 0 32 32"><rect x="3" y="6" width="7" height="11" rx="1.5"/><rect x="12" y="6" width="7" height="11" rx="1.5"/><rect x="21" y="6" width="7" height="11" rx="1.5"/><path d="M12 23 l3 3 l6 -6" stroke-width="2"/></svg>',
    pair: '<svg viewBox="0 0 32 32"><circle cx="11" cy="12" r="4"/><circle cx="21" cy="12" r="4"/><path d="M4 26c0-4 3-7 7-7s7 3 7 7M14 26c0-4 3-7 7-7s7 3 7 7"/></svg>',
    notif: '<svg viewBox="0 0 32 32"><path d="M8 24V13a8 8 0 0 1 16 0v11"/><path d="M5 24h22"/><path d="M13 27a3 3 0 0 0 6 0"/><circle cx="24" cy="8" r="3.5" fill="#ff7ab8" stroke="#ff7ab8"/></svg>',
    evening: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="10"/><path d="M16 11 v6 l4 2" stroke-width="2"/><path d="M8 5 l-3 3 M24 5 l3 3"/></svg>',
};

function isTR() {
    const lang = (typeof window !== 'undefined'
        && (window.i18n?.currentLang
            || document.documentElement?.getAttribute?.('lang')
            || navigator.language))
        || 'en';
    return String(lang).toLowerCase().startsWith('tr');
}

function copy() {
    const tr = isTR();
    return {
        eyebrow: tr ? 'Premium' : 'Premium',
        title: tr ? 'Lumi Premium' : 'Lumi Premium',
        accent: tr ? 'Lumi seninle, her akşam.' : 'Lumi, with you every night.',
        quotaLead: tr ? 'Bugünlük 5 ücretsiz AI hakkını kullandın.' : "You've used today's 5 free AI picks.",
        featureLead: tr ? 'Premium ile gelenler:' : 'What Premium unlocks:',
        features: [
            { svg: FEATURE_SVGS.decide, t: tr ? 'Decide-for-Me' : 'Decide-for-Me', d: tr ? '30 saniyede karar — Lumi senin için seçer.' : 'One pick in 30 seconds.' },
            { svg: FEATURE_SVGS.pair, t: tr ? 'Pair Mode' : 'Pair Mode', d: tr ? 'İkiniz için ortak karar.' : 'One pick you both will love.' },
            { svg: FEATURE_SVGS.notif, t: tr ? 'Akıllı Bildirimler' : 'Smart Notifications', d: tr ? 'Yeni bölüm/platform çıkınca ilk sen bil.' : 'Know first when it drops.' },
            { svg: FEATURE_SVGS.evening, t: tr ? 'Akşam Asistanı' : 'Evening Assistant', d: tr ? '20:00 çağrı — her gün tek doğru öneri.' : '20:00 — tonight\'s pick, daily.' },
        ],
        tiers: tr ? [
            { name: 'Aylık', price: '₺49', per: '/ay', sub: '3 gün ücretsiz', key: 'monthly' },
            { name: 'Yıllık', price: '₺299', per: '/yıl', sub: '₺289 tasarruf', key: 'yearly', badge: '⭐ BEST' },
            { name: 'Ömürlük', price: '₺799', per: 'tek ödeme', sub: 'Sonsuza dek', key: 'lifetime', badge: '🔥 LTD' },
        ] : [
            { name: 'Monthly', price: '$2.99', per: '/mo', sub: '3 days free', key: 'monthly' },
            { name: 'Yearly', price: '$19.99', per: '/yr', sub: 'Save $15', key: 'yearly', badge: '⭐ BEST' },
            { name: 'Lifetime', price: '$49.99', per: 'one-time', sub: 'Forever', key: 'lifetime', badge: '🔥 LTD' },
        ],
        trial: tr ? '3 gün ücretsiz · iptal kolay · 🔒 RevenueCat' : '3 days free · cancel anytime · 🔒 RevenueCat',
        ctaStore: tr ? "iOS/Android app'imizde Premium'a geç" : 'Get Premium in our iOS/Android app',
        ctaDev: 'Mock Premium (dev) — unlock',
        close: tr ? 'Kapat' : 'Close',
    };
}

let open = false;

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else node.setAttribute(k, v);
    }
    for (const c of children) node.appendChild(c);
    return node;
}

export function closePaywall() {
    const existing = document.getElementById('pw-overlay');
    if (existing) existing.remove();
    open = false;
}

/**
 * Open the paywall. Idempotent (a second call while open is ignored). Premium users
 * never see it. trigger: 'quota' | 'feature' shapes the lead copy.
 */
export function openPaywall({ trigger = 'feature' } = {}) {
    if (open) return;
    if (isPremium()) return; // already premium — nothing to sell
    open = true;
    const c = copy();
    const isDev = !!import.meta.env?.DEV;

    const overlay = el('div', { id: 'pw-overlay', class: 'pw-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': c.title });
    const sheet = el('div', { class: 'pw-sheet', 'data-testid': 'paywall-sheet', 'data-trigger': trigger });

    sheet.appendChild(el('div', { class: 'pw-grabber' }));
    sheet.appendChild(el('div', { class: 'pw-eyebrow', text: c.eyebrow }));
    sheet.appendChild(el('h2', { class: 'pw-title', text: c.title }));
    sheet.appendChild(el('div', { class: 'pw-accent', text: c.accent }));
    if (trigger === 'quota') {
        sheet.appendChild(el('div', { class: 'pw-quota-lead', text: c.quotaLead }));
    }

    sheet.appendChild(el('div', { class: 'pw-feat-lead', text: c.featureLead }));
    const grid = el('div', { class: 'pw-feat-grid' });
    for (const f of c.features) {
        const cell = el('div', { class: 'pw-feat', 'data-testid': 'pw-feature' });
        const ico = el('div', { class: 'pw-feat-ico', html: f.svg });
        cell.appendChild(ico);
        cell.appendChild(el('div', { class: 'pw-feat-title', text: f.t }));
        cell.appendChild(el('div', { class: 'pw-feat-desc', text: f.d }));
        grid.appendChild(cell);
    }
    sheet.appendChild(grid);

    let selected = 'yearly';
    const tierGrid = el('div', { class: 'pw-tier-grid' });
    for (const tier of c.tiers) {
        const card = el('div', {
            class: 'pw-tier' + (tier.key === selected ? ' sel' : ''),
            'data-key': tier.key,
            'data-testid': 'pw-tier',
            role: 'button',
            tabindex: '0',
        });
        const top = el('div', { class: 'pw-tier-top' }, [el('span', { class: 'pw-tier-name', text: tier.name })]);
        if (tier.badge) top.appendChild(el('span', { class: 'pw-tier-badge', text: tier.badge }));
        card.appendChild(top);
        card.appendChild(el('div', { class: 'pw-tier-price', text: tier.price }));
        card.appendChild(el('div', { class: 'pw-tier-per', text: tier.per }));
        card.appendChild(el('div', { class: 'pw-tier-sub', text: tier.sub }));
        const select = () => {
            selected = tier.key;
            tierGrid.querySelectorAll('.pw-tier').forEach((n) => n.classList.remove('sel'));
            card.classList.add('sel');
        };
        card.addEventListener('click', select);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
        tierGrid.appendChild(card);
    }
    sheet.appendChild(tierGrid);
    sheet.appendChild(el('div', { class: 'pw-trial', text: c.trial }));

    // Environment-split CTA.
    const cta = el('button', { class: 'pw-cta', type: 'button', 'data-testid': 'pw-cta' });
    if (isDev) {
        cta.textContent = c.ctaDev;
        cta.setAttribute('data-mode', 'dev-unlock');
        cta.addEventListener('click', () => {
            setPremiumMock(true);
            closePaywall();
            window.dispatchEvent(new CustomEvent('lumi:premium-unlocked', { detail: { source: 'mock', tier: selected } }));
        });
    } else {
        cta.textContent = c.ctaStore;
        cta.setAttribute('data-mode', 'store');
        cta.addEventListener('click', () => {
            const ua = navigator.userAgent || '';
            const url = /android/i.test(ua) ? PLAY_STORE_URL : APP_STORE_URL;
            window.open(url, '_blank', 'noopener');
        });
    }
    sheet.appendChild(cta);

    const close = el('button', { class: 'pw-close', type: 'button', 'data-testid': 'pw-close', text: c.close });
    close.addEventListener('click', closePaywall);
    sheet.appendChild(close);

    overlay.appendChild(sheet);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePaywall(); });
    document.body.appendChild(overlay);
    return overlay;
}

// Self-register the trigger listener on import (no main.js wiring needed).
if (typeof window !== 'undefined' && !window.__lumiPaywallWired) {
    window.__lumiPaywallWired = true;
    window.addEventListener('lumi:paywall', (e) => openPaywall((e && e.detail) || {}));
    // Expose for inline call sites / 05-03 feature gates.
    window.openPaywall = openPaywall;
}
