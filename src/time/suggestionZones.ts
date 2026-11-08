import type { Collection } from '@/api/schemas';

/**
 * Own time zones to offer first for a Collection: its zone, every lodging zone, every transportation end, then the
 * phone. The zone select shows these before the full server list, and drops duplicates itself.
 */
export function suggestionZones(
  timeZone: string,
  collection: Pick<Collection, 'lodging' | 'transportations'>,
  deviceZone: string,
): string[] {
  return [
    timeZone,
    ...collection.lodging.flatMap((l) => (l.timezone ? [l.timezone] : [])),
    ...collection.transportations.flatMap((t) =>
      [t.start_timezone, t.end_timezone].filter((z): z is string => !!z),
    ),
    deviceZone,
  ];
}
