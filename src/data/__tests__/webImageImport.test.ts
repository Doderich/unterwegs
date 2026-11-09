import { ApiError, type ApiClient } from '@/api/client';

import { downloadPublicImage, importWebImage } from '../webImageImport';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.6.0' } } }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    bytes: Uint8Array | null = null;
    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}/${name}`;
    }
    create() {}
    write(bytes: Uint8Array) {
      this.bytes = bytes;
    }
  }
  return { File, Paths: { cache: { uri: 'file:///cache' } } };
});

const image = { id: 'img1', image: 'https://al.example.org/media/images/a.jpg', is_primary: false };

function fakeClient(importResult: () => Promise<unknown>) {
  const uploads: unknown[] = [];
  const client = {
    edit: {
      importImages: jest.fn(importResult),
      uploadImage: jest.fn(async (...args: unknown[]) => {
        uploads.push(args);
        return image;
      }),
    },
  } as unknown as ApiClient;
  return { client, uploads };
}

const pngFetch = (async (_url: string, init?: RequestInit) =>
  new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { 'content-type': 'image/png', 'x-ua': String((init?.headers as Record<string, string>)['User-Agent']) },
  })) as unknown as typeof fetch;

const prepare = jest.fn(async (uri: string) => ({ uri, name: 'photo.jpg', type: 'image/jpeg' }));

it('lets the server download the image when it can', async () => {
  const { client } = fakeClient(async () => ({ created: [image], created_count: 1, requested_count: 1 }));
  const result = await importWebImage(client, 'location', 'l1', 'https://upload.example.org/a.jpg', 'wikipedia', {
    prepare,
    fetchImpl: pngFetch,
  });
  expect(result.created_count).toBe(1);
  expect(client.edit.uploadImage).not.toHaveBeenCalled();
});

it('downloads on the phone and uploads it when the server could not import it', async () => {
  const { client, uploads } = fakeClient(async () => {
    throw new ApiError('No images could be imported', 400, '/api/images/import_from_urls');
  });
  const result = await importWebImage(client, 'lodging', 'h1', 'https://upload.example.org/a.png', 'wikipedia', {
    prepare,
    fetchImpl: pngFetch,
  });
  expect(result).toEqual({ created: [image], created_count: 1, requested_count: 1 });
  expect(prepare).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/\/cache\/web-image-\d+\.png$/));
  expect(uploads[0]).toEqual(['lodging', 'h1', expect.objectContaining({ type: 'image/jpeg' })]);
});

it('keeps the server error when the phone cannot download it either', async () => {
  const refused = new ApiError('No images could be imported', 400, '/api/images/import_from_urls');
  const { client } = fakeClient(async () => {
    throw refused;
  });
  const htmlFetch = (async () =>
    new Response('<html/>', { status: 200, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
  await expect(
    importWebImage(client, 'location', 'l1', 'https://example.org/page', 'url', { prepare, fetchImpl: htmlFetch }),
  ).rejects.toBe(refused);
});

it('does not fall back for other failures', async () => {
  const forbidden = new ApiError('forbidden', 403, '/api/images/import_from_urls');
  const { client } = fakeClient(async () => {
    throw forbidden;
  });
  await expect(
    importWebImage(client, 'location', 'l1', 'https://example.org/a.jpg', 'url', { prepare, fetchImpl: pngFetch }),
  ).rejects.toBe(forbidden);
  expect(client.edit.uploadImage).not.toHaveBeenCalled();
});

it('sends a User-Agent and never the API key for the public download', async () => {
  let sent: Record<string, string> = {};
  const spy = (async (_url: string, init?: RequestInit) => {
    sent = init?.headers as Record<string, string>;
    return new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  }) as unknown as typeof fetch;
  await downloadPublicImage('https://upload.example.org/a.jpg', spy);
  expect(sent['User-Agent']).toBe('Unterwegs/1.6.0');
  expect(Object.keys(sent).map((k) => k.toLowerCase())).not.toContain('x-api-key');
});
