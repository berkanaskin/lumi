/**
 * Phase 04.6-02 Task 2.1 — trivia-grounding pure helpers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    buildGroundTruth,
    buildGroundedPrompt,
    clampBullets,
} from '../src/lib/trivia-grounding.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const omdbInception = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'omdb-inception.json'), 'utf-8')
);
const tmdbInception = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'tmdb-inception.json'), 'utf-8')
);

describe('buildGroundTruth', () => {
    it('returns source=omdb+tmdb when both payloads are present', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.source).toBe('omdb+tmdb');
    });

    it('embeds OMDB Awards verbatim into facts.awards', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.facts.awards).toContain('Won 4 Oscars');
    });

    it('parses Rotten Tomatoes / Metacritic / IMDb ratings cleanly', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.facts.ratings.rt).toBe('87%');
        expect(g.facts.ratings.metacritic).toBe('74/100');
        expect(g.facts.ratings.imdb).toBe('8.8/10');
    });

    it('embeds TMDB top-5 cast', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.facts.cast_top5).toBeDefined();
        expect(g.facts.cast_top5.length).toBeLessThanOrEqual(5);
        expect(g.facts.cast_top5[0].name).toBe('Leonardo DiCaprio');
    });

    it('extracts key crew (director, writer, composer, dop) from TMDB credits', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.facts.key_crew.director).toBe('Christopher Nolan');
        expect(g.facts.key_crew.composer).toBe('Hans Zimmer');
        expect(g.facts.key_crew.dop).toBe('Wally Pfister');
    });

    it('falls back to source=tmdb-only when OMDB is null', () => {
        const g = buildGroundTruth(tmdbInception, null);
        expect(g.source).toBe('tmdb-only');
        expect(g.facts.awards).toBeUndefined();
        expect(g.facts.ratings).toBeUndefined();
        expect(g.facts.cast_top5).toBeDefined(); // TMDB-side still present
    });

    it('falls back to tmdb-only when OMDB has Response:"False"', () => {
        const g = buildGroundTruth(tmdbInception, { Response: 'False', Error: 'Movie not found!' });
        expect(g.source).toBe('tmdb-only');
    });

    it('falls back to tmdb-only when OMDB envelope is an error object', () => {
        const g = buildGroundTruth(tmdbInception, { error: 'rate_limited' });
        expect(g.source).toBe('tmdb-only');
    });

    it('strips OMDB "N/A" values entirely (no placeholder leaks into facts)', () => {
        const omdbWithNAs = {
            ...omdbInception,
            Awards: 'N/A',
            BoxOffice: 'N/A',
            Plot: 'N/A',
        };
        const g = buildGroundTruth(tmdbInception, omdbWithNAs);
        expect(g.facts.awards).toBeUndefined();
        expect(g.facts.box_office).toBeUndefined();
        expect(g.facts.plot).toBeUndefined();
    });

    it('includes tagline + production companies from TMDB', () => {
        const g = buildGroundTruth(tmdbInception, omdbInception);
        expect(g.facts.tagline).toBe('Your mind is the scene of the crime.');
        expect(g.facts.production_companies).toContain('Legendary Pictures');
    });
});

describe('buildGroundedPrompt — strict instruction strings (CONTRACT)', () => {
    const ground = buildGroundTruth(tmdbInception, omdbInception);
    const prompt = buildGroundedPrompt(ground, 'movie');

    it('contains "Use ONLY these facts"', () => {
        expect(prompt).toContain('Use ONLY these facts');
    });

    it("contains \"If unsure, say 'no notable trivia available'\"", () => {
        expect(prompt).toContain("If unsure, say 'no notable trivia available'");
    });

    it('contains "Never invent awards, dates, names, or events"', () => {
        expect(prompt).toContain('Never invent awards, dates, names, or events');
    });

    it('contains "≤3 short bullets"', () => {
        expect(prompt).toContain('≤3 short bullets');
    });

    it('embeds JSON-stringified ground.facts', () => {
        expect(prompt).toContain('GROUND_TRUTH:');
        expect(prompt).toContain('"awards"');
        expect(prompt).toContain('Won 4 Oscars');
        expect(prompt).toContain('Christopher Nolan');
    });

    it('labels the type as "series" for tv', () => {
        const p2 = buildGroundedPrompt(ground, 'tv');
        expect(p2).toContain('TYPE: series');
    });

    it('labels the type as "movie" for movie', () => {
        expect(prompt).toContain('TYPE: movie');
    });

    it('echoes ground.source for downstream auditability', () => {
        expect(prompt).toContain('GROUND_TRUTH_SOURCE: omdb+tmdb');
    });
});

describe('clampBullets', () => {
    it('splits bullet lines and caps at 3', () => {
        const out = clampBullets('• a\n• b\n• c\n• d\n• e');
        expect(out).toEqual(['a', 'b', 'c']);
    });

    it('handles plain newline-separated lines', () => {
        const out = clampBullets('fact 1\nfact 2\nfact 3\nfact 4');
        expect(out.length).toBe(3);
    });

    it('strips leading numeric / dash / asterisk prefixes', () => {
        const out = clampBullets('1. first\n- second\n* third');
        expect(out).toEqual(['first', 'second', 'third']);
    });

    it('returns [] for the no-trivia sentinel', () => {
        expect(clampBullets('no notable trivia available')).toEqual([]);
        expect(clampBullets('No notable trivia available.')).toEqual([]);
    });

    it('returns [] for empty / null input', () => {
        expect(clampBullets('')).toEqual([]);
        expect(clampBullets(null)).toEqual([]);
        expect(clampBullets(undefined)).toEqual([]);
    });
});
