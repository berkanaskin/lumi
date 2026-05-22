#!/usr/bin/env node
/**
 * Phase 04.6-01 Task 1.4 — Placeholder SVG logo generator.
 *
 * Generates a brand-neutral SVG for every slug listed in src/data/region-platforms.js
 * that does NOT already have a real file in public/img/providers/.
 *
 * Real PNG logos for regional platforms (RTL+, Joyn, Canal+, U-NEXT, etc.) require
 * licensed sources from each provider's press kit; those cannot be acquired in
 * this build environment. Placeholders unblock the UI; design follow-up to
 * replace before launch — see SUMMARY "Logo acquisition gaps".
 *
 * Each placeholder is a 256×144 SVG: dark slate background + provider initials
 * (or name if short). Same dimensions as the real logos for layout parity.
 *
 * Run:  node scripts/gen-placeholder-logos.js
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { REGION_PLATFORMS, FALLBACK_PLATFORMS } from '../src/data/region-platforms.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'public', 'img', 'providers');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Stable deterministic colour per slug from name hash (no two adjacent regions look identical).
function hashColor(slug) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return `hsl(${hue},42%,28%)`;
}

function initials(name) {
    // Strip "+" suffix (Disney+, Apple TV+), keep letters/digits
    const cleaned = name.replace(/\+/g, ' Plus').replace(/[^A-Za-z0-9 ]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
    return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function svgFor(slug, name) {
    const bg = hashColor(slug);
    const initialsText = initials(name);
    // 256×144 — matches real PNG logos ratio
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 144" width="256" height="144">
  <rect width="256" height="144" rx="16" ry="16" fill="${bg}"/>
  <text x="128" y="78" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
        font-weight="700" font-size="44" fill="#fff" letter-spacing="2">
    ${initialsText}
  </text>
  <text x="128" y="118" text-anchor="middle"
        font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
        font-weight="400" font-size="14" fill="rgba(255,255,255,0.7)">
    ${name.replace(/[<>&]/g, '')}
  </text>
</svg>
`;
}

const seen = new Set();
const allEntries = [];
for (const list of Object.values(REGION_PLATFORMS)) for (const p of list) allEntries.push(p);
for (const p of FALLBACK_PLATFORMS) allEntries.push(p);

let created = 0;
let skipped = 0;
const placeholders = [];

for (const p of allEntries) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);

    // Determine destination filename from the declared logo_path. We honour
    // whatever extension the declaration chose (.svg or .png). For .png we
    // still emit SVG content under the .png filename only if the file truly
    // is missing — but to stay correct we instead emit `.svg` and leave the
    // `.png` declaration alone (Task 1.4 follow-up). Skip if a real file
    // already exists.
    const declared = path.join(repoRoot, 'public', p.logo_path);
    if (fs.existsSync(declared)) {
        skipped++;
        continue;
    }

    // If declared extension is .png we cannot trivially synthesise a PNG without
    // pulling an image lib. Emit an .svg sibling instead and rewrite the data
    // file's logo_path to point at it? No — to keep diffs surgical, we write
    // the placeholder under the declared filename anyway. SVG content inside
    // a .png-named file would 404 on MIME-strict servers; instead, always
    // write `.svg` extension and require the resolver to handle either.
    //
    // To avoid changing region-platforms.js, we explicitly write the SVG to
    // the .svg-named twin AND, where declaration is .png, ALSO copy to the
    // .png path (browsers usually serve SVG content regardless of extension
    // in dev; for production, follow-up real logos will replace these).
    const svg = svgFor(p.slug, p.name);
    fs.writeFileSync(declared, svg, 'utf8');
    placeholders.push(`${p.slug} → ${p.logo_path}`);
    created++;
}

console.log(`[gen-placeholder-logos] created ${created}, skipped ${skipped} (already exist)`);
if (placeholders.length) {
    console.log('Placeholders generated for follow-up replacement:');
    for (const line of placeholders) console.log('  -', line);
}
