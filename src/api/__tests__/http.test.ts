import { createKeyedFetch, resolveLocation } from '../http';

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown; redirect?: string };

function fakeBase(routes: Record<string, { status: number; location?: string }>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body,
      redirect: init.redirect,
    });
    const route = routes[url] ?? { status: 200 };
    return new Response(route.status === 200 ? 'ok' : null, {
      status: route.status,
      headers: route.location ? { location: route.location } : {},
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const key = { 'X-API-Key': 'al_test', Accept: 'application/json' };

describe('resolveLocation', () => {
  it.each([
    ['https://cdn.example.org/a.jpg', 'https://al.example/media/a.jpg', 'https://cdn.example.org/a.jpg'],
    ['/media/b.jpg', 'https://al.example/media/a.jpg?x=1', 'https://al.example/media/b.jpg'],
    ['//cdn.example.org/c.jpg', 'https://al.example/media/a.jpg', 'https://cdn.example.org/c.jpg'],
    ['d.jpg', 'https://al.example/media/x/a.jpg', 'https://al.example/media/x/d.jpg'],
  ])('%s from %s', (location, from, expected) => expect(resolveLocation(location, from)).toBe(expected));

  it('rejects other schemes', () => {
    expect(resolveLocation('unterwegs://login?key=x', 'https://al.example/a')).toBeNull();
    expect(resolveLocation('javascript:alert(1)', 'https://al.example/a')).toBeNull();
  });
});

describe('createKeyedFetch', () => {
  it('keeps the key on a redirect within the server', async () => {
    const { impl, calls } = fakeBase({ 'https://al.example/api/a': { status: 308, location: '/api/b' } });
    const res = await createKeyedFetch(impl)('https://al.example/api/a', { headers: key });
    expect(res.status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual(['https://al.example/api/a', 'https://al.example/api/b']);
    expect(calls[1].headers['X-API-Key']).toBe('al_test');
    expect(calls.every((c) => c.redirect === 'manual')).toBe(true);
  });

  it('drops the key when a redirect leaves the server', async () => {
    const { impl, calls } = fakeBase({
      'https://al.example/media/a.jpg': { status: 302, location: 'https://cdn.example.org/a.jpg' },
    });
    await createKeyedFetch(impl)('https://al.example/media/a.jpg', { headers: key });
    expect(calls[1].url).toBe('https://cdn.example.org/a.jpg');
    expect(calls[1].headers).toEqual({ Accept: 'application/json' });
  });

  it('drops the key on a downgrade to http on the same host', async () => {
    const { impl, calls } = fakeBase({
      'https://al.example/api/a': { status: 301, location: 'http://al.example/api/a' },
    });
    await createKeyedFetch(impl)('https://al.example/api/a', { headers: key });
    expect(calls[1].headers['X-API-Key']).toBeUndefined();
  });

  it('never sends a body or session token to another host', async () => {
    const { impl, calls } = fakeBase({
      'https://al.example/auth/login': { status: 307, location: 'https://other.example.org/auth/login' },
    });
    const res = await createKeyedFetch(impl)('https://al.example/auth/login', {
      method: 'POST',
      headers: { 'X-Session-Token': 't' },
      body: '{"password":"x"}',
    });
    expect(res.status).toBe(307);
    expect(calls).toHaveLength(1);
  });

  it('turns a POST into a GET on 303 and drops the body', async () => {
    const { impl, calls } = fakeBase({ 'https://al.example/api/a': { status: 303, location: '/api/b' } });
    await createKeyedFetch(impl)('https://al.example/api/a', {
      method: 'POST',
      headers: { ...key, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(calls[1]).toMatchObject({ method: 'GET', body: undefined });
    expect(calls[1].headers['Content-Type']).toBeUndefined();
  });

  it('stops after five redirects', async () => {
    const { impl, calls } = fakeBase({ 'https://al.example/loop': { status: 302, location: '/loop' } });
    const res = await createKeyedFetch(impl)('https://al.example/loop', { headers: key });
    expect(res.status).toBe(302);
    expect(calls).toHaveLength(6);
  });

  it('passes redirect: manual through', async () => {
    const { impl, calls } = fakeBase({
      'https://al.example/cb': { status: 302, location: 'https://al.example/settings' },
    });
    const res = await createKeyedFetch(impl)('https://al.example/cb', { headers: key, redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(calls).toHaveLength(1);
  });
});
