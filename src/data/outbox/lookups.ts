import type { Checklist, Collection, Location, Lodging, Transportation } from '@/api/schemas';

import { withLocationObject, withLodging, withTransportation } from '../edits';
import { same } from './fields';
import type { ChecklistChange, Fields, ObjectKind, PlanKind } from './types';

/** Finding and replacing things inside one collection response (ADR 0001), shared by the edit kinds. */

export function objectsOf(collection: Collection, kind: ObjectKind): { id: string }[] {
  if (kind === 'lodging') return collection.lodging;
  if (kind === 'transportation') return collection.transportations;
  return collection.locations;
}

export function findObject(collection: Collection, kind: PlanKind, id: string): Fields | undefined {
  const list =
    kind === 'note' ? collection.notes : kind === 'checklist' ? collection.checklists : objectsOf(collection, kind);
  return list.find((o) => o.id === id) as Fields | undefined;
}

export function withObject(collection: Collection, kind: ObjectKind, object: Fields): Collection {
  if (kind === 'lodging') return withLodging(collection, object as unknown as Lodging);
  if (kind === 'transportation') return withTransportation(collection, object as unknown as Transportation);
  return withLocationObject(collection, object as unknown as Location);
}

/** A location's `category` is sent by name but read back as an object: never laid over the shown data. */
export function shownFields(kind: ObjectKind, fields: Fields): Fields {
  if (kind !== 'location') return fields;
  const { category: _category, ...rest } = fields;
  return rest;
}

/** Something created offline that a lost answer may already have created: found by its name (and date). */
export function alreadyCreated(fresh: Collection, kind: ObjectKind, input: Fields): { id: string } | undefined {
  return (objectsOf(fresh, kind) as Fields[]).find(
    (o) =>
      o.name === input.name &&
      (input.check_in == null || same(o.check_in, input.check_in)) &&
      (input.date == null || same(o.date, input.date)),
  ) as { id: string } | undefined;
}

/** Ids of a day's itinerary items in their current order. */
export function dayItemIds(collection: Collection, date: string): string[] {
  return collection.itinerary
    .filter((i) => i.date === date && !i.is_global)
    .sort((a, b) => a.order - b.order)
    .map((i) => i.id);
}

/** `order` for the items it names, then the day's other items in their current order. */
export function orderedDay(collection: Collection, date: string, order: string[]): string[] {
  const current = dayItemIds(collection, date);
  const present = new Set(current);
  return [...order.filter((id) => present.has(id)), ...current.filter((id) => !order.includes(id))];
}

export const hasVisitOn = (collection: Collection, locationId: string, date: string) =>
  !!collection.locations
    .find((l) => l.id === locationId)
    ?.visits.some((v) => v.start_date?.slice(0, 10) === date.slice(0, 10));

/** Items are matched by id, else by name: the server re-creates item ids whenever a list is saved. */
function findItem(items: Checklist['items'], itemId: string, name: string): number {
  const byId = items.findIndex((i) => i.id === itemId);
  return byId >= 0 ? byId : items.findIndex((i) => i.name === name);
}

export function applyChecklistChange(checklist: Checklist, change: ChecklistChange): Checklist {
  const items = [...checklist.items];
  switch (change.kind) {
    case 'rename':
      return { ...checklist, name: change.name };
    case 'add':
      return items.some((i) => i.id === change.itemId)
        ? checklist
        : { ...checklist, items: [...items, { id: change.itemId, name: change.name, is_checked: false }] };
    case 'toggle': {
      const i = findItem(items, change.itemId, change.name);
      if (i >= 0) items[i] = { ...items[i], is_checked: change.checked };
      return { ...checklist, items };
    }
    case 'remove': {
      const i = findItem(items, change.itemId, change.name);
      if (i >= 0) items.splice(i, 1);
      return { ...checklist, items };
    }
    case 'renameItem': {
      const i = findItem(items, change.itemId, change.from);
      if (i >= 0) items[i] = { ...items[i], name: change.name };
      return { ...checklist, items };
    }
  }
}
