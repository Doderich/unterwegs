import {
  activateTotp,
  addEmail,
  changePassword,
  confirmUnlock,
  lock,
  makePrimaryEmail,
  newRecoveryCodes,
  SecurityError,
  startTotp,
  totpLink,
  twoFactorState,
  unlock,
} from '../accountSecurity';

const server = 'https://adventurelog.example.com';
const session = { base: server, token: 'sess-1' };

type Call = { url: string; init?: RequestInit };

/** Fake fetch answering in order; records the calls. */
function fakeFetch(...responses: { status: number; body?: unknown }[]) {
  const calls: Call[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 200, body: {} };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const headers = (c: Call) => c.init?.headers as Record<string, string>;
const sent = (c: Call) => JSON.parse(c.init?.body as string);

describe('unlock', () => {
  it('signs in through the allauth app API and keeps only the session token', async () => {
    const { impl, calls } = fakeFetch({ status: 200, body: { meta: { session_token: 'sess-1' } } });
    await expect(unlock(`${server}/`, 'Ada', 'secret', impl)).resolves.toEqual({ status: 'ok', session });
    expect(calls[0].url).toBe(`${server}/auth/app/v1/auth/login`);
    expect(sent(calls[0])).toEqual({ username: 'ada', password: 'secret' });
    // Never with the API key or a cookie: this is a session of its own.
    expect(headers(calls[0])['X-API-Key']).toBeUndefined();
  });

  it('asks for the code when two-factor sign-in is on', async () => {
    const { impl, calls } = fakeFetch(
      {
        status: 401,
        body: { meta: { session_token: 'pending' }, data: { flows: [{ id: 'mfa_authenticate', is_pending: true }] } },
      },
      { status: 200, body: { meta: { session_token: 'sess-2' } } },
    );
    const result = await unlock(server, 'ada', 'secret', impl);
    expect(result).toEqual({ status: 'mfa', pending: { base: server, token: 'pending' } });
    if (result.status !== 'mfa') return;
    await expect(confirmUnlock(result.pending, '123 456', impl)).resolves.toEqual({ base: server, token: 'sess-2' });
    expect(calls[1].url).toBe(`${server}/auth/app/v1/auth/2fa/authenticate`);
    expect(headers(calls[1])['X-Session-Token']).toBe('pending');
    expect(sent(calls[1])).toEqual({ code: '123456' });
  });

  it('names a wrong password', async () => {
    const { impl } = fakeFetch({ status: 400, body: { errors: [{ code: 'username_password_mismatch' }] } });
    await expect(unlock(server, 'ada', 'nope', impl)).rejects.toBeInstanceOf(SecurityError);
  });
});

describe('with a session', () => {
  it('changes the password with the current one', async () => {
    const { impl, calls } = fakeFetch({ status: 200, body: {} });
    await changePassword(session, 'old-password', 'new-password-123', impl);
    expect(calls[0].url).toBe(`${server}/auth/app/v1/account/password/change`);
    expect(calls[0].init?.method).toBe('POST');
    expect(headers(calls[0])['X-Session-Token']).toBe('sess-1');
    expect(sent(calls[0])).toEqual({ current_password: 'old-password', new_password: 'new-password-123' });
  });

  it('shows the server message when a new password is refused', async () => {
    const { impl } = fakeFetch({ status: 400, body: { errors: [{ message: 'This password is too short.' }] } });
    await expect(changePassword(session, 'a', 'b', impl)).rejects.toThrow('This password is too short.');
  });

  it('reports an ended session so the screen can ask again', async () => {
    const { impl } = fakeFetch({ status: 401, body: { data: { flows: [{ id: 'reauthenticate' }] } } });
    await expect(changePassword(session, 'a', 'b', impl)).rejects.toMatchObject({ expired: true });
  });

  it('adds and promotes email addresses, returning the new list', async () => {
    const list = [
      { email: 'ada@example.org', primary: true, verified: true },
      { email: 'ada.l@example.org', primary: false, verified: false },
    ];
    const { impl, calls } = fakeFetch({ status: 200, body: { data: list } }, { status: 200, body: { data: list } });
    await expect(addEmail(session, ' ada.l@example.org ', impl)).resolves.toEqual(list);
    expect(sent(calls[0])).toEqual({ email: 'ada.l@example.org' });
    await makePrimaryEmail(session, 'ada.l@example.org', impl);
    expect(calls[1].init?.method).toBe('PATCH');
    expect(sent(calls[1])).toEqual({ email: 'ada.l@example.org', primary: true });
  });

  it('reads the two-factor state from the authenticator list', async () => {
    const { impl } = fakeFetch({
      status: 200,
      body: { data: [{ type: 'totp' }, { type: 'recovery_codes', unused_code_count: 7, total_code_count: 10 }] },
    });
    await expect(twoFactorState(session, impl)).resolves.toEqual({ totp: true, recoveryCodesLeft: 7 });
  });

  it('sets up an authenticator from the secret of the 404 answer, in the same session', async () => {
    const { impl, calls } = fakeFetch(
      { status: 404, body: { meta: { secret: 'JBSWY3DPEHPK3PXP' } } },
      { status: 200, body: { data: { type: 'totp' } } },
    );
    await expect(startTotp(session, impl)).resolves.toBe('JBSWY3DPEHPK3PXP');
    await activateTotp(session, '123 456', impl);
    expect(headers(calls[1])['X-Session-Token']).toBe('sess-1');
    expect(sent(calls[1])).toEqual({ code: '123456' });
  });

  it('returns fresh recovery codes', async () => {
    const { impl } = fakeFetch({ status: 200, body: { data: { type: 'recovery_codes', unused_codes: ['a1', 'b2'] } } });
    await expect(newRecoveryCodes(session, impl)).resolves.toEqual(['a1', 'b2']);
  });

  it('ends the session', async () => {
    const { impl, calls } = fakeFetch({ status: 401 });
    await lock(session, impl);
    expect(calls[0].url).toBe(`${server}/auth/app/v1/auth/session`);
    expect(calls[0].init?.method).toBe('DELETE');
  });
});

it('builds an otpauth link authenticator apps open', () => {
  expect(totpLink('JBSWY3DPEHPK3PXP', 'ada', 'AdventureLog')).toBe(
    'otpauth://totp/AdventureLog%3Aada?secret=JBSWY3DPEHPK3PXP&issuer=AdventureLog',
  );
});
