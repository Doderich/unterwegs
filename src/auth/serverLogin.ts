import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { z } from 'zod';

import { normalizeServerUrl } from '@/api/client';
import { keyedFetch } from '@/api/http';
import { tr } from '@/i18n';

/*
 * Logins that end in an API key for this device. The website's SvelteKit proxy adds CSRF itself and
 * strips Set-Cookie, but forwards a `sessionid` cookie we send. allauth's app-client session token is
 * the Django session key, so it works as that cookie for `POST /auth/api-keys/`.
 */

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoginError';
  }
}

const providersSchema = z.array(z.object({ name: z.string(), url: z.string(), usage_required: z.boolean().nullish() }));

export type LoginOptions = {
  /** SSO providers, each opened in a WebView. */
  providers: { name: string; url: string }[];
  /** False when the server enforces SSO (`FORCE_SOCIALACCOUNT_LOGIN`). */
  passwordAllowed: boolean;
};

export async function fetchLoginOptions(
  serverUrl: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<LoginOptions> {
  const base = normalizeServerUrl(serverUrl);
  const res = await fetchImpl(`${base}/auth/social-providers`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new LoginError(tr('common.cantReachServer'));
  const parsed = providersSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new LoginError(tr('serverLogin.isntAdventurelogServer'));
  return {
    providers: parsed.data.map((p) => ({ name: p.name, url: p.url })),
    passwordAllowed: !parsed.data.some((p) => p.usage_required),
  };
}

/** `Unterwegs · Pixel 8` – shown in the website's API key list. */
export function deviceKeyName(): string {
  return `Unterwegs · ${Device.deviceName ?? Device.modelName ?? 'Handy'}`;
}

export type PasswordLoginResult = { status: 'ok'; apiKey: string } | { status: 'mfa'; sessionToken: string };

type AllauthBody = {
  meta?: { session_token?: string };
  data?: { flows?: { id: string; is_pending?: boolean }[] };
};

async function json(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

export async function passwordLogin(
  serverUrl: string,
  username: string,
  password: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<PasswordLoginResult> {
  const base = normalizeServerUrl(serverUrl);
  const res = await fetchImpl(`${base}/auth/app/v1/auth/login`, {
    method: 'POST',
    credentials: 'omit',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  });
  const body = (await json(res)) as AllauthBody | null;
  const token = body?.meta?.session_token;
  if (res.status === 200 && token) return { status: 'ok', apiKey: await createKeyFromSession(base, token, fetchImpl) };
  if (res.status === 401 && token && body?.data?.flows?.some((f) => f.id === 'mfa_authenticate' && f.is_pending)) {
    return { status: 'mfa', sessionToken: token };
  }
  if (res.status === 400 || res.status === 401) {
    const code = (body as { errors?: { code?: string }[] } | null)?.errors?.[0]?.code;
    throw new LoginError(
      code === 'username_password_mismatch'
        ? tr('serverLogin.wrongUsernameOrPassword')
        : tr('serverLogin.signinFailedDoesAccountHave'),
    );
  }
  throw new LoginError(tr('common.cantReachServer'));
}

export async function confirmMfa(
  serverUrl: string,
  sessionToken: string,
  code: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<string> {
  const base = normalizeServerUrl(serverUrl);
  const res = await fetchImpl(`${base}/auth/app/v1/auth/2fa/authenticate`, {
    method: 'POST',
    credentials: 'omit',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
    body: JSON.stringify({ code: code.replace(/\s/g, '') }),
  });
  const body = (await json(res)) as AllauthBody | null;
  if (!res.ok) throw new LoginError(tr('serverLogin.wrongOrExpiredCode'));
  return createKeyFromSession(base, body?.meta?.session_token ?? sessionToken, fetchImpl);
}

/** Creates this device's API key with a logged-in session, then ends the session. */
export async function createKeyFromSession(
  base: string,
  sessionToken: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<string> {
  const res = await fetchImpl(`${base}/auth/api-keys`, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: `sessionid=${sessionToken}`,
    },
    body: JSON.stringify({ name: deviceKeyName() }),
  });
  const body = (await json(res)) as { key?: string } | null;
  if (!res.ok || !body?.key) throw new LoginError(tr('serverLogin.signedInButServerDidnt'));
  await fetchImpl(`${base}/auth/app/v1/auth/session`, {
    method: 'DELETE',
    credentials: 'omit',
    headers: { 'X-Session-Token': sessionToken },
  }).catch(() => undefined);
  return body.key;
}

/**
 * Injected into the SSO WebView once it is back on the website: if the session is logged in, create
 * this device's key (same-origin, the proxy adds CSRF), post it to the app and end the web session.
 */
export function ssoKeyScript(keyName: string): string {
  return `(function () {
  if (window.__unterwegsKey) return;
  window.__unterwegsKey = true;
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  fetch('/auth/user-metadata/', { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(function (r) {
      if (!r.ok) { window.__unterwegsKey = false; post({ signedOut: true }); return null; }
      return fetch('/auth/api-keys/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: ${JSON.stringify(keyName)} })
      }).then(function (k) { return k.json(); }).then(function (k) {
        if (!k || !k.key) { post({ error: 'no-key' }); return; }
        post({ key: k.key });
        fetch('/auth/browser/v1/auth/session', { method: 'DELETE', credentials: 'include' }).catch(function () {});
      });
    })
    .catch(function (e) { window.__unterwegsKey = false; post({ error: String(e) }); });
})(); true;`;
}

/** The WebView is back on the website (not the login pages or the identity provider). */
export function isBackOnWebsite(url: string, serverUrl: string): boolean {
  const base = normalizeServerUrl(serverUrl);
  if (!url.startsWith(base + '/') && url !== base) return false;
  const path = url.slice(base.length) || '/';
  return !/^\/(login|accounts|auth|signup)(\/|\?|$)/.test(path);
}

/*
 * Browser-sheet SSO: when the server serves `server/unterwegs-login.html` at BROWSER_LOGIN_PATH, the
 * app can sign in through the system browser (passkeys work there) instead of the WebView.
 */
export const BROWSER_LOGIN_PATH = '/unterwegs/login.html';
export const BROWSER_LOGIN_CALLBACK = 'unterwegs://login';
const BROWSER_LOGIN_MARKER = 'unterwegs-login-v1';
/** Pages with this marker also return the key encrypted (`seal` → `sealed`). */
const SEALED_LOGIN_MARKER = 'unterwegs-login-v2';

/**
 * How the server's login page can hand the key back: `sealed` encrypts it for this sign-in, `plain` puts it in the
 * callback as is. On Android another app can register `unterwegs://` and catch the callback, so only `sealed`
 * counts there; iOS delivers it to the calling app only (ASWebAuthenticationSession).
 */
export type BrowserLoginMode = 'sealed' | 'plain' | false;

/** Whether the server serves the login page for the browser sheet, and in which mode. */
export async function supportsBrowserLogin(
  serverUrl: string,
  fetchImpl: typeof fetch = keyedFetch,
  platform: string = Platform.OS,
): Promise<BrowserLoginMode> {
  // The deployed browser handoff returns to the production scheme. Staging uses the WebView
  // until that server page supports its own callback, so it cannot open the family app.
  if (Constants.expoConfig?.scheme === 'unterwegs-staging') return false;
  try {
    const res = await fetchImpl(`${normalizeServerUrl(serverUrl)}${BROWSER_LOGIN_PATH}`, { credentials: 'omit' });
    if (!res.ok) return false;
    const page = await res.text();
    if (page.includes(SEALED_LOGIN_MARKER)) return 'sealed';
    return page.includes(BROWSER_LOGIN_MARKER) && platform !== 'android' ? 'plain' : false;
  } catch {
    return false;
  }
}

/**
 * The provider's login URL, sending allauth on to the login page after SSO. `seal` (base64url AES-256 key) asks
 * the page to encrypt the key with it.
 */
export function browserLoginUrl(providerUrl: string, state: string, keyName: string, seal?: string): string {
  // Built by hand: React Native's URL / URLSearchParams lack setters and parts of the parser.
  const next =
    `${BROWSER_LOGIN_PATH}?state=${encodeURIComponent(state)}&name=${encodeURIComponent(keyName)}` +
    (seal ? `&seal=${encodeURIComponent(seal)}` : '');
  return `${providerUrl}${providerUrl.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`;
}

export type BrowserLoginResult =
  { key: string } | { sealed: string } | { error: 'signed-out' | 'no-key' | 'network' | 'invalid' };

function queryParams(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const part of query.split('&')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    try {
      params.set(decodeURIComponent(part.slice(0, i)), decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' ')));
    } catch {
      // Malformed escape: ignore the pair.
    }
  }
  return params;
}

/**
 * Reads `unterwegs://login?state=…&key=…` (or `sealed=…` when the app sent a `seal`); anything with the wrong state
 * is rejected, and so is a plain key when a sealed one was asked for.
 */
export function parseBrowserLoginResult(url: string, state: string, sealed = false): BrowserLoginResult {
  if (!url.startsWith(`${BROWSER_LOGIN_CALLBACK}?`)) return { error: 'invalid' };
  const params = queryParams(url.slice(BROWSER_LOGIN_CALLBACK.length + 1).split('#')[0]);
  if (!state || params.get('state') !== state) return { error: 'invalid' };
  const box = params.get('sealed');
  if (sealed && box) return /^[A-Za-z0-9_-]+$/.test(box) ? { sealed: box } : { error: 'invalid' };
  const key = params.get('key');
  if (key) return sealed ? { error: 'invalid' } : { key };
  const error = params.get('error');
  return { error: error === 'signed-out' || error === 'no-key' || error === 'network' ? error : 'invalid' };
}
