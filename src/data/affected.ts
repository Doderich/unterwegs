import type { QueryKey } from '@tanstack/react-query';

import { queryKeys } from './queries';

/** What a write changed, in domain terms (GLOSSARY.md). */
export type Touched =
  /** A location, which may sit in the library, in any collection, on the world map and in the calendar. */
  | { location: string }
  /** One collection's content. */
  | { collection: string }
  /** The list of collections: created, imported, invited to, shared, archived, deleted, left. */
  | 'collections'
  /** Visited regions and cities, and the statistics and country counts built on them. */
  | 'world'
  | 'categories'
  | 'integrations'
  /** The user's own account, which also decides what they see of others. */
  | 'account'
  | 'apiKeys';

/**
 * The cached reads a write makes stale, in one place: a write says what it touched, this knows who reads it.
 * Adding a screen that reads locations means adding its key here, not to every write.
 */
export function readsAffectedBy(...touched: Touched[]): QueryKey[] {
  return touched.flatMap((t): QueryKey[] => {
    if (typeof t === 'object' && 'location' in t)
      return [
        queryKeys.locations,
        queryKeys.location(t.location),
        // A location can belong to any collection.
        ['collection'],
        queryKeys.world.pins,
        queryKeys.world.stats,
        queryKeys.calendar,
      ];
    if (typeof t === 'object') return [queryKeys.collection(t.collection)];
    switch (t) {
      case 'collections':
        return [queryKeys.collections, queryKeys.invites, queryKeys.archived];
      case 'world':
        return [['world']];
      case 'categories':
        // Category names and icons show on locations everywhere.
        return [queryKeys.categories, queryKeys.categoriesWithCount, ['collection'], queryKeys.world.pins];
      case 'integrations':
        return [queryKeys.integrations];
      case 'account':
        return [queryKeys.user, queryKeys.collections, queryKeys.invites, queryKeys.users];
      case 'apiKeys':
        return [queryKeys.apiKeys];
    }
  });
}
