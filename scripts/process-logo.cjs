// Optimizes the current Lumi logo (Jan 8 2026 neon-spotlight wordmark).
// Input  : assets/Logotype_design_for_2k_202601082219.jpeg (2752x1536, 1.5MB)
// Output : public/img/lumi-logo.png   (~400x224, ~25KB)
//          public/img/lumi-logo@2x.png (~800x448, ~60KB)
//
// Strategy:
//   1. Trim the dark border (sharp .trim() with high threshold to keep glow).
//   2. Resize so the wordmark visually fills the box.
//   3. Output PNG with palette quantization (≤30KB target).
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SRC = path.resolve(__dirname, '..', 'assets', 'Logotype_design_for_2k_202601082219.jpeg');
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'img');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
    const meta = await sharp(SRC).metadata();
    console.log('input:', meta.width + 'x' + meta.height, meta.format);

    // Trim dark border to focus on the wordmark.
    // The source has the wordmark roughly centered with letter aspect ratio ~3:1.
    // Crop center 65% horizontally and 50% vertically.
    const cropW = Math.round(meta.width  * 0.65);
    const cropH = Math.round(meta.height * 0.48);
    const left  = Math.round((meta.width  - cropW) / 2);
    const top   = Math.round((meta.height - cropH) / 2);

    const cropped = sharp(SRC).extract({ left, top, width: cropW, height: cropH });

    // 1x — 32px renders crisp at 400w (12.5x density on 1x mobile)
    await cropped
        .clone()
        .resize({ width: 400, withoutEnlargement: false })
        .png({ quality: 85, compressionLevel: 9, palette: true })
        .toFile(path.join(OUT_DIR, 'lumi-logo.png'));

    // 2x retina
    await cropped
        .clone()
        .resize({ width: 800, withoutEnlargement: false })
        .png({ quality: 90, compressionLevel: 9, palette: true })
        .toFile(path.join(OUT_DIR, 'lumi-logo@2x.png'));

    const s1 = fs.statSync(path.join(OUT_DIR, 'lumi-logo.png'));
    const s2 = fs.statSync(path.join(OUT_DIR, 'lumi-logo@2x.png'));
    console.log('lumi-logo.png    :', s1.size, 'bytes');
    console.log('lumi-logo@2x.png :', s2.size, 'bytes');
}
run().catch((e) => { console.error(e); process.exit(1); });
