/**
 * Phase 04.6-02 Task 2.2 — Trivia loader integration (compute-level).
 *
 * Tests the pure render-compute path exported by detail.js so we can assert
 * grounding + clamping + attribution behavior without a full DOM.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeTriviaRender, buildTriviaPromptFor } from '../src/features/detail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const omdbInception = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'omdb-inception.json'), 'utf-8')
);
const tmdbInception = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'tmdb-inception.json'), 'utf-8')
);

describe('buildTriviaPromptFor', () => {
    it('produces an OMDB+TMDB grounded prompt when both payloads present', () => {
        const { prompt, source } = buildTriviaPromptFor(tmdbInception, omdbInception, 'movie');
        expect(source).toBe('omdb+tmdb');
        // Contract instruction strings — regression guard against weakening.
        expect(prompt).toContain('Use ONLY these facts');
        expect(prompt).toContain("If unsure, say 'no notable trivia available'");
        expect(prompt).toContain('Never invent awards, dates, names, or events');
        expect(prompt).toContain('≤3 short bullets');
        // Ground-truth payload visible to Gemini.
        expect(prompt).toContain('Won 4 Oscars');
        expect(prompt).toContain('Christopher Nolan');
    });

    it('falls back to tmdb-only when OMDB is null (rate-limit / niche title)', () => {
        const { source, prompt } = buildTriviaPromptFor(tmdbInception, null, 'movie');
        expect(source).toBe('tmdb-only');
        // Still grounded — TMDB-side facts present.
        expect(prompt).toContain('Leonardo DiCaprio');
        // OMDB-side facts absent.
        expect(prompt).not.toContain('Won 4 Oscars');
    });

    it('falls back to tmdb-only when OMDB returns an error envelope (429)', () => {
        const { source } = buildTriviaPromptFor(tmdbInception, { error: 'rate_limited' }, 'movie');
        expect(source).toBe('tmdb-only');
    });

    it('tags the prompt as TYPE: series for tv', () => {
        const { prompt } = buildTriviaPromptFor(tmdbInception, omdbInception, 'tv');
        expect(prompt).toContain('TYPE: series');
    });
});

describe('computeTriviaRender — render-level compute', () => {
    it('clamps Gemini output to 3 bullets', () => {
        const fakeGemini = '• fact one\n• fact two\n• fact three\n• fact four\n• fact five';
        const { bullets, attribution } = computeTriviaRender(tmdbInception, omdbInception, fakeGemini);
        expect(bullets.length).toBe(3);
        expect(bullets[0]).toBe('fact one');
        expect(attribution).toBe('Source: OMDB + TMDB');
    });

    it('uses "Source: TMDB" attribution when OMDB is absent', () => {
        const { attribution, source } = computeTriviaRender(tmdbInception, null, '• one\n• two');
        expect(attribution).toBe('Source: TMDB');
        expect(source).toBe('tmdb-only');
    });

    it('uses "Source: OMDB + TMDB" attribution when both present', () => {
        const { attribution, source } = computeTriviaRender(tmdbInception, omdbInception, '• fact');
        expect(attribution).toBe('Source: OMDB + TMDB');
        expect(source).toBe('omdb+tmdb');
    });

    it('returns empty bullets when Gemini emits the no-trivia sentinel', () => {
        const { bullets } = computeTriviaRender(tmdbInception, omdbInception, 'no notable trivia available');
        expect(bullets).toEqual([]);
    });

    it('still produces a valid attribution even on empty Gemini output', () => {
        const { bullets, attribution } = computeTriviaRender(tmdbInception, null, '');
        expect(bullets).toEqual([]);
        expect(attribution).toBe('Source: TMDB');
    });
});
