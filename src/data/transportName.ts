import type { Transportation } from '@/api/schemas';

type Leg = Pick<Transportation, 'name' | 'from_location' | 'to_location' | 'start_code' | 'end_code'>;

/** List title: places, with the code in parentheses when there is one. The stored name when a place is missing. */
export function transportTitle(t: Leg): string {
  if (t.from_location && t.to_location) {
    const from = t.start_code ? `${t.from_location} (${t.start_code})` : t.from_location;
    const to = t.end_code ? `${t.to_location} (${t.end_code})` : t.to_location;
    return `${from} → ${to}`;
  }
  return t.name;
}

/** Glance route: the code when there is one, otherwise the place. Empty when neither end is known. */
export function transportRoute(t: Leg): string {
  const from = t.start_code || t.from_location;
  const to = t.end_code || t.to_location;
  return from && to ? `${from} → ${to}` : (to ?? from ?? '');
}
