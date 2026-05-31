/**
 * LUMI — Agent hub (Phase 05-03).
 *
 * The home of the "Movie Night Agent": a self-contained launcher (✨ FAB) + overlay
 * housing the premium proactive features. Self-injecting (no index.html/main.js edit,
 * mirroring the paywall pattern) and self-registers on import.
 *
 * - Decide-for-Me (this plan): mood chips + one-tap reveal.
 * - Pair Mode (05-04) + Notifications (05-05): cards present now; their handlers are
 *   wired by those plans via window.lumiAgent hooks (graceful "coming soon" until then).
 *
 * Free users see the feature cards (showcase) but tapping a premium action opens the
 * paywall (trigger:'feature').
 */
import './../styles/agent.css';
import { isPremium } from '../lib/entitlements.js';
import { openPaywall } from '../ui/paywall-sheet.js';
import { runDecide, MOODS } from './decide-for-me.js';

const IMG = 'https://image.tmdb.org/t/p/w500';

function isTR() {
    const lang = (window.i18n?.currentLang || document.documentElement?.getAttribute?.('lang') || navigator.language || 'en');
    return String(lang).toLowerCase().startsWith('tr');
}
const T = (tr, en) => (isTR() ? tr : en);

function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else n.setAttribute(k, v);
    }
    for (const c of children) if (c) n.appendChild(c);
    return n;
}

function closeHub() {
    document.getElementById('agent-overlay')?.remove();
}

// ---- Decide-for-Me flow -----------------------------------------------------

let activeMood = null;

function renderDecidePanel(body) {
    body.innerHTML = '';
    activeMood = null;
    body.appendChild(el('h3', { class: 'agent-feat-h', text: T('Decide-for-Me', 'Decide-for-Me') }));
    body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Tek dokunuş, tek doğru öneri. İstersen ruh halini seç.', 'One tap, one right pick. Add a mood if you like.') }));

    const chips = el('div', { class: 'agent-chips' });
    MOODS.forEach((m) => {
        const chip = el('button', { class: 'agent-chip', type: 'button', 'data-mood': m.key, text: `${m.emoji} ${isTR() ? m.tr : m.en}` });
        chip.addEventListener('click', () => {
            if (activeMood === m.key) { activeMood = null; chip.classList.remove('on'); return; }
            activeMood = m.key;
            chips.querySelectorAll('.agent-chip').forEach((c) => c.classList.remove('on'));
            chip.classList.add('on');
        });
        chips.appendChild(chip);
    });
    body.appendChild(chips);

    const go = el('button', { class: 'agent-go', type: 'button', 'data-testid': 'decide-go', text: T('Karar Ver ✨', 'Decide ✨') });
    go.addEventListener('click', () => runDecideFlow(body, go));
    body.appendChild(go);
}

async function runDecideFlow(body, go) {
    go.disabled = true;
    go.textContent = T('Lumi düşünüyor…', 'Lumi is thinking…');
    try {
        const pick = await runDecide({ mood: activeMood });
        if (!pick) {
            go.disabled = false;
            go.textContent = T('Tekrar dene', 'Try again');
            return;
        }
        renderReveal(body, pick);
    } catch (e) {
        console.error('[decide] error', e);
        go.disabled = false;
        go.textContent = T('Tekrar dene', 'Try again');
    }
}

function renderReveal(body, pick) {
    body.innerHTML = '';
    const title = pick.title || pick.name || '—';
    const year = (pick.release_date || pick.first_air_date || '').slice(0, 4);
    const poster = pick.poster_path ? IMG + pick.poster_path : null;
    const reason = pick.reason || pick.overview || '';

    const card = el('div', { class: 'agent-reveal', 'data-testid': 'decide-reveal' });
    if (poster) card.appendChild(el('img', { class: 'agent-reveal-poster', src: poster, alt: title }));
    const meta = el('div', { class: 'agent-reveal-meta' });
    meta.appendChild(el('div', { class: 'agent-reveal-badge', text: T('Bu akşamlık seçimin', 'Your pick tonight') }));
    meta.appendChild(el('div', { class: 'agent-reveal-title', text: title + (year ? ` (${year})` : '') }));
    if (reason) meta.appendChild(el('div', { class: 'agent-reveal-reason', text: reason.slice(0, 220) }));
    card.appendChild(meta);
    body.appendChild(card);

    const actions = el('div', { class: 'agent-reveal-actions' });
    const detail = el('button', { class: 'agent-go', type: 'button', text: T('Detayına bak', 'See details') });
    detail.addEventListener('click', () => {
        closeHub();
        const type = pick.media_type || (pick.first_air_date ? 'tv' : 'movie');
        if (typeof window.renderDetailPage === 'function') window.renderDetailPage(pick.id, type);
        else if (typeof window.openDetail === 'function') window.openDetail(pick.id, type);
    });
    const reroll = el('button', { class: 'agent-ghost', type: 'button', 'data-testid': 'decide-reroll', text: T('Başka öner', 'Pick another') });
    reroll.addEventListener('click', () => renderDecidePanel(body));
    actions.appendChild(detail);
    actions.appendChild(reroll);
    body.appendChild(actions);
}

