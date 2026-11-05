#!/usr/bin/env node
// Uploads an Android App Bundle to a Google Play track through the Play Developer API, in one edit:
// bundle, R8 mapping, track release, commit. Called by scripts/android-bundle.sh; no dependencies.
//   node scripts/play-upload.mjs --credentials <service-account.json> --package <id> --bundle <aab>
//     [--mapping <mapping.txt>] [--track internal] [--status draft|completed] [--name <release name>]
// The service account needs release permissions for the app in the Play Console (docs/RELEASING.md → Google Play).
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    credentials: { type: 'string' },
    package: { type: 'string' },
    bundle: { type: 'string' },
    mapping: { type: 'string' },
    track: { type: 'string', default: 'internal' },
    status: { type: 'string', default: 'draft' },
    name: { type: 'string' },
  },
});
for (const required of ['credentials', 'package', 'bundle']) {
  if (!args[required]) throw new Error(`--${required} is required`);
}
if (!['draft', 'completed'].includes(args.status)) throw new Error('--status must be draft or completed');

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

async function call(method, url, { json, file, contentType } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(file ? { 'Content-Type': contentType ?? 'application/octet-stream' } : {}),
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
const editUrl = (base) => `${base}/edits/${edit.id}`;
try {
  console.log(`Uploading ${args.bundle} …`);
  const bundle = await call('POST', `${editUrl(UPLOAD_API)}/bundles?uploadType=media`, { file: args.bundle });
  console.log(`Bundle accepted: versionCode ${bundle.versionCode}`);

  if (args.mapping) {
    await call(
      'POST',
      `${editUrl(UPLOAD_API)}/apks/${bundle.versionCode}/deobfuscationFiles/proguard?uploadType=media`,
      { file: args.mapping },
    );
    console.log('R8 mapping attached');
  }

  await call('PUT', `${editUrl(API)}/tracks/${args.track}`, {
    json: {
      track: args.track,
      releases: [
        {
          ...(args.name ? { name: args.name } : {}),
          versionCodes: [String(bundle.versionCode)],
          status: args.status,
        },
      ],
    },
  });
  await call('POST', `${editUrl(API)}:commit`);
  console.log(
    `Released versionCode ${bundle.versionCode} to the ${args.track} track (${args.status}).` +
      (args.status === 'draft' ? ' Roll it out in the Play Console.' : ''),
  );
} catch (error) {
  // An uncommitted edit would block the next one for a while; drop it.
  await call('DELETE', editUrl(API)).catch(() => {});
  throw error;
}
