import { integrationServerUrl, stravaAuthorizationUrl, stravaCallback } from '../connection';

const server = 'https://adventurelog.example.org';
const callback = server + '/api/integrations/strava/callback/';
const authorization =
  'https://www.strava.com/oauth/authorize?client_id=123&redirect_uri=' + encodeURIComponent(callback);

it('normalizes server addresses without embedded credentials or query secrets', () => {
  expect(integrationServerUrl(' https://photos.example.org/ ')).toBe('https://photos.example.org');
  expect(integrationServerUrl('http://example.org/immich/')).toBe('http://example.org/immich');
  expect(integrationServerUrl('https://owner:password@example.org')).toBeNull();
  expect(integrationServerUrl('https://example.org?api_key=secret')).toBeNull();
  expect(integrationServerUrl('file:///tmp/server')).toBeNull();
});

it('attaches state only to the expected provider and callback', () => {
  const url = new URL(stravaAuthorizationUrl(authorization, server, 'random-state'));
  expect(url.searchParams.get('state')).toBe('random-state');
  expect(() => stravaAuthorizationUrl(authorization.replace('www.strava.com', 'example.org'), server, 's')).toThrow();
  expect(() =>
    stravaAuthorizationUrl(
      authorization.replace(encodeURIComponent(callback), encodeURIComponent('https://other.example.org/callback')),
      server,
      's',
    ),
  ).toThrow();
});

it('accepts only a successful callback with matching origin, path and state', () => {
  expect(stravaCallback(callback + '?code=one-time-code&state=s', server, 's')).toEqual({ code: 'one-time-code' });
  expect(stravaCallback(callback + '?code=code&state=wrong', server, 's')).toEqual({ error: true });
  expect(stravaCallback(callback + '?error=access_denied&state=s', server, 's')).toEqual({ error: true });
  expect(
    stravaCallback('https://other.example.org/api/integrations/strava/callback?code=x&state=s', server, 's'),
  ).toBeNull();
  expect(stravaCallback(server + '/other?code=x&state=s', server, 's')).toBeNull();
});
