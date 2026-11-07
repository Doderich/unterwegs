import { Directory, File, Paths } from 'expo-file-system';

import { locale } from '@/i18n';
import { mediaRequest, type Credentials } from '@/api/client';
import { downloadToFile } from '@/api/http';

/**
 * Offline copies of authenticated media (`/media/…` needs `X-API-Key`), one folder per server host so files of
 * two servers with the same path never mix. Files live in documentDirectory (not cache) so the OS doesn't evict
 * them while travelling. Signing out deletes them all (`clearFileCache`).
 */
const ROOT = new Directory(Paths.document, 'media');

/** Folder name for the URL's host: `https://adventurelog.example.org/media/…` → `adventurelog.example.org`. */
export function hostFolder(url: string): string {
  const host = /^https?:\/\/([^/?#]+)/i.exec(url)?.[1]?.toLowerCase() ?? 'server';
  return host.replace(/[^a-z0-9.-]+/g, '_');
}

function folderFor(url: string): Directory {
  return new Directory(ROOT, hostFolder(url));
}

function ensureFolder(url: string) {
  const folder = folderFor(url);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
}

/** Stable file name from the URL path: `/media/attachments/x/ticket.pdf` → `attachments_x_ticket.pdf`. */
export function cacheName(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  return decodeURIComponent(path.replace(/^\/media\//, ''))
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .slice(-180);
}

export function cachedFile(url: string): File {
  const file = new File(folderFor(url), cacheName(url));
  // Before 1.4.1 files lay directly in `media/`, for the one signed-in server: move them on first use.
  if (!file.exists) {
    const legacy = new File(ROOT, cacheName(url));
    if (legacy.exists) {
      try {
        ensureFolder(url);
        legacy.move(file);
      } catch {
        // Downloaded again with the next offline sync.
      }
    }
  }
  return file;
}

/** Local `file://` URI if the media is cached, else null. */
/**
 * A media reference that is already a file on this phone: a photo or file added offline that waits in the outbox
 * (ADR 0016). It is its own local copy and is never downloaded.
 */
export const isLocalFile = (url: string): boolean => url.startsWith('file://');

/** The file on this phone for a media URL (downloaded copy, or the file itself while it waits to upload), or null. */
export function localUri(url: string): string | null {
  if (isLocalFile(url)) return url;
  const file = cachedFile(url);
  return file.exists && (file.size ?? 0) > 0 ? file.uri : null;
}

export async function download(url: string, credentials: Credentials): Promise<File> {
  if (isLocalFile(url)) return new File(url);
  const target = cachedFile(url);
  if (target.exists && (target.size ?? 0) > 0) return target;
  ensureFolder(url);
  const request = mediaRequest(url, credentials);
  try {
    return await downloadToFile(request.url, request.headers, target);
  } catch (error) {
    if (!request.fallback) throw error;
    return downloadToFile(request.fallback.url, request.fallback.headers, target);
  }
}

export type PrefetchProgress = { done: number; total: number; failed: number };

/** Downloads everything missing; 3 at a time. Never throws for single files. */
export async function prefetchAll(
  urls: string[],
  credentials: Credentials,
  onProgress?: (p: PrefetchProgress) => void,
): Promise<PrefetchProgress> {
  const missing = urls.filter((u) => !localUri(u));
  const progress = { done: urls.length - missing.length, total: urls.length, failed: 0 };
  onProgress?.({ ...progress });
  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const url = missing[next++];
      try {
        await download(url, credentials);
      } catch {
        progress.failed++;
      }
      progress.done++;
      onProgress?.({ ...progress });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return progress;
}

export function cachedCount(urls: string[]): number {
  return urls.filter((u) => localUri(u)).length;
}

export function cacheSizeBytes(): number {
  const size = (dir: Directory): number =>
    dir.list().reduce((n, f) => n + (f instanceof File ? (f.size ?? 0) : size(f)), 0);
  return ROOT.exists ? size(ROOT) : 0;
}

export function clearFileCache(): void {
  if (ROOT.exists) ROOT.delete();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString(locale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
}

/**
 * Puts a just-uploaded local file into the offline cache under the server URL it got, so new media works offline
 * without downloading it again. Best effort: a failure only means it is downloaded later.
 */
export function seedCache(url: string, localUri: string): void {
  try {
    const target = cachedFile(url);
    if (target.exists) return;
    ensureFolder(url);
    new File(localUri).copySync(target);
  } catch {
    // Downloaded with the next offline sync instead.
  }
}
