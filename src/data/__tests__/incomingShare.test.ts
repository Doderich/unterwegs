import type { ResolvedSharePayload } from 'expo-sharing';

import { sharedFiles, sharedUrl, uploadSharedFiles } from '../incomingShare';

const pdf: ResolvedSharePayload = {
  value: 'content://provider/booking',
  shareType: 'file',
  mimeType: 'application/pdf',
  contentUri: 'file:///cache/booking.pdf',
  contentType: 'file',
  contentMimeType: 'application/pdf',
  originalName: 'booking.pdf',
  contentSize: 123,
};

it('reads a shared link and drops an Instagram tracking query', () => {
  const reel = 'https://www.instagram.com/reel/AbCd/?cplk=abc';
  expect(
    sharedUrl([
      {
        value: `Look ${reel}`,
        shareType: 'text',
        mimeType: 'text/plain',
        contentUri: null,
        contentType: 'text',
        contentMimeType: 'text/plain',
        originalName: null,
        contentSize: null,
      },
    ]),
  ).toBe('https://www.instagram.com/reel/AbCd/');
  expect(
    sharedUrl([
      {
        value: 'https://example.org/cafe?ref=1',
        shareType: 'url',
        mimeType: 'text/plain',
        contentUri: 'https://example.org/cafe?ref=1',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: null,
        contentSize: null,
      },
    ]),
  ).toBe('https://example.org/cafe?ref=1');
  expect(
    sharedUrl([
      {
        value: 'https://www.youtube.com/watch?v=AbCdEf&si=xyz',
        shareType: 'url',
        mimeType: 'text/plain',
        contentUri: 'https://www.youtube.com/watch?v=AbCdEf&si=xyz',
        contentType: 'website',
        contentMimeType: 'text/html',
        originalName: null,
        contentSize: null,
      },
    ]),
  ).toBe('https://www.youtube.com/watch?v=AbCdEf');
  expect(
    sharedUrl([
      {
        value: 'https://youtu.be/AbCdEf?si=xyz',
        shareType: 'url',
        mimeType: 'text/plain',
        contentUri: null,
        contentType: 'text',
        contentMimeType: 'text/plain',
        originalName: null,
        contentSize: null,
      },
    ]),
  ).toBe('https://youtu.be/AbCdEf');
});

it('accepts a local PDF, preserves its name and rejects text and remote links', () => {
  expect(sharedFiles([pdf])[0].file).toEqual({ uri: pdf.contentUri, name: 'booking.pdf', type: 'application/pdf' });
  expect(sharedFiles([{ ...pdf, contentUri: 'https://example.org/booking.pdf' }])).toEqual([]);
  expect(sharedFiles([{ ...pdf, contentType: 'text', contentUri: null }])).toEqual([]);
});

it('keeps confirmed uploads out of a retry after a partial failure', async () => {
  const files = sharedFiles([pdf, { ...pdf, contentUri: 'file:///cache/other.pdf' }]);
  const completed = new Set<string>();
  const first = jest.fn().mockResolvedValueOnce({ id: 'saved' }).mockResolvedValueOnce(null);
  expect(await uploadSharedFiles(files, completed, first)).toBe(false);
  expect(completed.size).toBe(1);
  const retry = jest.fn().mockResolvedValue({ id: 'saved-second' });
  expect(await uploadSharedFiles(files, completed, retry)).toBe(true);
  expect(retry).toHaveBeenCalledTimes(1);
  expect(retry).toHaveBeenCalledWith(files[1]);
});

it('keeps earlier successes when preparing a later photo throws', async () => {
  const files = sharedFiles([
    pdf,
    { ...pdf, contentUri: 'file:///cache/photo.jpg', contentType: 'image', contentMimeType: 'image/jpeg' },
  ]);
  const completed = new Set<string>();
  const upload = jest.fn().mockResolvedValueOnce({ id: 'saved' }).mockRejectedValueOnce(new Error('unreadable photo'));
  await expect(uploadSharedFiles(files, completed, upload)).rejects.toThrow('unreadable photo');
  expect([...completed]).toEqual([files[0].key]);
});
