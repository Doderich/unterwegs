import type { Collection } from '@/api/schemas';

import type { Fields } from './types';

/**
 * Things that live inside a place, stay or connection: visits and trails (places), activities (inside a visit), and
 * attachments and images (any of the three). The outbox edits them by id wherever they are.
 */
export type ChildKind = 'visit' | 'trail' | 'activity' | 'attachment' | 'image';

type ListKey = 'visits' | 'trails' | 'attachments' | 'images';
const LIST: Record<Exclude<ChildKind, 'activity'>, ListKey> = {
  visit: 'visits',
  trail: 'trails',
  attachment: 'attachments',
  image: 'images',
};

type Owner = Fields & { id: string };

function owners(c: Collection): Owner[] {
  return [...c.locations, ...c.lodging, ...c.transportations] as unknown as Owner[];
}

function mapOwners(c: Collection, fn: (owner: Owner) => Owner): Collection {
  const map = <T>(list: T[]) => list.map((o) => fn(o as unknown as Owner)) as unknown as T[];
  return { ...c, locations: map(c.locations), lodging: map(c.lodging), transportations: map(c.transportations) };
}

const listOf = (owner: Fields, key: string): Owner[] => (Array.isArray(owner[key]) ? (owner[key] as Owner[]) : []);

/** The child with `id`, and the id of what it hangs on (the visit for an activity, else the place/stay/connection). */
export function findChild(c: Collection, kind: ChildKind, id: string): { child: Owner; parentId: string } | undefined {
  for (const owner of owners(c)) {
    if (kind === 'activity') {
      for (const visit of listOf(owner, 'visits')) {
        const child = listOf(visit, 'activities').find((a) => a.id === id);
        if (child) return { child, parentId: visit.id };
      }
    } else {
      const child = listOf(owner, LIST[kind]).find((x) => x.id === id);
      if (child) return { child, parentId: owner.id };
    }
  }
  return undefined;
}

/** Does `parentId` (a place, stay or connection; a visit for activities) exist? */
export function hasParent(c: Collection, kind: ChildKind, parentId: string): boolean {
  if (kind !== 'activity') return owners(c).some((o) => o.id === parentId);
  return owners(c).some((o) => listOf(o, 'visits').some((v) => v.id === parentId));
}

/** The children under `parentId`. */
export function childrenOf(c: Collection, kind: ChildKind, parentId: string): Owner[] {
  if (kind === 'activity') {
    for (const o of owners(c)) {
      const visit = listOf(o, 'visits').find((v) => v.id === parentId);
      if (visit) return listOf(visit, 'activities');
    }
    return [];
  }
  return listOf(owners(c).find((o) => o.id === parentId) ?? {}, LIST[kind]);
}

/** Replaces the child with `id` by `fn(child)`, or removes it when `fn` returns null. */
export function mapChild(c: Collection, kind: ChildKind, id: string, fn: (child: Owner) => Owner | null): Collection {
  const edit = (list: Owner[]) => list.flatMap((x) => (x.id === id ? (fn(x) ?? []) : [x]));
  if (kind === 'activity')
    return mapOwners(c, (o) =>
      Array.isArray(o.visits)
        ? { ...o, visits: listOf(o, 'visits').map((v) => ({ ...v, activities: edit(listOf(v, 'activities')) })) }
        : o,
    );
  const key = LIST[kind];
  return mapOwners(c, (o) => (Array.isArray(o[key]) ? { ...o, [key]: edit(listOf(o, key)) } : o));
}

/** Adds `child` under `parentId` (replacing one with the same id). */
export function addChild(c: Collection, kind: ChildKind, parentId: string, child: Owner): Collection {
  const add = (list: Owner[]) => [...list.filter((x) => x.id !== child.id), child];
  if (kind === 'activity')
    return mapOwners(c, (o) =>
      Array.isArray(o.visits)
        ? {
            ...o,
            visits: listOf(o, 'visits').map((v) =>
              v.id === parentId ? { ...v, activities: add(listOf(v, 'activities')) } : v,
            ),
          }
        : o,
    );
  const key = LIST[kind];
  return mapOwners(c, (o) => (o.id === parentId ? { ...o, [key]: add(listOf(o, key)) } : o));
}
