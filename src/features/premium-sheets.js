/**
 * LUMI — Premium sheets (Phase 05.5 "eritme").
 *
 * Agent hub + FAB kaldırıldı: uygulamada zaten "Bugün nasıl hissediyorsun?"
 * Wizard ekranı varken ikinci bir paralel öneri merkezi kafa karıştırıyordu.
 * Premium özellikler artık uygulamanın doğal aktığı yerlerde yaşıyor:
 *
 * - Decide-for-Me → Wizard console'una birinci sınıf "Kararsızım — Lumi Seçsin"
 *   girişi (openDecideSheet). Kitaplık'taki "Bu akşam ne izlesen?" bandı da
 *   aynı sheet'i açar.
 * - Pair Mode → Profil'den openPairSheet (window.lumiAgent.pair hook'u korunur;
 *   yalnız iç API adı, kullanıcıya görünmez).
 * - Bildirimler zaten header zilinde.
 *
 * "Lumi Agent" markası öldü — kullanıcıya görünen ad: Lumi Premium.
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

export function closeSheet() {
    document.getElementById('premium-sheet-overlay')?.remove();
}

/** Generic premium bottom-sheet host (agent.css overlay/panel stillerini kullanır). */
function openSheet({ eyebrow, title, render }) {
    if (document.getElementById('premium-sheet-overlay')) return null;
    const overlay = el('div', { id: 'premium-sheet-overlay', class: 'agent-overlay', role: 'dialog', 'aria-modal': 'true' });
    const panel = el('div', { class: 'agent-panel', 'data-testid': 'premium-sheet' });

    const header = el('div', { class: 'agent-header' }, [
        el('div', { class: 'agent-eyebrow', text: eyebrow }),
        el('h2', { class: 'agent-title', text: title }),
    ]);
    const closeBtn = el('button', { class: 'agent-x', type: 'button', 'aria-label': 'close', text: '✕' });
    closeBtn.addEventListener('click', closeSheet);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = el('div', { class: 'agent-body' });
    panel.appendChild(body);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
    document.body.appendChild(overlay);
    render(body);
    return overlay;
}

// ---- Decide-for-Me ----------------------------------------------------------

let activeMood = null;

function renderDecidePanel(body) {
    body.innerHTML = '';
    activeMood = null;
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
        if (pick && pick.blocked) {
            go.disabled = false;
            go.textContent = T('Karar Ver ✨', 'Decide ✨');
            if (pick.reason === 'quota') openPaywall({ trigger: 'quota' });
            return;
        }
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
        closeSheet();
        const type = pick.media_type || (pick.first_air_date ? 'tv' : 'movie');
        if (typeof window.openDetail === 'function') window.openDetail(pick.id, type);
        else if (typeof window.openDetailModal === 'function') window.openDetailModal(pick.id, type);
    });
    const reroll = el('button', { class: 'agent-ghost', type: 'button', 'data-testid': 'decide-reroll', text: T('Başka öner', 'Pick another') });
    reroll.addEventListener('click', () => renderDecidePanel(body));
    actions.appendChild(detail);
    actions.appendChild(reroll);
    body.appendChild(actions);
}

/** Wizard/Kitaplık girişi: premium'sa Decide sheet'i, değilse paywall. */
export function openDecideSheet() {
    if (!isPremium()) { openPaywall({ trigger: 'feature' }); return null; }
    return openSheet({
        eyebrow: T('Lumi Premium', 'Lumi Premium'),
        title: T('Benim İçin Seç', 'Decide for Me'),
        render: renderDecidePanel,
    });
}

// ---- Pair Mode ---------------------------------------------------------------

/** Profil girişi: premium'sa Pair panelini sheet içinde aç, değilse paywall. */
export function openPairSheet() {
    if (!isPremium()) { openPaywall({ trigger: 'feature' }); return null; }
    return openSheet({
        eyebrow: T('Lumi Premium', 'Lumi Premium'),
        title: T('Çift Modu', 'Pair Mode'),
        render: (body) => {
            const hook = window.lumiAgent?.pair;
            if (typeof hook === 'function') hook(body);
            else body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Bu özellik çok yakında.', 'This feature is coming soon.') }));
        },
    });
}

// ---- Wizard'a birinci sınıf giriş --------------------------------------------

function injectDecideEntry() {
    if (document.getElementById('decide-entry-btn')) return;
    const actions = document.querySelector('.discover-console .console-actions');
    if (!actions) return;
    const btn = el('button', {
        id: 'decide-entry-btn',
        class: 'console-btn decide-entry',
        type: 'button',
        'data-testid': 'decide-entry',
    }, [
        el('span', { class: 'material-symbols-outlined', text: 'auto_awesome' }),
        el('span', { text: T('Kararsızım — Lumi Seçsin', "Can't decide — let Lumi pick") }),
    ]);
    btn.addEventListener('click', () => openDecideSheet());
    actions.insertAdjacentElement('afterend', btn);
}

export function initPremiumSheets() {
    if (typeof document === 'undefined') return;
    const mount = () => injectDecideEntry();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
}

// Self-init on import + expose for inline callers & notifications deep-link.
if (typeof window !== 'undefined' && !window.__lumiPremiumWired) {
    window.__lumiPremiumWired = true;
    window.openDecideSheet = openDecideSheet;
    window.openPairSheet = openPairSheet;
    // Geriye dönük: evening_pick bildirimi eski openAgentHub'ı çağırıyordu.
    window.openAgentHub = openDecideSheet;
    initPremiumSheets();
}
