#!/usr/bin/env node
// Writes src/legal/licenses.json: every npm package that ends up in the app's JavaScript bundle (iOS and Android),
// with its licence text, plus the native libraries in NATIVE that don't come as an npm package.
// Run before a release: npm run licenses (docs/RELEASING.md).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'src/legal/licenses.json');

/** Native libraries pulled in by Pods/Gradle rather than npm. Check `ios/Podfile.lock` when native deps change. */
const NATIVE = [
  {
    name: 'MapLibre Native',
    license: 'BSD-2-Clause',
    url: 'https://github.com/maplibre/maplibre-native',
    text: null,
  },
  {
    name: 'ReachabilitySwift',
    license: 'MIT',
    url: 'https://github.com/ashleymills/Reachability.swift',
    text: null,
  },
];

/** `.../node_modules/@scope/name/lib/x.js` → `.../node_modules/@scope/name` (keeps nested node_modules). */
function packageDir(source) {
  const i = source.lastIndexOf('node_modules/');
  if (i < 0) return null;
  const rest = source.slice(i + 'node_modules/'.length).split('/');
  const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  return join(root, source.slice(0, i).replace(/^\/+/, ''), 'node_modules', name);
}

function bundledPackageDirs(platform, dir) {
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', platform, '--output-dir', dir, '--source-maps', '--no-bytecode'],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const jsDir = join(dir, '_expo/static/js', platform);
  const dirs = new Set();
  for (const file of readdirSync(jsDir).filter((f) => f.endsWith('.map'))) {
    const map = JSON.parse(readFileSync(join(jsDir, file), 'utf8'));
    for (const section of map.sections ?? [{ map }]) {
      for (const source of section.map.sources) {
        const pkg = packageDir(source);
        if (pkg) dirs.add(pkg);
      }
    }
  }
  return dirs;
}

function repositoryUrl(pkg) {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const url = (repo ?? pkg.homepage ?? '')
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/^github:/, 'https://github.com/');
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) return `https://github.com/${url}`;
  return /^https?:\/\//.test(url) ? url : null;
}

function licenseText(dir) {
  const file = readdirSync(dir).find((f) => /^(licen[sc]e|copying)(\.|$)/i.test(f));
  return file ? readFileSync(join(dir, file), 'utf8').trim() : null;
}

const tmp = mkdtempSync(join(tmpdir(), 'unterwegs-licenses-'));
try {
  const dirs = new Set([
    ...bundledPackageDirs('ios', join(tmp, 'ios')),
    ...bundledPackageDirs('android', join(tmp, 'android')),
  ]);
  const entries = new Map();
  for (const dir of dirs) {
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    // The app itself and its local modules aren't third-party.
    if (pkg.name === 'unterwegs' || !dir.includes('node_modules')) continue;
    const key = `${pkg.name}@${pkg.version}`;
    if (entries.has(key)) continue;
    const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'see repository');
    entries.set(key, {
      name: pkg.name,
      version: pkg.version,
      license,
      url: repositoryUrl(pkg),
      text: licenseText(dir),
    });
  }
  const list = [...entries.values(), ...NATIVE].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  writeFileSync(out, JSON.stringify(list, null, 2) + '\n');
  console.log(`${list.length} entries → ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
