import { Alert } from 'react-native';

import {
  entryObjectId,
  entryTitle,
  unscheduled,
  type CollectionView,
  type Day,
  type DayEntry,
} from '@/data/selectors';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { transportTitle } from '@/data/transportName';
import { tr } from '@/i18n';
import { formatDayLabel } from '@/time/tz';

import type { SheetAction } from './ActionSheet';
import { openEntryDetail, openNote } from './entries';
import { transportIcon } from './icons';

/** `Day 3 · Thu, 05.11.`, and ` · Today` when this Day is today. */
export function dayLabel(day: { number: number; date: string }, options?: { today?: boolean }): string {
  const label = `${tr('common.dayN', { n: day.number })} · ${formatDayLabel(day.date)}`;
  return options?.today ? `${label} · ${tr('common.today')}` : label;
}

/** The Days heading: day label, today, then the Day's own name. */
export function dayHeading(day: { number: number; date: string; name: string | null }, isToday: boolean): string {
  return [dayLabel(day), isToday ? tr('common.today') : null, day.name].filter(Boolean).join(' · ');
}

/** One sheet row per Day. `except` drops the Day something is already on. The Day name is the hint. */
export function dayChoices<T extends { number: number; date: string; name: string | null }>(
  days: T[],
  onPick: (day: T) => void,
  options?: { except?: string },
): SheetAction[] {
  return days
    .filter((d) => d.date !== options?.except)
    .map((d) => ({
      label: dayLabel(d),
      hint: d.name ?? undefined,
      onPress: () => onPick(d),
    }));
}

/**
 * What a tap on a Day's row can do. A Dated item is not an Itinerary item: a Note or Checklist can join the plan,
 * a Transportation cannot be moved here. An Itinerary item can move within the Day, to another Day, or off the Day.
 * Removing it leaves the object in the Collection.
 */
export function entryActions(
  view: CollectionView,
  day: Day,
  entry: DayEntry,
  edits: CollectionEdits,
  open: (title: string, actions: SheetAction[]) => void,
): SheetAction[] {
  const openAction: SheetAction = {
    label: tr('common.open'),
    icon: 'chevron',
    onPress: () =>
      entry.kind === 'note' || entry.kind === 'checklist'
        ? openNote(view.collection.id, entryObjectId(entry))
        : openEntryDetail(view.collection.id, entry),
  };
  if (!entry.itineraryId) {
    const byDate = entry.kind === 'note' || entry.kind === 'checklist';
    return [
      byDate
        ? {
            label: tr('dayEdit.addPlan'),
            hint: tr('dayEdit.onlyShownHereBecauseOf'),
            icon: 'addToPlan',
            onPress: () => edits.addToDay(day.date, entry.kind, entryObjectId(entry)),
          }
        : {
            label: tr('dayEdit.placedInPlanByTimes'),
            hint: tr('dayEdit.canOnlyMovedOnWebsite'),
            icon: 'time',
            disabled: true,
            onPress: () => undefined,
          },
      openAction,
    ];
  }

  const planned = day.entries.filter((e) => e.itineraryId);
  const index = planned.findIndex((e) => e.key === entry.key);
  return [
    openAction,
    ...(index > 0
      ? [{ label: tr('dayEdit.moveUp'), icon: 'up' as const, onPress: () => edits.moveEntry(day, entry, -1) }]
      : []),
    ...(index < planned.length - 1
      ? [{ label: tr('dayEdit.moveDown'), icon: 'down' as const, onPress: () => edits.moveEntry(day, entry, 1) }]
      : []),
    {
      label: tr('dayEdit.moveAnotherDay'),
      icon: 'moveDay',
      onPress: () => {
        open(
          tr('common.whichDayConfirm'),
          dayChoices(view.days, (d) => edits.moveEntryToDay(d, entry), { except: day.date }),
        );
        return false;
      },
    },
    {
      label: tr('dayEdit.removeFromDay'),
      icon: 'remove',
      hint: entry.kind === 'location' ? tr('dayEdit.placeStaysInTripVisit') : tr('dayEdit.staysInTripJustNot'),
      destructive: true,
      onPress: () =>
        Alert.alert(tr('dayEdit.removeNameFromDayConfirm', { name: entryTitle(entry) }), undefined, [
          { text: tr('common.cancel'), style: 'cancel' },
          { text: tr('common.remove'), style: 'destructive', onPress: () => void edits.removeEntry(entry) },
        ]),
    },
  ];
}

/** Collection items not on this day yet: those on no day at all first, then locations, lodging, and the rest. */
export function addActions(view: CollectionView, day: Day, edits: CollectionEdits): SheetAction[] {
  const onDay = new Set(day.entries.map(entryObjectId));
  const t = view.collection;
  const add = (kind: DayEntry['kind'], id: string) => () => edits.addToDay(day.date, kind, id);
  const open = unscheduled(view);
  const openIds = new Set(open.map((u) => u.id));
  const firstOpen: SheetAction[] = open.map((u) => ({
    label: u.title,
    hint: tr('common.notPlannedYet'),
    icon: u.kind,
    onPress: add(u.kind, u.id),
  }));
  const actions: SheetAction[] = [
    ...firstOpen,
    ...t.locations
      .filter((l) => !onDay.has(l.id) && !openIds.has(l.id))
      .map((l) => ({
        label: l.name,
        hint: l.category?.display_name ?? l.location ?? undefined,
        icon: 'location' as const,
        onPress: add('location', l.id),
      })),
    ...t.lodging
      .filter((l) => !onDay.has(l.id) && !openIds.has(l.id))
      .map((l) => ({
        label: l.name,
        hint: l.location ?? undefined,
        icon: 'lodging' as const,
        onPress: add('lodging', l.id),
      })),
    ...t.transportations
      .filter((x) => !onDay.has(x.id))
      .map((x) => ({ label: transportTitle(x), icon: transportIcon(x.type), onPress: add('transportation', x.id) })),
    ...t.notes
      .filter((n) => !onDay.has(n.id) && !openIds.has(n.id))
      .map((n) => ({ label: n.name, icon: 'note' as const, onPress: add('note', n.id) })),
    ...t.checklists
      .filter((c) => !onDay.has(c.id) && !openIds.has(c.id))
      .map((c) => ({ label: c.name, icon: 'checklist' as const, onPress: add('checklist', c.id) })),
  ];
  return actions.length > 0
    ? actions
    : [{ label: tr('dayEdit.everythingFromTripAlreadyOn'), disabled: true, onPress: () => undefined }];
}
