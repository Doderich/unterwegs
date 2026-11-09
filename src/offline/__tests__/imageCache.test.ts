import { downloadToFile } from '@/api/http';

import { loadKeyedImage } from '../imageCache';

const mockFiles = new Set<string>();

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      const base = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${base}/${name}` : base;
    }
    get exists() {
      return false;
    }
    delete() {}
  }
  class File {
    uri: string;
    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return mockFiles.has(this.uri) ? 1 : 0;
    }
  }
  return { Directory, File, Paths: { cache: { uri: 'file:///cache' }, document: { uri: 'file:///docs' } } };
});

jest.mock('@/api/http', () => ({ downloadToFile: jest.fn() }));

const download = downloadToFile as jest.MockedFunction<typeof downloadToFile>;
const key = { 'X-API-Key': 'k' };

beforeEach(() => {
  mockFiles.clear();
  download.mockReset();
});

it('downloads through the keyed download once and shares it between callers', async () => {
  let finish: () => void = () => undefined;
  download.mockImplementation(
    (_url, _headers, target) =>
      new Promise((resolve) => {
        finish = () => {
          mockFiles.add((target as unknown as { uri: string }).uri);
          resolve(target);
        };
      }),
  );
  const url = 'https://al.example.org/media/images/kyoto.jpg';
  const a = loadKeyedImage(url, key);
  const b = loadKeyedImage(url, key);
  await Promise.resolve();
  finish();
  await expect(a).resolves.toBe('file:///cache/keyed-images/al.example.org/images_kyoto.jpg');
  await expect(b).resolves.toBe('file:///cache/keyed-images/al.example.org/images_kyoto.jpg');
  expect(download).toHaveBeenCalledTimes(1);
  expect(download.mock.calls[0][1]).toEqual(key);
  // Later views read the file without asking the server.
  await loadKeyedImage(url, key);
  expect(download).toHaveBeenCalledTimes(1);
});

it('runs at most four downloads at a time', async () => {
  let active = 0;
  let peak = 0;
  download.mockImplementation(async (_url, _headers, target) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 1));
    active--;
    return target;
  });
  await Promise.all(
    Array.from({ length: 10 }, (_, i) => loadKeyedImage(`https://al.example.org/media/images/${i}.jpg`, key)),
  );
  expect(download).toHaveBeenCalledTimes(10);
  expect(peak).toBe(4);
});

it('lets a failed download be tried again', async () => {
  download.mockRejectedValueOnce(new Error('HTTP 500'));
  const url = 'https://al.example.org/media/images/fail.jpg';
  await expect(loadKeyedImage(url, key)).rejects.toThrow('HTTP 500');
  download.mockImplementationOnce(async (_u, _h, target) => target);
  await expect(loadKeyedImage(url, key)).resolves.toContain('images_fail.jpg');
});
