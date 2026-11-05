import { ListItem } from '@expo/ui';
import { router } from 'expo-router';

import type { ReactElement } from 'react';

import type { Checklist, Image, Lodging, Note, Transportation } from '@/api/schemas';
import { firstImage } from '@/data/images';
import type { Day, DayEntry, CollectionView } from '@/data/selectors';
import { tr } from '@/i18n';
import { formatDateTime, formatSpan, formatTime, localDate, zoned } from '@/time/tz';

import { lodgingLabel, transportIcon, transportLabel } from './icons';
import { RowIcon, type RowTheme } from './rows';
import { staySubtitle } from './stay';
import { Thumb } from './Thumb';
import { Sub } from './Sub';

export function transportTitle(t: Transportation): string {
  if (t.from_location && t.to_location) {
    const from = t.start_code ? `${t.from_location} (${t.start_code})` : t.from_location;
    const to = t.end_code ? `${t.to_location} (${t.end_code})` : t.to_location;
    return `${from} → ${to}`;
  }
  return t.name;
}

/** `14:00 Deutschland → 10:45 (+1) · Flug LH716` */
export function transportSubtitle(t: Transportation, collectionZone: string): string {
  const start = t.date ? zoned(t.date, t.start_timezone ?? collectionZone, collectionZone) : null;
  const end = t.end_date
    ? zoned(t.end_date, t.end_timezone ?? t.start_timezone ?? collectionZone, collectionZone)
    : null;
  const label = [transportLabel(t.type), t.flight_number].filter(Boolean).join(' ');
  return [start ? formatSpan(start, end) : null, label].filter(Boolean).join(' · ');
}

export function lodgingSubtitle(l: Lodging, day: string | null, collectionZone: string): string {
  const tz = l.timezone ?? collectionZone;
  const parts: string[] = [];
  if (day && l.check_in && localDate(l.check_in, tz) === day)
    parts.push(tr('entries.checkinTime', { time: formatTime(l.check_in, tz) }));
  else if (day && l.check_out && localDate(l.check_out, tz) === day)
    parts.push(tr('entries.checkoutTime', { time: formatTime(l.check_out, tz) }));
  else if (!day && l.check_in) parts.push(formatDateTime(l.check_in, tz));
  parts.push(lodgingLabel(l.type));
  if (l.location) parts.push(l.location);
  return parts.join(' · ');
}

/** The night's lodging as a list row with the stay summary. */
export function stayRow(t: RowTheme, view: CollectionView, day: Day, lodging: Lodging): ReactElement {
  return (
    <ListItem
      key={`night-${lodging.id}`}
      colors={t.listColors}
      leading={leadingFor(lodging.images, <RowIcon name="lodging" />)}
      supportingText={<Sub>{staySubtitle(lodging, day.date, view.timeZone)}</Sub>}
      onPress={() => openLodging(view.collection.id, lodging.id)}>
      {lodging.name}
    </ListItem>
  );
}

/** Square photo thumbnail when the item has images, otherwise the type icon. */
export function leadingFor(images: Image[] | null | undefined, fallback: ReactElement): ReactElement {
  const img = firstImage(images);
  return img ? <Thumb url={img.image} /> : fallback;
}

export function openEntryDetail(collectionId: string, entry: DayEntry) {
  if (entry.kind === 'transportation')
    router.push({
      pathname: '/transport/[collectionId]/[itemId]',
      params: { collectionId, itemId: entry.transport.id },
    });
  else if (entry.kind === 'lodging')
    router.push({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId: entry.lodging.id } });
  else if (entry.kind === 'location')
    router.push({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: entry.location.id } });
  else openNote(collectionId, entry.kind === 'note' ? entry.note.id : entry.checklist.id);
}

/** Note or checklist detail (one screen for both; ids are unique UUIDs). */
export function openNote(collectionId: string, itemId: string) {
  router.push({ pathname: '/note/[collectionId]/[itemId]', params: { collectionId, itemId } });
}

/** `3 von 5 erledigt` */
export function checklistProgress(c: Checklist): string {
  if (c.items.length === 0) return tr('entries.emptyList');
  return tr('common.doneOfTotalDone', { done: c.items.filter((i) => i.is_checked).length, total: c.items.length });
}

/** First line of a note's text, or its first link's host. */
export function noteSubtitle(n: Note): string | undefined {
  const text = n.content
    ?.split('\n')
    .map((l) =>
      l
        .replace(/^[#>*\-\s]+/, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]+/g, '')
        .trim(),
    )
    .find(Boolean);
  if (text) return text;
  const link = n.links?.[0];
  return link ? link.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0] : undefined;
}

export function openLodging(collectionId: string, lodgingId: string) {
  router.push({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId: lodgingId } });
}

/** One itinerary entry as a native list row (a ListItem element, see rows.tsx). Opens the detail unless `onPress` is given. */
export function entryRow(
  t: RowTheme,
  entry: DayEntry,
  view: CollectionView,
  day: string,
  onPress?: (entry: DayEntry) => void,
): ReactElement {
  const collectionId = view.collection.id;
  const press = () => (onPress ? onPress(entry) : openEntryDetail(collectionId, entry));
  if (entry.kind === 'transportation') {
    return (
      <ListItem
        key={entry.key}
        colors={t.listColors}
        leading={leadingFor(entry.transport.images, <RowIcon name={transportIcon(entry.transport.type)} />)}
        supportingText={<Sub>{transportSubtitle(entry.transport, view.timeZone)}</Sub>}
        onPress={press}>
        {transportTitle(entry.transport)}
      </ListItem>
    );
  }
  if (entry.kind === 'lodging') {
    return (
      <ListItem
        key={entry.key}
        colors={t.listColors}
        leading={leadingFor(entry.lodging.images, <RowIcon name="lodging" />)}
        supportingText={<Sub>{lodgingSubtitle(entry.lodging, day, view.timeZone)}</Sub>}
        onPress={press}>
        {entry.lodging.name}
      </ListItem>
    );
  }
  if (entry.kind === 'note') {
    const sub = noteSubtitle(entry.note);
    return (
      <ListItem
        key={entry.key}
        colors={t.listColors}
        leading={<RowIcon name="note" />}
        supportingText={sub ? <Sub>{sub}</Sub> : undefined}
        onPress={press}>
        {entry.note.name}
      </ListItem>
    );
  }
  if (entry.kind === 'checklist') {
    return (
      <ListItem
        key={entry.key}
        colors={t.listColors}
        leading={<RowIcon name="checklist" />}
        supportingText={<Sub>{checklistProgress(entry.checklist)}</Sub>}
        onPress={press}>
        {entry.checklist.name}
      </ListItem>
    );
  }
  const loc = entry.location;
  const time = entry.startUtc ? formatTime(entry.startUtc, view.timeZone) : null;
  const category = loc.category
    ? `${loc.category.icon ?? ''} ${loc.category.display_name ?? loc.category.name}`.trim()
    : null;
  return (
    <ListItem
      key={entry.key}
      colors={t.listColors}
      leading={leadingFor(loc.images, <RowIcon name="location" />)}
      supportingText={<Sub>{[time, category, loc.location].filter(Boolean).join(' · ') || undefined}</Sub>}
      onPress={press}>
      {loc.name}
    </ListItem>
  );
}
