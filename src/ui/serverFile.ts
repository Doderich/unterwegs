import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert } from 'react-native';

import { authHeaders, normalizePath, normalizeServerUrl } from '@/api/client';
import { downloadToFile } from '@/api/http';
import { useCredentials } from '@/auth/session';
import { tr } from '@/i18n';

/** Downloaded exports; each new one replaces the previous ones, signing out removes them. */
const EXPORTS = new Directory(Paths.cache, 'exports');

export function clearExports(): void {
  if (EXPORTS.exists) EXPORTS.delete();
}

/**
 * Files the server makes on request (share images, the calendar export): downloaded fresh with the key into the
 * cache folder, never into the offline copy, then shared or opened. Online only. The previous export is kept until
 * the next one, because the receiving app may still be reading it after the share sheet closes.
 */
export function useServerFile() {
  const credentials = useCredentials();
  const [busy, setBusy] = useState<string | null>(null);

  const fetchFile = async (path: string, fileName: string): Promise<File> => {
    if (!credentials) throw new Error('signed out');
    clearExports();
    EXPORTS.create({ intermediates: true, idempotent: true });
    const target = new File(EXPORTS, fileName);
    return downloadToFile(
      normalizeServerUrl(credentials.serverUrl) + normalizePath(path),
      authHeaders(credentials.apiKey),
      target,
    );
  };

  const run = async (path: string, fileName: string, handle: (file: File) => Promise<void>) => {
    if (busy) return;
    setBusy(path);
    try {
      await handle(await fetchFile(path, fileName));
    } catch {
      Alert.alert(tr('common.notAvailable'), tr('common.cantReachServerPleaseTry'));
    } finally {
      setBusy(null);
    }
  };

  return {
    busy,
    /** Opens the share sheet (messengers, photos, …). */
    share: (path: string, fileName: string, mimeType: string, title: string) =>
      run(path, fileName, async (file) => {
        await Sharing.shareAsync(file.uri, {
          mimeType,
          dialogTitle: title,
          UTI: { 'image/png': 'public.png', 'application/zip': 'public.zip-archive' }[mimeType],
        });
      }),
    /** Opens the system viewer (Quick Look on iOS, an app on Android), else the share sheet. */
    open: (path: string, fileName: string, mimeType: string, title: string) =>
      run(path, fileName, async (file) => {
        try {
          await file.preview({ title });
        } catch {
          await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title });
        }
      }),
  };
}

/** A file name from a title: letters, digits and dashes only. */
export function safeFileName(title: string, ext: string): string {
  const base = title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${base || 'unterwegs'}.${ext}`;
}
