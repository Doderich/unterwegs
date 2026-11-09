import { ListItem } from '@expo/ui';
import { router } from 'expo-router';

import type { ReactElement } from 'react';

import type { Checklist, Lodging, Note, Transportation } from '@/api/schemas';
import type { Day, DayEntry, CollectionView } from '@/data/selectors';
import { categoryLabel } from '@/data/categories';
import { transportTitle } from '@/data/transportName';
import { tr } from '@/i18n';
import { arrivalZone, departureZone, lodgingZone } from '@/time/ownZone';
import { formatDateTime, formatSpan, formatTime, localDate, zoned } from '@/time/tz';

import { lodgingLabel, transportIcon, transportLabel } from './icons';
import { RowIcon, type RowTheme } from './rows';
import { staySubtitle } from './stay';
import { photoListItem } from './PhotoListItem';
import { Sub } from './Sub';

/** `14:00 Deutschland → 10:45 (+1) · Flug LH716` */
export function transportSubtitle(t: Transportation, collectionZone: string): string {
  const start = t.date ? zoned(t.date, departureZone(t, collectionZone), collectionZone) : null;
  const end = t.end_date ? zoned(t.end_date, arrivalZone(t, collectionZone), collectionZone) : null;
  const label = [transportLabel(t.type), t.flight_number].filter(Boolean).join(' ');
  return [start ? formatSpan(start, end) : null, label].filter(Boolean).join(' · ');
}

export function lodgingSubtitle(l: Lodging, day: string | null, collectionZone: string): string {
  const tz = lodgingZone(l, collectionZone);
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
  return photoListItem({
    key: `night-${lodging.id}`,
    colors: t.listColors,
    images: lodging.images,
    icon: <RowIcon name="lodging" />,
    title: lodging.name,
    subtitle: staySubtitle(lodging, day.date, view.timeZone),
    onPress: () => openLodging(view.collection.id, lodging.id),
  });
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
    return photoListItem({
      key: entry.key,
      colors: t.listColors,
      images: entry.transport.images,
      icon: <RowIcon name={transportIcon(entry.transport.type)} />,
      title: transportTitle(entry.transport),
      subtitle: transportSubtitle(entry.transport, view.timeZone),
      onPress: press,
    });
  }
  if (entry.kind === 'lodging') {
    return photoListItem({
      key: entry.key,
      colors: t.listColors,
      images: entry.lodging.images,
      icon: <RowIcon name="lodging" />,
      title: entry.lodging.name,
      subtitle: lodgingSubtitle(entry.lodging, day, view.timeZone),
      onPress: press,
    });
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
  const category = loc.category ? categoryLabel(loc.category) : null;
  return photoListItem({
    key: entry.key,
    colors: t.listColors,
    images: loc.images,
    icon: <RowIcon name="location" />,
    title: loc.name,
    subtitle: [time, category, loc.location].filter(Boolean).join(' · ') || null,
    onPress: press,
  });
}
