/**
 * Phase 05.5 — fragman overlay player.
 * playVideo artık sayfanın dibindeki #video-player'ı doldurmaz; body'ye
 * sabit konumlu overlay ekler. closeVideo / ESC / backdrop kapatır.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let playVideo, closeVideo, state;
let origDocument, origWindow, origLocalStorage;

beforeEach(async () => {
    origDocument = global.document;
    origWindow = global.window;
    origLocalStorage = global.localStorage;
    const dom = new JSDOM('<!doctype html><html><body></body></html>',
        { url: 'http://localhost/', pretendToBeVisual: true });
    global.document = dom.window.document;
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    dom.window.i18n = { t: (k) => k, currentLang: 'tr' };
    vi.resetModules();
    const st = await import('../src/lib/state.js');
    state = st.state;
    const mod = await import('../src/features/detail.js');
    playVideo = mod.playVideo;
    closeVideo = mod.closeVideo;
});

afterEach(() => {
    global.document = origDocument;
    global.window = origWindow;
    global.localStorage = origLocalStorage;
    vi.resetModules();
});

describe('video overlay', () => {
    it('playVideo body üstüne overlay açar, iframe doğru videoyu yükler', () => {
        state.currentVideos = { trailer: [] };
        state.currentVideoCategory = 'trailer';
        playVideo('abc123');
        const overlay = document.getElementById('lumi-video-overlay');
        expect(overlay).toBeTruthy();
        expect(overlay.querySelector('iframe').src).toContain('abc123');
        expect(overlay.querySelector('iframe').src).toContain('autoplay=1');
    });

    it('closeVideo overlay\'i kaldırır', () => {
        state.currentVideos = { trailer: [] };
        playVideo('abc123');
        closeVideo();
        expect(document.getElementById('lumi-video-overlay')).toBeNull();
    });

    it('ESC tuşu overlay\'i kapatır ve listener temizlenir', () => {
        state.currentVideos = { trailer: [] };
        playVideo('abc123');
        document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.getElementById('lumi-video-overlay')).toBeNull();
    });

    it('birden çok video varsa geçiş şeridi render edilir', () => {
        state.currentVideos = {
            trailer: [
                { id: { videoId: 'v1' }, snippet: { title: 'T1', thumbnails: { medium: { url: 'http://x/1.jpg' } } } },
                { id: { videoId: 'v2' }, snippet: { title: 'T2', thumbnails: { medium: { url: 'http://x/2.jpg' } } } },
            ],
        };
        state.currentVideoCategory = 'trailer';
        playVideo('v1');
        const thumbs = document.querySelectorAll('.video-overlay__thumb');
        expect(thumbs.length).toBe(2);
        expect(thumbs[0].classList.contains('active')).toBe(true);
    });

    it('tek videoda şerit görünmez', () => {
        state.currentVideos = { trailer: [{ id: { videoId: 'v1' }, snippet: { title: 'T1' } }] };
        state.currentVideoCategory = 'trailer';
        playVideo('v1');
        expect(document.querySelector('.video-overlay__strip')).toBeNull();
    });
});
