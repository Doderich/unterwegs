import { ApiError, AuthError, createClient, isAuthFailure, normalizePath, SchemaError } from '../client';
import type { MultipartUpload } from '../upload';

function fakeFetch(routes: Record<string, { status?: number; body: unknown }>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const creds = { serverUrl: 'https://al.example/', apiKey: 'al_test' };
const collection = (id: string, name: string) => ({ id, name, start_date: '2026-12-17', end_date: '2027-01-08' });

describe('normalizePath', () => {
  it.each([
    ['/api/collections/', '/api/collections'],
    ['api/collections', '/api/collections'],
    ['/api/collections/?page=2', '/api/collections?page=2'],
  ])('%s → %s', (input, expected) => expect(normalizePath(input)).toBe(expected));
});

describe('isAuthFailure', () => {
  it('treats both AdventureLog "not logged in" shapes as auth failures', () => {
    expect(isAuthFailure(401, { detail: 'Authentication credentials were not provided.' })).toBe(true);
    expect(isAuthFailure(400, { error: 'User is not authenticated' })).toBe(true);
    expect(isAuthFailure(400, { error: 'Bad date' })).toBe(false);
    expect(isAuthFailure(200, {})).toBe(false);
  });
});

describe('createClient', () => {
  it('sends the key, follows pagination and merges shared collections without duplicates', async () => {
    const { impl, calls } = fakeFetch({
      'https://al.example/api/collections': {
        body: {
          count: 2,
          next: 'https://al.example/api/collections/?page=2',
          previous: null,
          results: [collection('a', 'A')],
        },
      },
      'https://al.example/api/collections?page=2': {
        body: { count: 2, next: null, previous: null, results: [collection('b', 'B')] },
      },
      'https://al.example/api/collections/shared': { body: [collection('b', 'B'), collection('c', 'C')] },
    });
    const collections = await createClient(creds, impl).listCollections();
    expect(collections.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(calls.every((c) => c.headers['X-API-Key'] === 'al_test')).toBe(true);
  });

  it('throws AuthError on the 400 "not authenticated" response', async () => {
    const { impl } = fakeFetch({
      'https://al.example/api/collections/x': { status: 400, body: { error: 'User is not authenticated' } },
    });
    await expect(createClient(creds, impl).getCollection('x')).rejects.toBeInstanceOf(AuthError);
  });

  it('throws SchemaError when the response shape is wrong', async () => {
    const { impl } = fakeFetch({ 'https://al.example/api/collections/x': { body: { id: 'x' } } });
    await expect(createClient(creds, impl).getCollection('x')).rejects.toBeInstanceOf(SchemaError);
  });

  it('marks and unmarks a region by its code, with a JSON content type', async () => {
    const calls: { url: string; method?: string; headers: Record<string, string>; body?: unknown }[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, headers: init?.headers as Record<string, string>, body: init?.body });
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      return new Response(JSON.stringify({ id: 1, user: 'u', region: 'JP-13', name: 'Tokyo' }), { status: 201 });
    }) as unknown as typeof fetch;
    const client = createClient(creds, impl);
    await expect(client.edit.markRegionVisited('JP-13')).resolves.toMatchObject({ region: 'JP-13' });
    await client.edit.unmarkRegionVisited('JP-13');
    expect(calls.map((c) => `${c.method} ${c.url} ${c.body ?? ''}`)).toEqual([
      'POST https://al.example/api/visitedregion {"region":"JP-13"}',
      'DELETE https://al.example/api/visitedregion/JP-13 ',
    ]);
    expect(calls.every((c) => c.headers['Content-Type'] === 'application/json')).toBe(true);
  });

  it('reads the world endpoints', async () => {
    const { impl } = fakeFetch({
      'https://al.example/api/stats/dashboard': { body: { stats: { location_count: 2 }, upcoming_trips: [] } },
      'https://al.example/api/locations/pins': { body: [{ id: 'a', name: 'A', latitude: 1, longitude: 2 }] },
      'https://al.example/api/JP/visits': { body: [] },
    });
    const client = createClient(creds, impl);
    await expect(client.world.stats()).resolves.toMatchObject({ location_count: 2, trips_count: 0 });
    await expect(client.world.pins()).resolves.toHaveLength(1);
    await expect(client.world.regionVisits('JP')).resolves.toEqual([]);
  });

  it('revokes its own key with a JSON content type (the proxy rejects bare DELETEs)', async () => {
    const calls: { url: string; method?: string; headers: Record<string, string> }[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, headers: (init?.headers ?? {}) as Record<string, string> });
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      return new Response(JSON.stringify([{ id: 'k1', key_prefix: 'al_te' }]));
    }) as unknown as typeof fetch;
    await expect(createClient(creds, impl).revokeOwnKey()).resolves.toBe(true);
    expect(calls[1]).toMatchObject({ method: 'DELETE', url: 'https://al.example/auth/api-keys/k1' });
    expect(calls[1].headers['Content-Type']).toBe('application/json');
  });

  it('sends the public, category and Immich writes to the verified paths', async () => {
    const calls: string[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://al.example', '')} ${init?.body ?? ''}`.trim());
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/api/categories'))
        return new Response(JSON.stringify({ id: 'k', name: 'tempel' }), { status: 201 });
      if (url.endsWith('/api/images'))
        return new Response(JSON.stringify({ id: 'i', image: 'https://x/y' }), { status: 201 });
      if (init?.method === 'PATCH') return new Response(JSON.stringify({ id: 'c', name: 'C' }));
      return new Response(JSON.stringify({ success: 'ok' }));
    }) as unknown as typeof fetch;
    const { edit } = createClient(creds, impl);
    await edit.updateCollection('c', { is_public: true });
    await edit.createCategory({ name: 'tempel', display_name: 'Tempel', icon: '⛩️' });
    await edit.deleteCategory('k');
    await edit.addImmichImage('loc', 'asset');
    expect(calls).toEqual([
      'PATCH /api/collections/c {"is_public":true}',
      'POST /api/categories {"name":"tempel","display_name":"Tempel","icon":"⛩️"}',
      'DELETE /api/categories/k',
      'POST /api/images {"content_type":"location","object_id":"loc","immich_id":"asset"}',
    ]);
  });

  it('duplicates a collection and a location into a given collection', async () => {
    const calls: string[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://al.example', '')} ${init?.body ?? ''}`.trim());
      if (url.includes('/api/collections/'))
        return new Response(JSON.stringify(collection('c2', 'Copy of C')), { status: 201 });
      return new Response(JSON.stringify({ id: 'l2', name: 'Copy of L' }), { status: 201 });
    }) as unknown as typeof fetch;
    const { edit } = createClient(creds, impl);
    expect((await edit.duplicateCollection('c'))?.id).toBe('c2');
    expect((await edit.duplicateLocation('l', 'c'))?.id).toBe('l2');
    expect(calls).toEqual([
      'POST /api/collections/c/duplicate {}',
      'POST /api/locations/l/duplicate {"collection_id":"c"}',
    ]);
  });

  it('asks for recommendations around a point and keeps only the places', async () => {
    const url =
      'https://al.example/api/recommendations/query?lat=35.01&lon=135.77&category=food&radius=5000&sources=osm';
    const { impl, calls } = fakeFetch({
      [url]: {
        body: {
          count: 1,
          results: [{ id: 'osm:node:1', name: 'Ramen-ya', latitude: 35.0, longitude: 135.7, distance_km: 0.4 }],
          sources_used: { google: 0, osm: 1 },
        },
      },
    });
    const places = await createClient(creds, impl).recommendations(35.01, 135.77, 'food');
    expect(calls.map((c) => c.url)).toEqual([url]);
    expect(places.map((p) => p.name)).toEqual(['Ramen-ya']);
  });

  it('reads and marks cities by their code, and marks regions from locations', async () => {
    const calls: string[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://al.example', '')} ${init?.body ?? ''}`.trim());
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/cities')) return new Response(JSON.stringify([{ id: 'JP-13-x', name: 'X', region: 'JP-13' }]));
      if (url.endsWith('/visits')) return new Response(JSON.stringify([]));
      if (url.endsWith('/api/visitedcity'))
        return new Response(JSON.stringify({ id: 1, city: 'JP-13-x', name: 'X' }), { status: 201 });
      return new Response(JSON.stringify({ new_regions: 1, regions: { 'JP-13': 'Tokyo' }, new_cities: 0, cities: {} }));
    }) as unknown as typeof fetch;
    const client = createClient(creds, impl);
    expect((await client.world.cities('JP-13')).map((c) => c.id)).toEqual(['JP-13-x']);
    await client.world.cityVisits('JP-13');
    await client.edit.markCityVisited('JP-13-x');
    await client.edit.unmarkCityVisited('JP-13-x');
    expect((await client.edit.markRegionsFromLocations())?.regions).toEqual({ 'JP-13': 'Tokyo' });
    expect(calls).toEqual([
      'GET /api/regions/JP-13/cities',
      'GET /api/regions/JP-13/cities/visits',
      'POST /api/visitedcity {"city":"JP-13-x"}',
      'DELETE /api/visitedcity/JP-13-x',
      'POST /api/reverse-geocode/mark_visited_region {}',
    ]);
  });

  it('treats "nothing on Wikipedia" (404) as empty and imports images by URL', async () => {
    const calls: string[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://al.example', '')} ${init?.body ?? ''}`.trim());
      if (url.includes('/generate/')) return new Response(JSON.stringify({ error: 'No image found' }), { status: 404 });
      return new Response(
        JSON.stringify({ created: [{ id: 'i', image: 'https://x/y.webp' }], created_count: 1, requested_count: 1 }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;
    const client = createClient(creds, impl);
    expect(await client.wikipediaDescription('Kinkaku-ji', 'de')).toBeNull();
    expect(await client.wikipediaImages('Kinkaku-ji', 'de')).toEqual([]);
    const imported = await client.edit.importImages('location', 'l', ['https://example.org/a.jpg'], 'url');
    expect(imported?.created.map((i) => i.id)).toEqual(['i']);
    expect(calls).toEqual([
      'GET /api/generate/desc?name=Kinkaku-ji&lang=de',
      'GET /api/generate/img?name=Kinkaku-ji&lang=de',
      'POST /api/images/import_from_urls {"content_type":"location","object_id":"l","urls":["https://example.org/a.jpg"],"source":"url"}',
    ]);
  });

  it('fills an empty day plan and explains "nothing dated" in the app language', async () => {
    let first = true;
    const impl = (async () => {
      if (first) {
        first = false;
        return new Response(
          JSON.stringify({ message: 'ok', items: [{ id: 'i', content_type: 'lodging', object_id: 'l' }] }),
          {
            status: 201,
          },
        );
      }
      return new Response(JSON.stringify({ detail: 'No dated records found within collection date range.' }), {
        status: 400,
      });
    }) as unknown as typeof fetch;
    const { edit } = createClient(creds, impl);
    expect((await edit.autoGenerateItinerary('c'))?.items).toHaveLength(1);
    await expect(edit.autoGenerateItinerary('c')).rejects.toThrow('In dieser Sammlung hat nichts ein Datum');
  });

  it('checks duplicates, quick-adds places and reads one location with its collections', async () => {
    const calls: string[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://al.example', '')}`);
      if (url.endsWith('/check-duplicates'))
        return new Response(
          JSON.stringify({ matches: [{ id: 'l1', name: 'Kinkaku-ji', score: 0.97, reasons: ['similar_name'] }] }),
        );
      if (url.endsWith('/api/lodging/quick-add'))
        return new Response(JSON.stringify({ id: 'h1', name: 'Ryokan' }), { status: 201 });
      return new Response(JSON.stringify({ id: 'l1', name: 'Kinkaku-ji', collections: ['c1', 'c2'] }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createClient(creds, impl);
    expect((await client.edit.checkDuplicates({ name: 'Kinkakuji', latitude: 35, longitude: 135.7 }))[0].id).toBe('l1');
    const place = { name: 'X', latitude: 1, longitude: 2, collection_id: 'c1' };
    expect((await client.edit.quickAddLocation(place))?.id).toBe('l1');
    expect((await client.edit.quickAddLodging(place))?.id).toBe('h1');
    expect((await client.getLocation('l1')).collections).toEqual(['c1', 'c2']);
    expect(calls).toEqual([
      'POST /api/locations/check-duplicates',
      'POST /api/locations/quick-add',
      'POST /api/lodging/quick-add',
      'GET /api/locations/l1',
    ]);
  });

  it('reads a public profile with its public collections, locations and counts', async () => {
    const { impl, calls } = fakeFetch({
      'https://al.example/auth/user/bea': {
        body: {
          user: { uuid: 'u2', username: 'bea', first_name: 'Bea', last_name: 'Beispiel', profile_pic: null },
          adventures: [{ id: 'l1', name: 'Kinkaku-ji', is_public: true }],
          collections: [collection('c1', 'Kyoto')],
        },
      },
      'https://al.example/api/stats/counts/bea': {
        body: { location_count: 3, visited_location_count: 1, trips_count: 1, activity_count: 0 },
      },
    });
    const client = createClient(creds, impl);
    const profile = await client.profile('bea');
    expect([profile.user.first_name, profile.adventures[0].name, profile.collections[0].name]).toEqual([
      'Bea',
      'Kinkaku-ji',
      'Kyoto',
    ]);
    expect((await client.profileStats('bea')).location_count).toBe(3);
    expect(calls).toHaveLength(2);
  });

  it('follows Immich pages by path, whatever origin the server puts in `next`', async () => {
    const { impl, calls } = fakeFetch({
      'https://al.example/api/integrations/immich/search?query=tempel': {
        body: {
          count: 2,
          next: 'http://internal:8000/api/integrations/immich/search?page=2&query=tempel',
          results: [],
        },
      },
      'https://al.example/api/integrations/immich/search?page=2&query=tempel': {
        body: { count: 2, next: null, results: [{ id: 'a', image_url: 'https://x/a' }] },
      },
    });
    const client = createClient(creds, impl);
    const first = await client.immich.search('tempel');
    const second = await client.immich.search('tempel', first.next);
    expect(second.results.map((a) => a.id)).toEqual(['a']);
    expect(calls).toHaveLength(2);
  });
});

describe('media writes', () => {
  function capture(status: number, body: unknown) {
    const calls: { url: string; init: RequestInit }[] = [];
    const impl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(status === 204 ? null : JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { impl, calls };
  }
  /**
   * Files go up through the native multipart upload, not through `fetch` with a FormData file part: Expo's
   * `fetch` only accepts Blob-like parts and throws "Unsupported FormDataPart implementation" for React Native's
   * `{ uri, name, type }` files, so no photo or attachment ever reached the server.
   */
  function captureUpload(status: number, body: unknown) {
    const calls: { url: string; request: Parameters<MultipartUpload>[1] }[] = [];
    const upload: MultipartUpload = async (url, request) => {
      calls.push({ url, request });
      return { status, body: JSON.stringify(body) };
    };
    const fetchImpl = (async () => {
      throw new Error('uploads must not go through fetch');
    }) as unknown as typeof fetch;
    return { client: createClient(creds, fetchImpl, upload), calls };
  }
  const file = { uri: 'file:///tmp/photo.jpg', name: 'photo.jpg', type: 'image/jpeg' };
  const image = {
    id: 'img1',
    image: 'https://al.example/media/images/x.webp',
    is_primary: false,
    source: 'upload',
  };

  it('uploads an image natively as multipart with a same-origin Origin header', async () => {
    const { client, calls } = captureUpload(201, image);
    const result = await client.edit.uploadImage('location', 'loc1', file);
    expect(result).toMatchObject({ id: 'img1', is_primary: false });
    const { url, request } = calls[0];
    expect(url).toBe('https://al.example/api/images');
    expect(request.file).toEqual(file);
    expect(request.fieldName).toBe('image');
    expect(request.fields).toEqual({ content_type: 'location', object_id: 'loc1' });
    // Without it the SvelteKit proxy answers 403 "Cross-site POST form submissions are forbidden".
    expect(request.headers.Origin).toBe('https://al.example');
    expect(request.headers['X-API-Key']).toBe('al_test');
    // The upload sets the multipart boundary itself.
    expect(request.headers['Content-Type']).toBeUndefined();
  });

  it('turns upload answers into the same errors as other writes', async () => {
    await expect(
      captureUpload(400, { error: 'Unsupported file type' }).client.edit.uploadImage('location', 'l', file),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      captureUpload(401, { detail: 'Authentication credentials were not provided.' }).client.edit.uploadImage(
        'location',
        'l',
        file,
      ),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      captureUpload(201, { nope: true }).client.edit.uploadImage('location', 'l', file),
    ).rejects.toBeInstanceOf(SchemaError);
  });

  it('imports a collection ZIP as the multipart field "file"', async () => {
    const { client, calls } = captureUpload(201, collection('c9', 'Japan (2)'));
    const zip = { uri: 'file:///tmp/japan.zip', name: 'japan.zip', type: 'application/zip' };
    const created = await client.edit.importCollection(zip);
    expect(created).toMatchObject({ id: 'c9', name: 'Japan (2)' });
    expect(calls[0].url).toBe('https://al.example/api/collections/import');
    expect(calls[0].request).toMatchObject({ fieldName: 'file', file: zip, fields: {} });
  });

  it('creates trails as JSON and activities with a GPX file as multipart', async () => {
    const { impl, calls } = capture(201, { id: 't1', name: 'Philosophenweg' });
    const uploads = captureUpload(201, { id: 'a1', name: 'Walk' }).calls;
    const client = createClient(creds, impl, async (url, request) => {
      uploads.push({ url, request });
      return { status: 201, body: JSON.stringify({ id: 'a1', name: 'Walk' }) };
    });
    await client.edit.createTrail('l1', { name: 'Philosophenweg', link: 'https://example.org/trail' });
    expect(calls[0].url).toBe('https://al.example/api/trails');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Philosophenweg',
      link: 'https://example.org/trail',
      location: 'l1',
    });
    const gpx = { uri: 'file:///tmp/walk.gpx', name: 'walk.gpx', type: 'application/gpx+xml' };
    await client.edit.createActivity(
      'v1',
      { name: 'Walk', sport_type: 'Walk', distance: 4200, moving_time: null },
      gpx,
    );
    expect(uploads[0].url).toBe('https://al.example/api/activities');
    expect(uploads[0].request).toMatchObject({ fieldName: 'gpx_file', file: gpx });
    expect(uploads[0].request.fields).toMatchObject({ visit: 'v1', distance: '4200' });
    expect(uploads[0].request.fields).not.toHaveProperty('moving_time');
  });

  it('only sends an attachment name when there is one', async () => {
    const attachment = { id: 'a1', file: 'https://al.example/media/attachments/x.pdf', extension: 'pdf', name: null };
    const { client, calls } = captureUpload(201, attachment);
    const pdf = { uri: 'file:///tmp/b.pdf', name: 'b.pdf', type: 'application/pdf' };
    await client.edit.uploadAttachment('lodging', 'l1', pdf);
    await client.edit.uploadAttachment('lodging', 'l1', pdf, 'Buchung');
    expect(calls[0].request).toMatchObject({ fieldName: 'file', file: pdf });
    expect(calls[0].request.fields).toEqual({ content_type: 'lodging', object_id: 'l1' });
    expect(calls[1].request.fields).toEqual({ content_type: 'lodging', object_id: 'l1', name: 'Buchung' });
  });

  it('sends a JSON content type on body-less writes, which the proxy requires', async () => {
    const { impl, calls } = capture(204, null);
    await createClient(creds, impl).edit.deleteImage('img1');
    expect(calls[0].url).toBe('https://al.example/api/images/img1');
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('turns the proxy rejection into an ApiError with its message', async () => {
    const { client } = captureUpload(403, { message: 'Cross-site POST form submissions are forbidden' });
    await expect(client.edit.uploadImage('location', 'loc1', file)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
  });
});

describe('write errors', () => {
  it('keeps a 403 on a write as "not allowed", not as signed out', async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ detail: 'You do not have permission to perform this action.' }), {
        status: 403,
      })) as unknown as typeof fetch;
    await expect(createClient(creds, impl).edit.deleteNote('n1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
  });

  it('still treats an invalid key on a write as signed out', async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ detail: 'Invalid or expired API key.' }), {
        status: 401,
      })) as unknown as typeof fetch;
    await expect(createClient(creds, impl).edit.deleteNote('n1')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('account administration', () => {
  it('writes only provided profile fields and returns server validation errors', async () => {
    const requests: RequestInit[] = [];
    const impl = jest.fn(async (_url: unknown, init?: RequestInit) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({ username: 'sam', first_name: 'Sam', public_profile: true }), {
        status: 200,
      });
    });
    const client = createClient(creds, impl as unknown as typeof fetch);
    const user = await client.edit.updateAccount({ first_name: 'Sam' });
    expect(user.public_profile).toBe(true);
    expect(JSON.parse(String(requests[0].body))).toEqual({ first_name: 'Sam' });
    expect(requests[0].method).toBe('PATCH');
  });

  it('returns a newly created key once without including it in key listings', async () => {
    const impl = jest.fn(
      async (_url: unknown, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            init?.method === 'POST'
              ? { id: 'key-id', name: 'Test', key_prefix: 'al_example', key: 'al_example_token' }
              : [{ id: 'key-id', name: 'Test', key_prefix: 'al_example', key: 'unexpected' }],
          ),
          { status: init?.method === 'POST' ? 201 : 200 },
        ),
    );
    const client = createClient(creds, impl as unknown as typeof fetch);
    expect((await client.edit.createApiKey('Test')).key).toBe('al_example_token');
    expect(await client.listApiKeys()).toEqual([{ id: 'key-id', name: 'Test', key_prefix: 'al_example' }]);
  });

  it('confirms account deletion with a username and optional password', async () => {
    const impl = jest.fn(async () => new Response(null, { status: 204 }));
    const client = createClient(creds, impl as unknown as typeof fetch);
    await client.edit.deleteAccount('sam', 'example-password');
    expect(impl).toHaveBeenCalledWith(
      'https://al.example/auth/delete-account',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmation: 'sam', password: 'example-password' }),
      }),
    );
  });
});

