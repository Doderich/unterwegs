import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { normalizeServerUrl, type Credentials } from '@/api/client';

const KEY = 'unterwegs.credentials.v1';

/** iOS: readable once the phone is unlocked, never restored from a backup onto another device. */
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/**
 * A simulator debug build is signed without the keychain entitlement, so SecureStore throws and sign-in
 * looks like a dead server. Dev builds keep the key in the app sandbox instead. Release builds do not.
 */
const devFile = () => new File(Paths.document, 'unterwegs-credentials.dev.json');

function missingKeychainEntitlement(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const cause = e.cause instanceof Error ? e.cause.message : '';
  return /entitlement/i.test(`${e.message}\n${cause}`);
}

/** Preset on the login screen; set per build in `.env.local` (`EXPO_PUBLIC_DEFAULT_SERVER_URL`). Empty: the user types it. */
export const DEFAULT_SERVER_URL = normalizeServerUrl(process.env.EXPO_PUBLIC_DEFAULT_SERVER_URL ?? '');

function readDevFile(): string | null {
  const file = devFile();
  if (!file.exists) return null;
  return file.textSync();
}

function parseCredentials(raw: string | null): Credentials | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Credentials>;
    if (!value.serverUrl || !value.apiKey) return null;
    return { serverUrl: value.serverUrl, apiKey: value.apiKey };
  } catch {
    return null;
  }
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return __DEV__ ? parseCredentials(readDevFile()) : null;
    // Keys saved before 1.4.1 used the default class, which backups can carry to a new phone. Re-saving updates
    // the class; awaited so a sign-out right after can't be overtaken by this write.
    await SecureStore.setItemAsync(KEY, raw, OPTIONS).catch(() => undefined);
    return parseCredentials(raw);
  } catch (e) {
    if (__DEV__ && missingKeychainEntitlement(e)) return parseCredentials(readDevFile());
    throw e;
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  const raw = JSON.stringify({ serverUrl: normalizeServerUrl(creds.serverUrl), apiKey: creds.apiKey.trim() });
  try {
    await SecureStore.setItemAsync(KEY, raw, OPTIONS);
  } catch (e) {
    if (!__DEV__ || !missingKeychainEntitlement(e)) throw e;
    const file = devFile();
    if (!file.exists) file.create();
    await file.write(raw);
  }
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY, OPTIONS).catch((e: unknown) => {
    if (!__DEV__ || !missingKeychainEntitlement(e)) throw e;
  });
  if (__DEV__) {
    const file = devFile();
    if (file.exists) file.delete();
  }
}
