import type { CollectionSummary, Location, Visit } from '@/api/schemas';
import { deviceTimeZone, localDate, visitTime } from '@/time/tz';
import { todayIn } from '@/time/today';

export type FeedItem =
  | { key: string; kind: 'collection'; date: string; current: boolean; collection: CollectionSummary }
  | { key: string; kind: 'visit'; date: string; current: boolean; location: Location; visit: Visit };

/** Calendar dates use each visit's own zone; midnight-UTC all-day visits keep their server date. */
export function homeFeed(
  collections: CollectionSummary[],
  locations: Location[],
  now = new Date(),
  zones: ReadonlyMap<string, string> = new Map(),
) {
  const items: FeedItem[] = [];
  for (const collection of collections) {
    const today = todayIn(zones.get(collection.id) ?? deviceTimeZone(), now);
    if (!collection.start_date || collection.is_archived) continue;
    const end = collection.end_date ?? collection.start_date;
    if (end < today) continue;
    items.push({
      key: `collection:${collection.id}`,
      kind: 'collection',
      date: collection.start_date,
      current: collection.start_date <= today,
      collection,
    });
  }
  const seen = new Set<string>();
  for (const location of locations)
    for (const visit of location.visits) {
      if (!visit.start_date || seen.has(visit.id)) continue;
      const zone = visit.timezone || deviceTimeZone();
      const span = visitTime(visit.start_date, visit.end_date, zone);
      const date = span.date;
      const ownToday = localDate(now, zone);
      const endDate = span.endDate ?? date;
      if (endDate < ownToday) continue;
      seen.add(visit.id);
      items.push({ key: `visit:${visit.id}`, kind: 'visit', date, current: date <= ownToday, location, visit });
    }
  items.sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      a.date.localeCompare(b.date) ||
      feedTime(a).localeCompare(feedTime(b)) ||
      a.key.localeCompare(b.key),
  );
  return {
    current: items.filter((i) => i.current),
    upcoming: items.filter((i) => !i.current),
    recent: [...locations]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.id.localeCompare(b.id))
      .slice(0, 5),
  };
}

function feedTime(item: FeedItem): string {
  return item.kind === 'visit'
    ? (visitTime(item.visit.start_date!, item.visit.end_date, item.visit.timezone || deviceTimeZone()).time ?? '')
    : '';
}
