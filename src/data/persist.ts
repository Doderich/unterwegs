import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Constants from 'expo-constants';
import { Storage } from 'expo-sqlite/kv-store';

/**
 * Query cache persisted in SQLite, so the app opens with the last data even without network.
 * Busted on every app version, so a schema change never hydrates stale shapes.
 */
export const persister = createAsyncStoragePersister({
  storage: Storage,
  key: 'unterwegs.query-cache.v1',
  throttleTime: 1000,
});

export const persistOptions = {
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) =>
      query.meta?.persist !== false && defaultShouldDehydrateQuery(query),
  },
  maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days: covers collection + a margin
  buster: Constants.expoConfig?.version ?? 'dev',
};
