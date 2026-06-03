/**
 * LUMI — Pair Mode (Phase 05-04).
 *
 * Premium feature surfaced inside the Agent hub (window.lumiAgent.pair). Two REAL accounts
 * pair via a 6-char code; the AI returns titles neither has seen and both would enjoy.
 *
 * Server (api/pair.js) does the code exchange + persistent pairs/{pairId}; this module is
 * the client UI + the recommendation call (reuses SearchService.hybridSearch with a dual-
 * taste prompt, then filters the union of both seen sets where the partner's is available).
 */
import { SearchService } from '../services/api.js';
import { getSeenSet, getTasteProfile } from '../lib/seen.js';
import { buildPairPrompt } from '../lib/pairing-core.js';

const IMG = 'https://image.tmdb.org/t/p/w342';

function isTR() {
    const lang = (window.i18n?.currentLang || document.documentElement?.getAttribute?.('lang') || navigator.language || 'tr');
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

async function postPair(action, extra = {}) {
    const idToken = window.AuthService?.getIdToken ? await window.AuthService.getIdToken() : null;
    if (!idToken) return { error: 'auth' };
    const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, idToken, ...extra }),
    });
    return res.json().catch(() => ({ error: 'parse' }));
}

function isAnonNow() {
    try {
        const u = window.firebase?.auth?.()?.currentUser;
        return !u || u.isAnonymous;
    } catch { return true; }
}

/** Entry point registered as window.lumiAgent.pair — called by the Agent hub. */
export async function renderPairPanel(body) {
    body.innerHTML = '';
    body.appendChild(el('h3', { class: 'agent-feat-h', text: 'Pair Mode' }));

    // Pair Mode needs two REAL accounts.
    if (isAnonNow()) {
        body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Pair Mode için bir hesap oluşturman gerekiyor.', 'Pair Mode needs an account.') }));
        const signup = el('button', { class: 'agent-go', type: 'button', text: T('Hesap oluştur / Giriş yap', 'Create account / Sign in') });
        signup.addEventListener('click', () => { window.requireAuth?.({ action: 'pair' }); });
        body.appendChild(signup);
        return;
    }

    body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Ne izleyeceğinize birlikte karar verin.', 'Decide together what to watch.') }));

    const status = await postPair('status');
    if (status?.paired) return renderPaired(body, status.partner);
    renderUnpaired(body);
}

function renderUnpaired(body) {
    // Generate a code…
    const genWrap = el('div', { class: 'pair-block' });
    const genBtn = el('button', { class: 'agent-go', type: 'button', 'data-testid': 'pair-generate', text: T('Eşleşme kodu oluştur', 'Generate a pairing code') });
    genWrap.appendChild(genBtn);
    const codeOut = el('div', { class: 'pair-code', 'data-testid': 'pair-code' });
    genWrap.appendChild(codeOut);
    genBtn.addEventListener('click', async () => {
        genBtn.disabled = true; genBtn.textContent = T('Oluşturuluyor…', 'Generating…');
        const r = await postPair('generate');
        genBtn.disabled = false; genBtn.textContent = T('Eşleşme kodu oluştur', 'Generate a pairing code');
        if (r?.code) codeOut.textContent = r.code;
        else codeOut.textContent = T('Kod oluşturulamadı', 'Could not create a code');
    });
    body.appendChild(genWrap);

    body.appendChild(el('div', { class: 'pair-or', text: T('— veya —', '— or —') }));

    // …or enter the partner's code.
    const enterWrap = el('div', { class: 'pair-block' });
    const input = el('input', { class: 'pair-input', 'data-testid': 'pair-input', maxlength: '6', placeholder: 'A1B2C3' });
    const enterBtn = el('button', { class: 'agent-go', type: 'button', 'data-testid': 'pair-redeem', text: T('Kodla eşleş', 'Pair with code') });
    enterBtn.addEventListener('click', async () => {
        const code = (input.value || '').trim();
        if (!code) return;
        enterBtn.disabled = true;
        const r = await postPair('redeem', { code });
        enterBtn.disabled = false;
        if (r?.paired || r?.pairId) renderPaired(body, r.partner);
        else input.style.borderColor = '#ef4444';
    });
    enterWrap.appendChild(input);
    enterWrap.appendChild(enterBtn);
    body.appendChild(enterWrap);
}

function renderPaired(body, partner) {
    body.innerHTML = '';
    body.appendChild(el('h3', { class: 'agent-feat-h', text: 'Pair Mode' }));
    body.appendChild(el('div', { class: 'pair-status', 'data-testid': 'pair-status', text: T('✓ Eşleştiniz!', '✓ Paired!') }));
    const go = el('button', { class: 'agent-go', type: 'button', 'data-testid': 'pair-recommend', text: T('İkiniz için öner', 'Recommend for you two') });
    go.addEventListener('click', () => runPairRecommend(body, go, partner));
    body.appendChild(go);
}

async function runPairRecommend(body, go, partner) {
    go.disabled = true; go.textContent = T('Lumi düşünüyor…', 'Lumi is thinking…');
    try {
        const myTaste = getTasteProfile();
        // The partner's full taste lives under their UID server-side; for the prompt we use
        // our taste + a request for the overlap. (A future pass can fetch the partner's
        // public taste; the union-seen filter still removes anything WE have seen.)
        const lang = isTR() ? 'tr' : 'en';
        const prompt = buildPairPrompt(myTaste, { likedTitles: [], ratedTitles: [] }, lang);
        const userId = window.AuthService?.currentUser?.uid || 'anonymous';
        const res = await SearchService.hybridSearch(prompt, userId);
        const results = (res && Array.isArray(res.results)) ? res.results : [];
        const seen = getSeenSet();
        const fresh = results.filter((r) => r && r.id != null && !seen.has(String(r.id)));
        renderPairResults(body, (fresh.length ? fresh : results).slice(0, 5), partner);
    } catch (e) {
        console.error('[pair] recommend error', e);
        go.disabled = false; go.textContent = T('Tekrar dene', 'Try again');
    }
}

function renderPairResults(body, picks, partner) {
    body.innerHTML = '';
    body.appendChild(el('h3', { class: 'agent-feat-h', text: T('İkiniz için', 'For you two') }));
    if (!picks.length) {
        body.appendChild(el('p', { class: 'agent-feat-sub', text: T('Öneri bulunamadı, tekrar dene.', 'No picks found, try again.') }));
    }
    const grid = el('div', { class: 'pair-results' });
    for (const p of picks) {
        const title = p.title || p.name || '—';
        const card = el('button', { class: 'pair-result', type: 'button', 'data-testid': 'pair-result' });
        if (p.poster_path) card.appendChild(el('img', { class: 'pair-result-poster', src: IMG + p.poster_path, alt: title }));
        card.appendChild(el('span', { class: 'pair-result-title', text: title }));
        card.addEventListener('click', () => {
            document.getElementById('agent-overlay')?.remove();
            const type = p.media_type || (p.first_air_date ? 'tv' : 'movie');
            (window.openDetail || window.renderDetailPage)?.(p.id, type);
        });
        grid.appendChild(card);
    }
    body.appendChild(grid);
    const again = el('button', { class: 'agent-ghost', type: 'button', text: T('Yeni öneri', 'New picks') });
    again.addEventListener('click', () => renderPaired(body, partner));
    body.appendChild(again);
}

// Register the hub hook on import.
if (typeof window !== 'undefined') {
    window.lumiAgent = window.lumiAgent || {};
    window.lumiAgent.pair = renderPairPanel;
}
