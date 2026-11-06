#!/usr/bin/env node
// Uploads the Play store graphics through the Play Developer API, in one edit per run: per language the 512 px icon,
// the feature graphic and the phone screenshots (replacing the existing ones, in captions.json order). Languages
// without a store listing yet are skipped: add the translation in the Play Console first.
//   node scripts/play-graphics.mjs --credentials <service-account.json> --package <id> [--dir build/store-screens]
//     [--dry-run]   lists the store listings and the files it would upload, then deletes the edit
// Input: scripts/store-screenshots/frame.mjs (android-<lang>-<shot>.png) and feature-graphic.mjs (play/).
// The service account needs "Manage store presence" for the app in the Play Console.
import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const { values: args } = parseArgs({
  options: {
    credentials: { type: 'string' },
    package: { type: 'string' },
    dir: { type: 'string', default: 'build/store-screens' },
    'dry-run': { type: 'boolean', default: false },
  },
});
for (const required of ['credentials', 'package']) if (!args[required]) throw new Error(`--${required} is required`);

const LANGUAGES = { de: 'de-DE', en: 'en-US', ja: 'ja-JP' };
const captions = JSON.parse(readFileSync(join(root, 'scripts/store-screenshots/captions.json'), 'utf8'));
const dir = resolve(root, args.dir);
const plan = Object.entries(LANGUAGES).map(([lang, language]) => ({
  language,
  icon: join(dir, 'play/icon-512.png'),
  featureGraphic: join(dir, `play/feature-${lang}.png`),
  phoneScreenshots: Object.keys(captions).map((shot) => join(dir, `android/android-${lang}-${shot}.png`)),
}));
for (const { icon, featureGraphic, phoneScreenshots } of plan) {
  for (const file of [icon, featureGraphic, ...phoneScreenshots])
    if (!existsSync(file)) throw new Error(`Missing ${file}`);
}

const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${args.package}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${args.package}`;

/** OAuth access token for the service account (JWT bearer grant, RFC 7523). */
async function accessToken(credentialsFile) {
  const sa = JSON.parse(readFileSync(credentialsFile, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token request failed (${res.status}): ${body.error_description ?? body.error}`);
  return body.access_token;
}

const token = await accessToken(args.credentials);

async function call(method, url, { json, file } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(file ? { 'Content-Type': 'image/png' } : {}),
    },
    body: json ? JSON.stringify(json) : file ? readFileSync(file) : undefined,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok)
    throw new Error(`${method} ${url.replace(/\?.*/, '')} failed (${res.status}): ${body.error?.message ?? text}`);
  return body;
}

const edit = await call('POST', `${API}/edits`, { json: {} });
const editPath = `/edits/${edit.id}`;
let committed = false;
try {
  const { listings = [] } = await call('GET', `${API}${editPath}/listings`);
  console.log(`Store listings: ${listings.map((l) => l.language).join(', ') || 'none'}`);
  const existing = new Set(listings.map((l) => l.language));
  for (const { language, icon, featureGraphic, phoneScreenshots } of plan) {
    if (!existing.has(language)) {
      console.log(
        `${language}: skipped, no store listing in this language yet (Play Console → Main store listing → Manage translations)`,
      );
      continue;
    }
    if (args['dry-run']) {
      console.log(`${language}: icon, feature graphic, ${phoneScreenshots.length} phone screenshots`);
      continue;
    }
    const images = (type) => `${editPath}/listings/${language}/${type}`;
    for (const [type, file] of [
      ['icon', icon],
      ['featureGraphic', featureGraphic],
    ]) {
      await call('DELETE', `${API}${images(type)}`);
      await call('POST', `${UPLOAD_API}${images(type)}?uploadType=media`, { file });
    }
    await call('DELETE', `${API}${images('phoneScreenshots')}`);
    for (const file of phoneScreenshots) {
      await call('POST', `${UPLOAD_API}${images('phoneScreenshots')}?uploadType=media`, { file });
    }
    console.log(`${language}: icon, feature graphic, ${phoneScreenshots.length} phone screenshots uploaded`);
  }
  if (!args['dry-run']) {
    await call('POST', `${API}${editPath}:commit`);
    committed = true;
    console.log('Committed.');
  }
} finally {
  if (!committed) await call('DELETE', `${API}${editPath}`).catch(() => {});
}
