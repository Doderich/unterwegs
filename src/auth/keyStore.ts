import * as SecureStore from 'expo-secure-store';

import { normalizeServerUrl, type Credentials } from '@/api/client';

const KEY = 'unterwegs.credentials.v1';

/** iOS: readable once the phone is unlocked, never restored from a backup onto another device. */
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** Preset on the login screen; set per build in `.env.local` (`EXPO_PUBLIC_DEFAULT_SERVER_URL`). Empty: the user types it. */
export const DEFAULT_SERVER_URL = normalizeServerUrl(process.env.EXPO_PUBLIC_DEFAULT_SERVER_URL ?? '');

export async function loadCredentials(): Promise<Credentials | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Credentials>;
    if (!value.serverUrl || !value.apiKey) return null;
    // Keys saved before 1.4.1 used the default class, which backups can carry to a new phone. Re-saving updates
    // the class; awaited so a sign-out right after can't be overtaken by this write.
    await SecureStore.setItemAsync(KEY, raw, OPTIONS).catch(() => undefined);
    return { serverUrl: value.serverUrl, apiKey: value.apiKey };
  } catch {
    return null;
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  await SecureStore.setItemAsync(
    KEY,
    JSON.stringify({ serverUrl: normalizeServerUrl(creds.serverUrl), apiKey: creds.apiKey.trim() }),
    OPTIONS,
  );
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY, OPTIONS);
}
