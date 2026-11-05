import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { tr } from '@/i18n';

import {
  BROWSER_LOGIN_CALLBACK,
  browserLoginUrl,
  type BrowserLoginMode,
  deviceKeyName,
  LoginError,
  parseBrowserLoginResult,
} from './serverLogin';

const toBase64Url = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (b64url: string) => {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return b64 + '='.repeat((4 - (b64.length % 4)) % 4);
};
const ascii = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

/**
 * Opens the page's `sealed` result: AES-256-GCM, `iv (12) | ciphertext | tag (16)`, the state as additional data.
 * Only this app instance has the key, so an app that catches the `unterwegs://` callback gets nothing usable.
 */
async function unseal(sealed: string, key: Crypto.AESEncryptionKey, state: string): Promise<string | null> {
  try {
    const box = Crypto.AESSealedData.fromCombined(fromBase64Url(sealed));
    const bytes = await Crypto.aesDecryptAsync(box, key, { output: 'bytes', additionalData: ascii(state) });
    const text = String.fromCharCode(...bytes);
    return /^[\x21-\x7e]{8,512}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

/**
 * SSO in the system browser sheet (ASWebAuthenticationSession / Custom Tabs), so passkeys and the
 * browser's password autofill work. Needs `server/unterwegs-login.html` on the server.
 * Resolves with the new API key, or null when the user closed the sheet.
 */
export async function signInWithBrowser(
  providerUrl: string,
  mode: Exclude<BrowserLoginMode, false>,
): Promise<string | null> {
  const state = Crypto.randomUUID().replace(/-/g, '');
  const sealKey = mode === 'sealed' ? await Crypto.AESEncryptionKey.generate() /* AES-256 */ : null;
  const seal = sealKey ? toBase64Url(await sealKey.encoded('base64')) : undefined;
  const result = await WebBrowser.openAuthSessionAsync(
    browserLoginUrl(providerUrl, state, deviceKeyName(), seal),
    BROWSER_LOGIN_CALLBACK,
    // Private session: no AdventureLog or identity-provider cookies stay behind in Safari.
    { preferEphemeralSession: true },
  );
  if (result.type !== 'success') return null;
  const parsed = parseBrowserLoginResult(result.url, state, !!sealKey);
  if ('key' in parsed) return parsed.key;
  if ('sealed' in parsed) {
    const key = sealKey && (await unseal(parsed.sealed, sealKey, state));
    if (key) return key;
    throw new LoginError(tr('browserLogin.responseDoesntMatchSigninPlease'));
  }
  switch (parsed.error) {
    case 'signed-out':
      throw new LoginError(tr('browserLogin.signinWasntCompletedPleaseTry'));
    case 'no-key':
      throw new LoginError(tr('common.signingInWorkedButServer'));
    case 'network':
      throw new LoginError(tr('common.cantReachServer'));
    default:
      throw new LoginError(tr('browserLogin.responseDoesntMatchSigninPlease'));
  }
}
