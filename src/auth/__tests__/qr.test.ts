import { parseLoginQr } from '../qr';

it('accepts the AdventureLog mobile QR payload', () => {
  const qr = JSON.stringify({
    version: 1,
    server_url: 'https://adventurelog.example.org',
    api_key: 'al_abc',
    code_words: ['hike', 'explore'],
  });
  expect(parseLoginQr(qr)).toEqual({ serverUrl: 'https://adventurelog.example.org', apiKey: 'al_abc' });
});

it.each([
  ['not json', 'hello'],
  ['other version', JSON.stringify({ version: 2, server_url: 'https://x', api_key: 'al_x' })],
  ['no key', JSON.stringify({ version: 1, server_url: 'https://x' })],
  ['wrong key format', JSON.stringify({ version: 1, server_url: 'https://x', api_key: 'xyz' })],
  ['bad url', JSON.stringify({ version: 1, server_url: 'ftp://x', api_key: 'al_x' })],
])('rejects %s', (_, data) => expect(parseLoginQr(data)).toBeNull());
