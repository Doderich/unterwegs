import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';

import { createClient } from '@/api/client';
import { warmCollectionDetails, warmMainData } from '../mainData';
import sample from '../../../docs/samples/collection-detail.json';
import { collectionQueryOptions, mainQueryOptions, queryKeys } from '../queries';

function fixture(failStats = false) {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    const stats = path === '/api/stats/dashboard';
    return new Response(
      JSON.stringify(
        stats
          ? { stats: {} }
          : path === '/api/collections' || path === '/api/locations'
            ? { count: 0, results: [], next: null, previous: null }
            : [],
      ),
      { status: stats && failStats ? 500 : 200 },
    );
  };
  const client = createClient({ serverUrl: 'https://example.org', apiKey: 'al_fixture' }, fetcher);
  const cache = new QueryClient({
    defaultOptions: { queries: { staleTime: 300_000, gcTime: Infinity, retry: false } },
  });
  return { calls, client, cache };
}

it('deduplicates warming, serves screen reads from cache, and reuses restored data', async () => {
  const { cache, client, calls } = fixture();
  await Promise.all([warmMainData(cache, client), warmMainData(cache, client)]);
  expect(calls).toHaveLength(8);
  await cache.query(mainQueryOptions(client).countries);
  expect(calls).toHaveLength(8);

  const restored = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, gcTime: Infinity } } });
  hydrate(restored, dehydrate(cache));
  await warmMainData(restored, client);
  expect(calls).toHaveLength(8);
  expect(restored.getQueryData(queryKeys.world.countries)).toEqual([]);

  await cache.invalidateQueries({ queryKey: queryKeys.world.countries });
  await warmMainData(cache, client);
  expect(calls).toHaveLength(9);
  cache.clear();
  restored.clear();
});

it('keeps other tab data usable when one warm-up request fails', async () => {
  const { cache, client } = fixture(true);
  const results = await warmMainData(cache, client);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  expect(cache.getQueryData(queryKeys.world.stats)).toBeUndefined();
  expect(cache.getQueryData(queryKeys.world.countries)).toEqual([]);
  expect(cache.getQueryData(queryKeys.archived)).toEqual([]);
  cache.clear();
});

it('prefetches only the next two collection details through the same single-request cache as the screen', async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    return new Response(JSON.stringify({ ...sample, id: path.split('/').at(-1) }));
  };
  const client = createClient({ serverUrl: 'https://example.org', apiKey: 'al_fixture' }, fetcher);
  const cache = new QueryClient({
    defaultOptions: { queries: { staleTime: 300_000, gcTime: Infinity, retry: false } },
  });
  const collections = [
    { id: 'past', name: 'Past', start_date: '2026-01-01', end_date: '2026-01-02' },
    { id: 'future', name: 'Upcoming', start_date: '2026-12-01', end_date: '2026-12-02' },
    { id: 'active', name: 'Current', start_date: '2026-11-01', end_date: '2026-11-10' },
    { id: 'archived', name: 'Archive', is_archived: true },
  ];
  await Promise.all([
    warmCollectionDetails(cache, client, collections, '2026-11-05'),
    warmCollectionDetails(cache, client, collections, '2026-11-05'),
  ]);
  expect(calls).toEqual(['/api/collections/active', '/api/collections/future']);
  await cache.query(collectionQueryOptions(client, 'active'));
  expect(calls).toHaveLength(2);
  expect(cache.getQueryData(queryKeys.collection('past'))).toBeUndefined();
  cache.clear();
});
