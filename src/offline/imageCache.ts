import { Directory, File, Paths } from 'expo-file-system';

import { downloadToFile } from '@/api/http';

import { cacheName, hostFolder } from './fileCache';

/**
 * Images that need the API key, loaded by the app instead of by `expo-image`. `expo-image` keeps custom headers on a
 * redirect to another host, which would hand the key to whatever a server's `/media` redirects to (object storage, a
 * CDN). `downloadToFile` goes through `keyedFetch`, which drops the key when a redirect leaves the server.
 * The files live in the cache directory, which the OS may empty; the offline copy of a collection stays in
 * `fileCache` (documents). Signing out clears both.
 */
const ROOT = new Directory(Paths.cache, 'keyed-images');
/** Downloads at a time: a photo grid shouldn't start fifty at once. */
const PARALLEL = 4;

const inflight = new Map<string, Promise<string>>();
const waiting: (() => void)[] = [];
let running = 0;

function fileFor(url: string): File {
  return new File(new Directory(ROOT, hostFolder(url)), cacheName(url));
}

/** The downloaded image for `url`, or null. */
export function cachedImageUri(url: string): string | null {
  try {
    const file = fileFor(url);
    return file.exists && (file.size ?? 0) > 0 ? file.uri : null;
  } catch {
    return null;
  }
}

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/** Downloads `url` with `headers` once (concurrent callers share the download) and resolves to its file URI. */
export function loadKeyedImage(url: string, headers: Record<string, string>): Promise<string> {
  const hit = cachedImageUri(url);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(url);
  if (pending) return pending;
  const download = slot(async () => {
    const target = fileFor(url);
    return (await downloadToFile(url, headers, target)).uri;
  }).finally(() => inflight.delete(url));
  inflight.set(url, download);
  return download;
}

export function clearKeyedImages(): void {
  if (ROOT.exists) ROOT.delete();
}
