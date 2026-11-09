import { downloadToFile } from '@/api/http';
import { download } from '../fileCache';

jest.mock('@/api/http', () => ({ downloadToFile: jest.fn() }));
jest.mock('@/api/client', () => ({ mediaRequest: (url: string) => ({ url, headers: {} }) }));
jest.mock('expo-file-system', () => {
  class Directory {
    uri = 'file:///docs/media';
    exists = false;
    create() {}
  }
  class File {
    exists = false;
    size = 0;
    uri = 'file:///docs/media/file.pdf';
  }
  return { File, Directory, Paths: { document: { uri: 'file:///docs' } } };
});

const transfer = jest.mocked(downloadToFile);
const credentials = { serverUrl: 'https://al.example.org', apiKey: 'example-key' };

beforeEach(() => transfer.mockReset());

it('joins simultaneous readiness/collection downloads instead of writing the same file twice', async () => {
  let finish = () => {};
  transfer.mockImplementation(
    (_url, _headers, target) =>
      new Promise((resolve) => {
        finish = () => resolve(target);
      }),
  );
  const first = download('https://al.example.org/media/ticket.pdf', credentials);
  const second = download('https://al.example.org/media/ticket.pdf', credentials);
  expect(first).toBe(second);
  finish();
  await expect(first).resolves.toBeDefined();
  await expect(second).resolves.toBeDefined();
  expect(transfer).toHaveBeenCalledTimes(1);
});

it('allows retry after a failed shared download', async () => {
  transfer.mockRejectedValueOnce(new Error('offline'));
  await expect(download('https://al.example.org/media/retry.pdf', credentials)).rejects.toThrow('offline');
  transfer.mockImplementationOnce(async (_url, _headers, target) => target);
  await expect(download('https://al.example.org/media/retry.pdf', credentials)).resolves.toBeDefined();
  expect(transfer).toHaveBeenCalledTimes(2);
});
