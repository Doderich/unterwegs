import { fetch as expoFetch } from 'expo/fetch';
import type { File } from 'expo-file-system';

const MAX_REDIRECTS = 5;
/** Headers that sign a request in; never sent to another origin. */
const CREDENTIAL_HEADERS = ['x-api-key', 'x-session-token', 'authorization', 'cookie'];

function originOf(url: string): string | null {
  const m = /^(https?:\/\/[^/?#]+)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

/** A `Location` header as an absolute URL, or null for anything that isn't http(s). */
export function resolveLocation(location: string, from: string): string | null {
  const loc = location.trim();
  if (/^https?:\/\//i.test(loc)) return loc;
  const origin = originOf(from);
  if (!origin) return null;
  if (loc.startsWith('//')) return origin.slice(0, origin.indexOf('//')) + loc;
  if (loc.startsWith('/')) return origin + loc;
  if (/^[a-z][a-z0-9+.-]*:/i.test(loc)) return null;
  const path = from.slice(origin.length).split(/[?#]/)[0];
  return origin + path.slice(0, path.lastIndexOf('/') + 1) + loc;
}

function headerRecord(headers: RequestInit['headers']): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  if (typeof (headers as Headers).forEach === 'function') {
    const out: Record<string, string> = {};
    (headers as Headers).forEach((value, name) => (out[name] = value));
    return out;
  }
  return { ...(headers as Record<string, string>) };
}

function without(headers: Record<string, string>, ...names: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !names.includes(name.toLowerCase())));
}

/**
 * A fetch that follows redirects itself, so credentials (`X-API-Key`, session tokens) and request bodies only go
 * along while they stay on the original origin.
 * Platform fetches, `expo-image` and file downloads keep custom headers on a redirect to another host, which
 * would hand the key to whatever a misconfigured server points at. Callers that pass `redirect: 'manual'` get the
 * redirect response as before.
 */
export function createKeyedFetch(base: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (init.redirect === 'manual' || init.redirect === 'error') return base(input, init);
    let url = String(input);
    let method = (init.method ?? 'GET').toUpperCase();
    let body = init.body;
    let headers = headerRecord(init.headers);
    const origin = originOf(url);
    for (let hops = 0; ; hops++) {
      const res = await base(url, { ...init, method, body, headers, redirect: 'manual' });
      if (res.status < 300 || res.status >= 400 || res.status === 304 || hops >= MAX_REDIRECTS) return res;
      const location = res.headers.get('location');
      const next = location ? resolveLocation(location, url) : null;
      if (!next) return res;
      if (originOf(next) !== origin) {
        // A request body (a password, an edit) never follows to another host either.
        if (method !== 'GET' && method !== 'HEAD' && res.status !== 303) return res;
        headers = without(headers, ...CREDENTIAL_HEADERS);
      }
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) {
        method = 'GET';
        body = undefined;
        headers = without(headers, 'content-type');
      }
      url = next;
    }
  }) as typeof fetch;
}

/** The app's fetch for everything that carries the key: native `expo/fetch`, redirects followed by hand. */
export const keyedFetch = createKeyedFetch(((input: RequestInfo | URL, init?: RequestInit) =>
  expoFetch(String(input), init as Parameters<typeof expoFetch>[1])) as unknown as typeof fetch);

/**
 * Downloads `url` into `target` through `keyedFetch` (`File.downloadFileAsync` has no redirect option). The file
 * goes through memory once; attachments and photos are small enough for that.
 */
export async function downloadToFile(
  url: string,
  headers: Record<string, string> | undefined,
  target: File,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<File> {
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) throw new Error('empty download');
  if (!target.exists) target.create({ intermediates: true });
  await target.write(bytes);
  return target;
}
