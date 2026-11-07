import { QueryCache, QueryClient, queryOptions, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { AuthError, type ApiClient } from '@/api/client';
import type { Collection } from '@/api/schemas';
import { useClient } from '@/auth/session';

import { applyPending, getOutbox, subscribeOutbox } from './outbox';
import { buildCollectionView } from './selectors';

export function createQueryClient(onAuthError: () => void): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AuthError) onAuthError();
      },
    }),
    defaultOptions: {
      queries: {
        retry: (count, error) => !(error instanceof AuthError) && count < 2,
        staleTime: 5 * 60 * 1000,
        // Keep data for the persisted cache: offline is the normal case on trains.
        gcTime: Infinity,
        networkMode: 'offlineFirst',
      },
    },
  });
}

export const queryKeys = {
  locations: ['locations'] as const,
  location: (id: string) => ['location', id] as const,
  collections: ['collections'] as const,
  collection: (id: string) => ['collection', id] as const,
  user: ['user'] as const,
  invites: ['invites'] as const,
  categories: ['categories'] as const,
  users: ['users'] as const,
  profile: (username: string) => ['profile', username] as const,
  profileStats: (username: string) => ['profile', username, 'stats'] as const,
  categoriesWithCount: ['categories', 'with-count'] as const,
  archived: ['collections-archived'] as const,
  calendar: ['calendar'] as const,
  integrations: ['integrations'] as const,
  apiKeys: ['account-keys'] as const,
  world: {
    stats: ['world', 'stats'] as const,
    pins: ['world', 'pins'] as const,
    countries: ['world', 'countries'] as const,
    regions: (code: string) => ['world', 'regions', code] as const,
    regionVisits: (code: string) => ['world', 'region-visits', code] as const,
    cities: (regionId: string) => ['world', 'cities', regionId] as const,
    cityVisits: (regionId: string) => ['world', 'city-visits', regionId] as const,
  },
};

/** Shared definitions keep tab reads and background warming on identical cache entries. */
export function mainQueryOptions(client: ApiClient) {
  return {
    collections: queryOptions({ queryKey: queryKeys.collections, queryFn: () => client.listCollections() }),
    locations: queryOptions({ queryKey: queryKeys.locations, queryFn: () => client.listLocations() }),
    invites: queryOptions({ queryKey: queryKeys.invites, queryFn: () => client.listInvites(), retry: false }),
    archived: queryOptions({ queryKey: queryKeys.archived, queryFn: () => client.archivedCollections() }),
    stats: queryOptions({ queryKey: queryKeys.world.stats, queryFn: () => client.world.stats() }),
    pins: queryOptions({ queryKey: queryKeys.world.pins, queryFn: () => client.world.pins() }),
    countries: queryOptions({ queryKey: queryKeys.world.countries, queryFn: () => client.world.countries() }),
  };
}

export function useCollections() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).collections);
}

export function collectionQueryOptions(client: ApiClient, id: string) {
  return queryOptions({ queryKey: queryKeys.collection(id), queryFn: () => client.getCollection(id) });
}

/**
 * The offline copy of one collection: as the server last sent it, without waiting edits. For what is synced
 * from the server (its photos and files); screens use `useCollection`.
 */
export function useOfflineCopy(id: string) {
  const client = useClient();
  return useQuery({ ...collectionQueryOptions(client, id), enabled: !!id });
}

/**
 * One collection, with the edits still waiting for the server laid over it (ADR 0016): the screens show the
 * collection as it will be, online or not.
 */
export function useCollection(id: string) {
  const client = useClient();
  const pending = useSyncExternalStore(subscribeOutbox, getOutbox);
  const mine = useMemo(() => pending.filter((op) => op.collectionId === id), [pending, id]);
  const select = useCallback((c: Collection) => (mine.length ? applyPending(c, mine) : c), [mine]);
  return useQuery({ ...collectionQueryOptions(client, id), enabled: !!id, select });
}

/** The collection resolved into days, lodgings and map data. */
export function useCollectionView(id: string) {
  const query = useCollection(id);
  const view = useMemo(() => (query.data ? buildCollectionView(query.data) : null), [query.data]);
  return { ...query, view };
}

export function useUser() {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.user, queryFn: () => client.getUser() });
}

/** Pending invites to other users' collections. Online only; never an error screen. */
export function useInvites() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).invites);
}

/** The user's location categories (for the location form). */
export function useCategories() {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.categories, queryFn: () => client.listCategories() });
}

/** Users that can be invited (public profiles). Only loaded when `enabled`. */
export function usePublicUsers(enabled: boolean) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.users, queryFn: () => client.listUsers(), enabled, retry: false });
}

/** A public profile; kept like the other screens so it opens offline once seen. */
export function useProfile(username: string) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.profile(username), queryFn: () => client.profile(username) });
}

export function useProfileStats(username: string) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.profileStats(username), queryFn: () => client.profileStats(username) });
}

/*
 * World travel. Persisted like the collections, so the screens open offline with the last data.
 * Stats and country counts change when regions are marked, so `useRegionEdits` invalidates the whole `world` key.
 */

export function useWorldStats() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).stats);
}

export function usePins() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).pins);
}

export function useCountries() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).countries);
}

export function useRegions(code: string) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.world.regions(code), queryFn: () => client.world.regions(code) });
}

export function useRegionVisits(code: string) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.world.regionVisits(code), queryFn: () => client.world.regionVisits(code) });
}

export function useCities(regionId: string) {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.world.cities(regionId), queryFn: () => client.world.cities(regionId) });
}

export function useCityVisits(regionId: string) {
  const client = useClient();
  return useQuery({
    queryKey: queryKeys.world.cityVisits(regionId),
    queryFn: () => client.world.cityVisits(regionId),
  });
}

/** Categories with usage counts, for the categories screen. */
export function useCategoriesWithCount() {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.categoriesWithCount, queryFn: () => client.categoriesWithCount() });
}

export function useArchivedCollections() {
  const client = useClient();
  return useQuery(mainQueryOptions(client).archived);
}

export function useCalendar() {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.calendar, queryFn: () => client.calendar() });
}

export function useIntegrations() {
  const client = useClient();
  return useQuery({ queryKey: queryKeys.integrations, queryFn: () => client.integrations() });
}
