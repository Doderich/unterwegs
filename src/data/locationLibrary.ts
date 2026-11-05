import type { Location } from '@/api/schemas';

/** Shared by the library and its dedicated search view. Unknown filters show the full library. */
export function matchesLocationFilter(place: Location, filter: string | undefined): boolean {
  if (filter === 'standalone') return !place.collections?.length;
  if (filter === 'visited') return !!place.is_visited;
  if (filter === 'saved') return !place.is_visited;
  return true;
}
