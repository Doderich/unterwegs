import type { QueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@/api/client';
import { collectionQueryOptions, mainQueryOptions } from './queries';
import type { CollectionSummary } from '@/api/schemas';
import { sortCollections } from './selectors';

/** Warm main tabs through the normal persisted cache; one unavailable endpoint cannot block the rest. */
export async function warmMainData(cache: QueryClient, client: ApiClient) {
  const options = mainQueryOptions(client);
  return Promise.allSettled([
    cache.query(options.collections),
    cache.query(options.locations),
    cache.query(options.invites),
    cache.query(options.archived),
    cache.query(options.stats),
    cache.query(options.pins),
    cache.query(options.countries),
  ]);
}

/** A small look-ahead, never a download of the whole library or its media. */
export function warmCollectionDetails(
  cache: QueryClient,
  client: ApiClient,
  collections: CollectionSummary[],
  today: string,
) {
  return Promise.allSettled(
    sortCollections(collections, today)
      .slice(0, 2)
      .map((collection) => cache.query(collectionQueryOptions(client, collection.id))),
  );
}