// ---- Hub overlay ------------------------------------------------------------

const FEATURES = [
    { key: 'decide', icon: '✦', tr: 'Decide-for-Me', en: 'Decide-for-Me', dtr: '30 saniyede karar', den: 'Decide in 30s', ready: true },
    { key: 'pair', icon: '👥', tr: 'Pair Mode', en: 'Pair Mode', dtr: 'İkiniz için ortak karar', den: 'One pick you both love' },
    { key: 'notif', icon: '🔔', tr: 'Bildirimler', en: 'Notifications', dtr: 'Yeni bölüm/platform haberi', den: 'New episode/platform alerts' },
];

function openFeature(key, body) {
    // Premium gate: free users get the paywall instead of the feature.
    if (!isPremium()) { openPaywall({ trigger: 'feature' }); return; }
    if (key === 'decide') return renderDecidePanel(body);
    // 05-04 / 05-05 hooks.
    const hook = window.lumiAgent?.[key];
    if (typeof hook === 'function') return hook(body);
    body.innerHTML = '';
    body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Bu özellik çok yakında.', 'This feature is coming soon.') }));
}

export function openAgentHub() {
    if (document.getElementById('agent-overlay')) return;
    const overlay = el('div', { id: 'agent-overlay', class: 'agent-overlay', role: 'dialog', 'aria-modal': 'true' });
    const panel = el('div', { class: 'agent-panel', 'data-testid': 'agent-hub' });

    const header = el('div', { class: 'agent-header' }, [
        el('div', { class: 'agent-eyebrow', text: T('Movie Night Agent', 'Movie Night Agent') }),
        el('h2', { class: 'agent-title', text: 'Lumi Agent' }),
    ]);
    const closeBtn = el('button', { class: 'agent-x', type: 'button', 'aria-label': 'close', text: '✕' });
    closeBtn.addEventListener('click', closeHub);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = el('div', { class: 'agent-body' });

    const cards = el('div', { class: 'agent-cards' });
    FEATURES.forEach((f) => {
        const card = el('button', { class: 'agent-card', type: 'button', 'data-feature': f.key, 'data-testid': 'agent-card' }, [
            el('span', { class: 'agent-card-ico', text: f.icon }),
            el('span', { class: 'agent-card-title', text: isTR() ? f.tr : f.en }),
            el('span', { class: 'agent-card-desc', text: isTR() ? f.dtr : f.den }),
        ]);
        if (!isPremium()) card.appendChild(el('span', { class: 'agent-card-lock', text: '🔒' }));
        card.addEventListener('click', () => openFeature(f.key, body));
        cards.appendChild(card);
    });
    body.appendChild(cards);

    // Default to the Decide panel for premium users; showcase for free users.
    if (isPremium()) renderDecidePanel(body);

    panel.appendChild(body);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHub(); });
    document.body.appendChild(overlay);
    return overlay;
}

export function initAgentHub() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('agent-fab')) return;
    const fab = el('button', { id: 'agent-fab', class: 'agent-fab', type: 'button', 'aria-label': T('Lumi Agent', 'Lumi Agent'), 'data-testid': 'agent-fab', text: '✨' });
    fab.addEventListener('click', openAgentHub);
    const mount = () => { if (!document.getElementById('agent-fab')) document.body.appendChild(fab); };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
}

// Self-init on import + expose for inline/other plans.
if (typeof window !== 'undefined' && !window.__lumiAgentWired) {
    window.__lumiAgentWired = true;
    window.openAgentHub = openAgentHub;
    initAgentHub();
}