describe('integration settings', () => {
  it('strips secrets from configuration responses and treats a missing connection as unconfigured', async () => {
    const { impl } = fakeFetch({
      'https://al.example/api/integrations/immich': {
        body: { id: 'i', server_url: 'https://photos.example.org', api_key: 'private', copy_locally: true },
      },
      'https://al.example/api/integrations/wanderer': { status: 404, body: {} },
    });
    const client = createClient(creds, impl);
    expect(await client.integrationSettings('immich')).toEqual({
      id: 'i',
      server_url: 'https://photos.example.org',
      copy_locally: true,
    });
    expect(await client.integrationSettings('wanderer')).toBeNull();
  });

  it('updates Immich with PUT and leaves an unchanged API key out of the request', async () => {
    const impl = jest.fn(
      async () =>
        new Response(JSON.stringify({ id: 'i', server_url: 'https://photos.example.org', copy_locally: false })),
    );
    await createClient(creds, impl as unknown as typeof fetch).edit.saveIntegration('immich', 'i', {
      server_url: 'https://photos.example.org',
      copy_locally: false,
    });
    expect(impl).toHaveBeenCalledWith(
      'https://al.example/api/integrations/immich/i',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ server_url: 'https://photos.example.org', copy_locally: false }),
      }),
    );
  });

  it('handles Endurain MFA as an intermediate result and completes the challenge', async () => {
    const impl = jest.fn(
      async (url: unknown) =>
        new Response(
          JSON.stringify(
            String(url).endsWith('/connect')
              ? { mfa_required: true, mfa_token: 'pending' }
              : { id: 'e', server_url: 'https://fitness.example.org', username: 'sam' },
          ),
          { status: String(url).endsWith('/connect') ? 202 : 201 },
        ),
    );
    const client = createClient(creds, impl as unknown as typeof fetch);
    expect(await client.edit.connectEndurain('https://fitness.example.org', 'sam', 'example')).toEqual({
      mfa_required: true,
      mfa_token: 'pending',
    });
    expect((await client.edit.confirmEndurainMfa('pending', '123456')).id).toBe('e');
    expect(impl).toHaveBeenLastCalledWith(
      'https://al.example/api/integrations/endurain/mfa',
      expect.objectContaining({ body: JSON.stringify({ mfa_token: 'pending', mfa_code: '123456' }) }),
    );
  });

  it('disconnects the requested integration with the pinned API method', async () => {
    const impl = jest.fn(async () => new Response(null, { status: 204 }));
    const client = createClient(creds, impl as unknown as typeof fetch);
    await client.edit.disconnectIntegration('immich', 'i');
    expect(impl).toHaveBeenLastCalledWith(
      'https://al.example/api/integrations/immich/i',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await client.edit.disconnectIntegration('wanderer');
    expect(impl).toHaveBeenLastCalledWith(
      'https://al.example/api/integrations/wanderer/disable',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('exchanges a Strava code only at the server and checks connection status', async () => {
    const impl = jest.fn(async (url: unknown) =>
      String(url).includes('/callback?')
        ? new Response(null, { status: 302 })
        : new Response(JSON.stringify({ strava: { global: true, user: true } })),
    );
    expect(await createClient(creds, impl as unknown as typeof fetch).edit.completeStrava('one-time-code')).toBe(true);
    expect(impl).toHaveBeenNthCalledWith(
      1,
      'https://al.example/api/integrations/strava/callback?code=one-time-code',
      expect.objectContaining({ redirect: 'manual', headers: expect.objectContaining({ 'X-API-Key': 'al_test' }) }),
    );
  });
});

it('creates a standalone location with no collection membership and follows the location library pagination', async () => {
  const requests: { url: string; body?: string }[] = [];
  const impl: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, body: init?.body?.toString() });
    const body =
      init?.method === 'POST'
        ? { id: 'standalone', name: 'Garden', collections: [] }
        : {
            count: 2,
            next: url.endsWith('page=2') ? null : 'https://al.example/api/locations?page=2',
            previous: null,
            results: [{ id: url.endsWith('page=2') ? 'second' : 'first', name: 'Garden', collections: [] }],
          };
    return new Response(JSON.stringify(body));
  };
  const client = createClient(creds, impl);
  await expect(client.edit.createLocation({ name: 'Garden' })).resolves.toMatchObject({ collections: [] });
  expect(JSON.parse(requests[0].body!)).toEqual({ name: 'Garden', collections: [] });
  await expect(client.listLocations()).resolves.toHaveLength(2);
  expect(requests.at(-1)?.url).toBe('https://al.example/api/locations?page=2');
});
