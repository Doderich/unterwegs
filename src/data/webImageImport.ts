import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';

import { ApiError, type ApiClient, type MediaOwnerKind, type UploadFile } from '@/api/client';
import { keyedFetch } from '@/api/http';

type Imported = Awaited<ReturnType<ApiClient['edit']['importImages']>>;

export type WebImageDeps = {
  /** Shrinks a downloaded photo like a picked one (`shrinkImageFile`). */
  prepare: (uri: string) => Promise<UploadFile>;
  fetchImpl?: typeof fetch;
};

/**
 * A photo from a public address (Wikipedia, a typed link). The server downloads it first (`import_from_urls`); when
 * it can't (400 "No images could be imported": Wikimedia refusing the server, an unreachable host, a timeout), the
 * phone downloads the image itself and uploads it like a picked photo. Resolves like the server import.
 */
export async function importWebImage(
  client: ApiClient,
  kind: MediaOwnerKind,
  objectId: string,
  url: string,
  source: 'wikipedia' | 'url',
  deps: WebImageDeps,
): Promise<Imported> {
  try {
    return await client.edit.importImages(kind, objectId, [url], source);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 400) throw e;
    const file = await downloadPublicImage(url, deps.fetchImpl ?? keyedFetch).catch(() => {
      throw e;
    });
    const image = await client.edit.uploadImage(kind, objectId, await deps.prepare(file.uri));
    return { created: [image], created_count: 1, requested_count: 1 };
  }
}

/** Never with the API key: the address is public. Only images, at most 25 MB. */
export async function downloadPublicImage(url: string, fetchImpl: typeof fetch): Promise<File> {
  if (!/^https?:\/\//i.test(url)) throw new Error('not a web address');
  const version = Constants.expoConfig?.version ?? '0';
  const res = await fetchImpl(url, { headers: { Accept: 'image/*', 'User-Agent': `Unterwegs/${version}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) throw new Error('bad size');
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const file = new File(Paths.cache, `web-image-${Date.now()}.${ext}`);
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}
