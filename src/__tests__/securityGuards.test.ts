import { execSync } from 'child_process';

import { mediaRequest } from '../api/client';
import { redirectSystemPath } from '../app/+native-intent';
import { parseLoginQr, qrHost } from '../auth/qr';
import { cacheName, hostFolder } from '../offline/fileCache';
import { isWebLink } from '../ui/links';

const creds = { serverUrl: 'https://adventurelog.example.org', apiKey: 'al_test' };

describe('mediaRequest', () => {
  it('sends the key to the signed-in server', () => {
    expect(mediaRequest('https://adventurelog.example.org/media/images/a.webp', creds)).toEqual({
      url: 'https://adventurelog.example.org/media/images/a.webp',
      headers: { 'X-API-Key': 'al_test' },
    });
  });

  it('loads server paths from another public URL through the signed-in server', () => {
    expect(mediaRequest('http://backend.example.org:8000/media/attachments/x.pdf', creds)).toEqual({
      url: 'https://adventurelog.example.org/media/attachments/x.pdf',
      headers: { 'X-API-Key': 'al_test' },
    });
  });

  it('never sends the key elsewhere', () => {
    expect(mediaRequest('https://images.example.net/photo.jpg', creds)).toEqual({
      url: 'https://images.example.net/photo.jpg',
    });
    expect(mediaRequest('https://adventurelog.example.org.example.net/media/a.webp', creds).headers).toBeDefined();
    expect(mediaRequest('https://adventurelog.example.org.example.net/media/a.webp', creds).url).toBe(
      'https://adventurelog.example.org/media/a.webp',
    );
  });

  it('never sends the key over plain HTTP', () => {
    const http = { serverUrl: 'http://adventurelog.example.org', apiKey: 'al_test' };
    expect(mediaRequest('http://adventurelog.example.org/media/a.webp', http).headers).toBeUndefined();
  });
});

describe('offline file cache', () => {
  it('keeps each server host in its own folder', () => {
    expect(hostFolder('https://adventurelog.example.org/media/a.pdf')).toBe('adventurelog.example.org');
    expect(hostFolder('https://other.example.org:8443/media/a.pdf')).toBe('other.example.org_8443');
    expect(cacheName('https://adventurelog.example.org/media/attachments/x/ticket.pdf')).toBe(
      'attachments_x_ticket.pdf',
    );
  });
});

describe('sign-in', () => {
  it('does not open the in-app sign-in page from outside links', () => {
    for (const path of [
      'unterwegs://login/web?url=https://evil.example.net&server=https://evil.example.net',
      'unterwegs-staging://login/web',
      'unterwegs:///login/web?url=x',
      '/login/web?url=x',
    ]) {
      expect(redirectSystemPath({ path, initial: false })).toBe('/login');
    }
  });

  it('accepts QR codes for HTTPS servers only and shows their host', () => {
    const qr = (server_url: string) => JSON.stringify({ version: 1, server_url, api_key: 'al_x' });
    expect(parseLoginQr(qr('http://adventurelog.example.org'))).toBeNull();
    const parsed = parseLoginQr(qr('https://adventurelog.example.org/'));
    expect(parsed && qrHost(parsed)).toBe('adventurelog.example.org');
  });
});

it('opens only web links from server data', () => {
  expect(isWebLink('https://www.example.org/booking')).toBe(true);
  expect(isWebLink('http://example.org')).toBe(true);
  for (const url of ['tel:+4912345', 'intent://x#Intent;end', 'javascript:alert(1)', 'otherapp://open', 'https://']) {
    expect(isWebLink(url)).toBe(false);
  }
});

it('downloads keyed files only through the redirect-safe fetch', () => {
  // `File.downloadFileAsync` follows redirects to other hosts with the key; `downloadToFile` doesn't.
  const hits = execSync('grep -rln "downloadFileAsync(" src || true', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !f.includes('__tests__'));
  expect(hits).toEqual([]);
});
