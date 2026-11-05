import Constants from 'expo-constants';
import {
  BROWSER_LOGIN_PATH,
  browserLoginUrl,
  confirmMfa,
  fetchLoginOptions,
  isBackOnWebsite,
  LoginError,
  parseBrowserLoginResult,
  passwordLogin,
  supportsBrowserLogin,
} from '../serverLogin';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { scheme: 'unterwegs' } } }));

const server = 'https://adventurelog.example.com';

type Call = { url: string; init?: RequestInit };

/** Fake fetch answering in order; records the calls. */
function fakeFetch(...responses: { status: number; body?: unknown }[]) {
  const calls: Call[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 204 };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('fetchLoginOptions', () => {
  it('lists providers and forbids passwords when SSO is enforced', async () => {
    const { impl, calls } = fakeFetch({
      status: 200,
      body: [{ name: 'Authentik', url: `${server}/accounts/oidc/authentik/login/`, usage_required: true }],
    });
    await expect(fetchLoginOptions(`${server}/`, impl)).resolves.toEqual({
      providers: [{ name: 'Authentik', url: `${server}/accounts/oidc/authentik/login/` }],
      passwordAllowed: false,
    });
    expect(calls[0].url).toBe(`${server}/auth/social-providers`);
  });

  it('allows passwords without enforced providers', async () => {
    const { impl } = fakeFetch({ status: 200, body: [] });
    await expect(fetchLoginOptions(server, impl)).resolves.toEqual({ providers: [], passwordAllowed: true });
  });

  it('rejects other servers', async () => {
    const { impl } = fakeFetch({ status: 200, body: { hello: 'world' } });
    await expect(fetchLoginOptions(server, impl)).rejects.toBeInstanceOf(LoginError);
  });
});

describe('passwordLogin', () => {
  it('creates a device key with the session and ends the session', async () => {
    const { impl, calls } = fakeFetch(
      { status: 200, body: { meta: { session_token: 'sess' } } },
      { status: 201, body: { key: 'al_new' } },
      { status: 401 },
    );
    await expect(passwordLogin(server, ' Alex ', 'pw', impl)).resolves.toEqual({ status: 'ok', apiKey: 'al_new' });
    expect(JSON.parse(calls[0].init!.body as string)).toEqual({ username: 'alex', password: 'pw' });
    expect(calls[1].url).toBe(`${server}/auth/api-keys`);
    expect((calls[1].init!.headers as Record<string, string>).Cookie).toBe('sessionid=sess');
    expect(calls[2]).toMatchObject({ url: `${server}/auth/app/v1/auth/session`, init: { method: 'DELETE' } });
  });

  it('asks for the TOTP code when MFA is pending, then finishes', async () => {
    const { impl, calls } = fakeFetch(
      {
        status: 401,
        body: { meta: { session_token: 'sess' }, data: { flows: [{ id: 'mfa_authenticate', is_pending: true }] } },
      },
      { status: 200, body: { meta: { session_token: 'sess2' } } },
      { status: 201, body: { key: 'al_mfa' } },
    );
    await expect(passwordLogin(server, 'alex', 'pw', impl)).resolves.toEqual({ status: 'mfa', sessionToken: 'sess' });
    await expect(confirmMfa(server, 'sess', '123 456', impl)).resolves.toBe('al_mfa');
    expect(JSON.parse(calls[1].init!.body as string)).toEqual({ code: '123456' });
    expect((calls[2].init!.headers as Record<string, string>).Cookie).toBe('sessionid=sess2');
  });

  it('explains a wrong password', async () => {
    const { impl } = fakeFetch({ status: 400, body: { errors: [{ code: 'username_password_mismatch' }] } });
    await expect(passwordLogin(server, 'alex', 'nope', impl)).rejects.toThrow('Benutzername oder Passwort falsch.');
  });
});

describe('isBackOnWebsite', () => {
  it('is true on app pages of the server only', () => {
    expect(isBackOnWebsite(`${server}/`, server)).toBe(true);
    expect(isBackOnWebsite(`${server}/dashboard`, server)).toBe(true);
    expect(isBackOnWebsite(`${server}/login`, server)).toBe(false);
    expect(isBackOnWebsite(`${server}/accounts/oidc/authentik/login/callback/?code=1`, server)).toBe(false);
    expect(isBackOnWebsite('https://auth.example.com/application/o/authorize/', server)).toBe(false);
    expect(isBackOnWebsite(`${server}.evil.com/`, server)).toBe(false);
  });
});

describe('browser-sheet login', () => {
  const provider = `${server}/accounts/oidc/authentik/login/`;

  it('sends allauth on to the login page with state and key name', () => {
    const url = browserLoginUrl(provider, 'abc123', 'Unterwegs · iPhone');
    expect(url.startsWith(`${provider}?next=`)).toBe(true);
    expect(decodeURIComponent(url.split('next=')[1])).toBe(
      `${BROWSER_LOGIN_PATH}?state=abc123&name=Unterwegs%20%C2%B7%20iPhone`,
    );
  });

  it('accepts the key only with the matching state', () => {
    expect(parseBrowserLoginResult('unterwegs://login?key=al_x&state=s1', 's1')).toEqual({ key: 'al_x' });
    expect(parseBrowserLoginResult('unterwegs://login?key=al_x&state=other', 's1')).toEqual({ error: 'invalid' });
    expect(parseBrowserLoginResult('unterwegs://login?key=al_x', 's1')).toEqual({ error: 'invalid' });
    expect(parseBrowserLoginResult('evil://login?key=al_x&state=s1', 's1')).toEqual({ error: 'invalid' });
  });

  it('reports errors from the page', () => {
    expect(parseBrowserLoginResult('unterwegs://login?error=signed-out&state=s1', 's1')).toEqual({
      error: 'signed-out',
    });
    expect(parseBrowserLoginResult('unterwegs://login?error=weird&state=s1', 's1')).toEqual({ error: 'invalid' });
  });

  it('keeps staging away from the production browser callback', async () => {
    const original = Constants.expoConfig;
    Object.defineProperty(Constants, 'expoConfig', { configurable: true, value: { scheme: 'unterwegs-staging' } });
    const request = jest.fn();
    try {
      await expect(supportsBrowserLogin(server, request)).resolves.toBe(false);
      expect(request).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Constants, 'expoConfig', { configurable: true, value: original });
    }
  });

  it('detects the page by its marker', async () => {
    const page = (body: string, status = 200) =>
      (async () => new Response(body, { status })) as unknown as typeof fetch;
    const v1 = '<!-- unterwegs-login-v1 -->';
    const v2 = '<!-- unterwegs-login-v1 unterwegs-login-v2 -->';
    await expect(supportsBrowserLogin(server, page(v2), 'android')).resolves.toBe('sealed');
    await expect(supportsBrowserLogin(server, page(v2), 'ios')).resolves.toBe('sealed');
    await expect(supportsBrowserLogin(server, page(v1), 'ios')).resolves.toBe('plain');
    await expect(supportsBrowserLogin(server, page('<html>SvelteKit</html>'))).resolves.toBe(false);
    await expect(supportsBrowserLogin(server, page('', 404))).resolves.toBe(false);
  });

  it('never takes a plain key from the callback on Android', async () => {
    const page = (async () => new Response('<!-- unterwegs-login-v1 -->')) as unknown as typeof fetch;
    // Another app can register `unterwegs://` there: v1 pages go through the WebView instead.
    await expect(supportsBrowserLogin(server, page, 'android')).resolves.toBe(false);
  });

  it('asks the page to seal the key and accepts only a sealed answer then', () => {
    const url = browserLoginUrl(provider, 'abc123', 'Unterwegs', 'k_ey-1');
    expect(decodeURIComponent(url.split('next=')[1])).toBe(
      `${BROWSER_LOGIN_PATH}?state=abc123&name=Unterwegs&seal=k_ey-1`,
    );
    expect(parseBrowserLoginResult('unterwegs://login?sealed=Ab-_9&state=s1', 's1', true)).toEqual({ sealed: 'Ab-_9' });
    expect(parseBrowserLoginResult('unterwegs://login?key=al_x&state=s1', 's1', true)).toEqual({ error: 'invalid' });
    expect(parseBrowserLoginResult('unterwegs://login?sealed=a%2Bb&state=s1', 's1', true)).toEqual({
      error: 'invalid',
    });
    expect(parseBrowserLoginResult('unterwegs://login?sealed=Ab&state=other', 's1', true)).toEqual({
      error: 'invalid',
    });
  });
});
