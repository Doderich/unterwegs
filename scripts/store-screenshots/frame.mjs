#!/usr/bin/env node
// Frames raw app screenshots for the stores: a headline in the icon's palette (white and sand on its teal) above the screen in a phone outline.
//   node scripts/store-screenshots/frame.mjs --platform ios|android [--in build/store-screens/raw] [--out build/store-screens]
// Raw captures are named <platform>-<lang>-<shot>.png (shots and headlines: captions.json). Output keeps the name.
// Sizes: iOS 1320×2868 (6.9" iPhone, the size App Store Connect requires); Android 1080×1920 (Play: the long side
// may be at most twice the short side, so a full-height phone screen is scaled down to fit).
// Renders with the installed Google Chrome (headless); captures contain demo data only and stay in build/.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '../..');
const { values: args } = parseArgs({
  options: {
    platform: { type: 'string', default: 'ios' },
    in: { type: 'string', default: 'build/store-screens/raw' },
    out: { type: 'string', default: 'build/store-screens' },
  },
});
const SIZE = { ios: [1320, 2868], android: [1080, 1920] }[args.platform];
if (!SIZE) throw new Error('--platform must be ios or android');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) throw new Error('Google Chrome is needed for rendering');

const captions = JSON.parse(readFileSync(join(import.meta.dirname, 'captions.json'), 'utf8'));
const inDir = resolve(root, args.in);
const outDir = resolve(root, args.out, args.platform);
mkdirSync(outDir, { recursive: true });

const [W, H] = SIZE;
// Proportions relative to the canvas width, so both sizes look the same.
const u = W / 1320;
const fontPx = (lang) => Math.round((lang === 'ja' ? 100 : 108) * u);
const headlineTop = Math.round(170 * u);
const phoneGap = Math.round(110 * u);
const bezel = Math.round(18 * u);
const bottom = Math.round(70 * u);
const radius = Math.round((args.platform === 'ios' ? 110 : 70) * u);

/** Screen width that fits both the canvas width and the height left under the headline. */
function screenWidth(image, lang) {
  const [w, h] = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', image], { encoding: 'utf8' })
    .match(/\d+$/gm)
    .map(Number);
  const free = H - headlineTop - 2 * fontPx(lang) * 1.12 - phoneGap - 2 * bezel - bottom;
  return Math.floor(Math.min(1040 * u, (free * w) / h));
}

function page(image, [line1, line2], lang) {
  const screenW = screenWidth(image, lang);
  const font =
    lang === 'ja'
      ? `"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif`
      : `-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    background: linear-gradient(180deg, #4A9692 0%, #2F7672 100%);
    font-family: ${font}; color: #FFFFFF;
    display: flex; flex-direction: column; align-items: center;
  }
  h1 {
    margin-top: ${headlineTop}px; text-align: center;
    font-size: ${fontPx(lang)}px; line-height: 1.12; font-weight: 800;
    letter-spacing: ${lang === 'ja' ? 0 : -0.02}em;
  }
  h1 span { display: block; }
  h1 span + span { color: #F7E6CF; }
  .phone {
    margin-top: ${phoneGap}px; padding: ${bezel}px; border-radius: ${radius + bezel}px;
    background: #1C1C1E; box-shadow: 0 ${Math.round(40 * u)}px ${Math.round(120 * u)}px rgba(11, 46, 57, .30);
  }
  .phone img { display: block; width: ${screenW}px; border-radius: ${radius}px; }
</style></head><body>
  <h1><span>${line1}</span><span>${line2}</span></h1>
  <div class="phone"><img src="file://${image}"></div>
</body></html>`;
}

const tmp = mkdtempSync(join(tmpdir(), 'unterwegs-frames-'));
try {
  const files = readdirSync(inDir).filter((f) => f.startsWith(`${args.platform}-`) && f.endsWith('.png'));
  if (!files.length) throw new Error(`No ${args.platform}-<lang>-<shot>.png in ${inDir}`);
  for (const file of files.sort()) {
    const [, lang, shot] = file.replace(/\.png$/, '').split('-');
    const caption = captions[shot]?.[lang];
    if (!caption) throw new Error(`No caption for ${shot}/${lang} (${file})`);
    const html = join(tmp, `${file}.html`);
    writeFileSync(html, page(join(inDir, file), caption, lang));
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--allow-file-access-from-files',
        `--window-size=${W},${H}`,
        `--screenshot=${join(outDir, file)}`,
        `file://${html}`,
      ],
      { stdio: 'ignore' },
    );
    console.log(`${args.platform}/${file}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
