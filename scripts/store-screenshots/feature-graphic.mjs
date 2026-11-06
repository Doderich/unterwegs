#!/usr/bin/env node
// Google Play's feature graphic (1024×500, one per language) and the 512×512 listing icon, in the teal of the framed
// screenshots: node scripts/store-screenshots/feature-graphic.mjs [--out build/store-screens]
// Writes <out>/play/feature-<lang>.png and <out>/play/icon-512.png. The tagline is the "home" caption (captions.json).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '../..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: 'build/store-screens' } } });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) throw new Error('Google Chrome is needed for rendering');

const captions = JSON.parse(readFileSync(join(import.meta.dirname, 'captions.json'), 'utf8'));
const icon = join(root, 'assets/images/icon.png');
const outDir = resolve(root, args.out, 'play');
mkdirSync(outDir, { recursive: true });

const [W, H] = [1024, 500];

function page(lang) {
  const [line1, line2] = captions.home[lang];
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
    display: flex; align-items: center; gap: 64px; padding: 0 80px;
  }
  img { width: 260px; height: 260px; border-radius: 58px; flex: none;
    box-shadow: 0 24px 64px rgba(11, 46, 57, .30); }
  .name { font-size: 40px; font-weight: 700; opacity: .85; margin-bottom: 18px; letter-spacing: -0.01em; }
  h1 { font-size: ${lang === 'ja' ? 54 : 60}px; line-height: 1.12; font-weight: 800;
    letter-spacing: ${lang === 'ja' ? 0 : -0.02}em; }
  h1 span { display: block; }
  h1 span + span { color: #F7E6CF; }
</style></head><body>
  <img src="file://${icon}">
  <div><div class="name">Unterwegs</div><h1><span>${line1}</span><span>${line2}</span></h1></div>
</body></html>`;
}

const tmp = mkdtempSync(join(tmpdir(), 'unterwegs-feature-'));
try {
  for (const lang of Object.keys(captions.home)) {
    const html = join(tmp, `${lang}.html`);
    writeFileSync(html, page(lang));
    const file = join(outDir, `feature-${lang}.png`);
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--allow-file-access-from-files',
        `--window-size=${W},${H}`,
        `--screenshot=${file}`,
        `file://${html}`,
      ],
      { stdio: 'ignore' },
    );
    console.log(file);
  }
  execFileSync('sips', ['-z', '512', '512', icon, '--out', join(outDir, 'icon-512.png')], { stdio: 'ignore' });
  console.log(join(outDir, 'icon-512.png'));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
