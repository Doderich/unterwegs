import type { ApiClient } from '@/api/client';
import type { Collection } from '@/api/schemas';

import {
  withChecklist,
  withCollectionFields,
  withDay,
  withImage,
  withItineraryItems,
  withLocation,
  withNote,
  withOrder,
  withoutItineraryItem,
  withoutObject,
  withPrimaryImage,
  withVisit,
} from '../edits';
import { addChild, childrenOf, findChild, hasParent, mapChild } from './children';
import { foldFields, mergeFields, same } from './fields';
import {
  alreadyCreated,
  applyChecklistChange,
  dayItemIds,
  findObject,
  hasVisitOn,
  orderedDay,
  shownFields,
  withObject,
} from './lookups';
import {
  pendingItemId,
  type ConflictTexts,
  type Fields,
  type NewOpOf,
  type OpOf,
  type OpType,
  type OutboxOp,
  type SendResult,
} from './types';

export type SendContext = { client: ApiClient; texts: ConflictTexts };

/**
 * Everything the outbox needs to know about one kind of edit, in one place. Adding a kind is one entry here; the
 * registry's type makes a missing kind a compile error.
 */
export type EditKind<T extends OpType> = {
  /** How the collection looks while the edit waits (the overlay screens show). */
  show(collection: Collection, op: OpOf<T>): Collection;
  /** Replays the edit on `fresh`, the collection as the server has it now. */
  send(ctx: SendContext, op: OpOf<T>, fresh: Collection): Promise<SendResult>;
  /** Ids the edit cannot do without; when what they name is cancelled, the edit goes too. */
  needs(op: OpOf<T>): string[];
  /** The temporary id this edit brings into being (a new object, itinerary item, image …). */
  creates?(op: OpOf<T>): string;
  /** The id this edit removes; when that was only created offline, both cancel out. */
  removes?(op: NewOpOf<T>): string;
  /**
   * After `tempId` became `id` on the server. Default: every occurrence replaced. Kinds that edit fields override it
   * to drop their `base`: an object new on the server has nothing to conflict with.
   */
  follow?(op: OpOf<T>, tempId: string, id: string): OpOf<T>;
  /** This new edit merged into `waiting` when both are about the same thing; null otherwise. */
  foldInto?(waiting: OutboxOp, op: NewOpOf<T>): OutboxOp | null;
};

/** Every string equal to `tempId` replaced by `id`: temporary ids are unique, so this is exact. */
export function replaceId<T>(value: T, tempId: string, id: string): T {
  if (value === tempId) return id as T;
  if (Array.isArray(value)) return value.map((v) => replaceId(v, tempId, id)) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceId(v, tempId, id)])) as T;
  return value;
}

const sent = (created?: { tempId: string; id: string }): SendResult => ({
  status: 'sent',
  ...(created ? { created } : {}),
});
const skipped: SendResult = { status: 'skipped' };

export const EDIT_KINDS: { [T in OpType]: EditKind<T> } = {
  checklist: {
    show: (t, op) => {
      const checklist = t.checklists.find((c) => c.id === op.checklistId);
      return checklist ? withChecklist(t, applyChecklistChange(checklist, op.change)) : t;
    },
    async send({ client }, op, fresh) {
      const checklist = fresh.checklists.find((c) => c.id === op.checklistId);
      if (!checklist) return skipped;
      const next = applyChecklistChange(checklist, op.change);
      await client.edit.updateChecklist(checklist.id, {
        collection: op.collectionId,
        name: next.name,
        items: next.items.map((i) => ({ name: i.name, is_checked: !!i.is_checked })),
      });
      return sent();
    },
    needs: (op) => [op.checklistId],
  },

  createChecklist: {
    show: (t, op) =>
      t.checklists.some((c) => c.id === op.tempId)
        ? t
        : withChecklist(t, { id: op.tempId, name: op.name, date: op.date, items: [] }),
    async send({ client }, op, fresh) {
      // A retry after a lost answer: the list may already be there.
      const existing =
        op.attempts > 0 ? fresh.checklists.find((c) => c.name === op.name && (c.date ?? null) === op.date) : null;
      const saved =
        existing ?? (await client.edit.createChecklist({ name: op.name, items: [], collection: op.collectionId }));
      return sent({ tempId: op.tempId, id: saved.id });
    },
    needs: () => [],
    creates: (op) => op.tempId,
  },

  createNote: {
    show: (t, op) => withNote(t, { id: op.tempId, ...op.input }),
    async send({ client }, op, fresh) {
      const existing =
        op.attempts > 0
          ? fresh.notes.find((n) => n.name === op.input.name && (n.content ?? '') === op.input.content)
          : null;
      const saved = existing ?? (await client.edit.createNote({ ...op.input, collection: op.collectionId }));
      return sent({ tempId: op.tempId, id: saved.id });
    },
    needs: () => [],
    creates: (op) => op.tempId,
  },

  updateNote: {
    show: (t, op) => {
      const note = t.notes.find((n) => n.id === op.noteId);
      return note ? withNote(t, { ...note, ...op.input }) : t;
    },
    async send({ client, texts }, op, fresh) {
      const note = fresh.notes.find((n) => n.id === op.noteId);
      if (!note) return skipped;
      if (op.baseUpdatedAt && note.updated_at && note.updated_at !== op.baseUpdatedAt) {
        // Someone else changed it meanwhile: keep both texts instead of overwriting theirs.
        const copyName = texts.copyName(op.input.name);
        await client.edit.createNote({ ...op.input, name: copyName, collection: op.collectionId });
        return { status: 'conflict', notice: texts.noteCopied(copyName) };
      }
      await client.edit.updateNote(op.noteId, { ...op.input, collection: op.collectionId });
      return sent();
    },
    needs: (op) => [op.noteId],
    // Written before the note existed on the server: there is nothing to conflict with.
    follow: (op, tempId, id) => (op.noteId === tempId ? { ...op, noteId: id, baseUpdatedAt: null } : op),
    foldInto: (w, op) =>
      (w.type === 'createNote' && w.tempId === op.noteId) || (w.type === 'updateNote' && w.noteId === op.noteId)
        ? { ...w, input: op.input }
        : null,
  },

  addToDay: {
    show: (t, op) =>
      t.itinerary.some((i) => i.object_id === op.objectId && i.date === op.date)
        ? t
        : withItineraryItems(t, [
            {
              id: pendingItemId(op.id),
              content_type: op.contentType,
              object_id: op.objectId,
              object_name: op.contentType,
              date: op.date,
              is_global: false,
              order: Number.MAX_SAFE_INTEGER,
            },
          ]),
    async send({ client }, op, fresh) {
      const existing = fresh.itinerary.find((i) => i.object_id === op.objectId && i.date === op.date);
      if (existing) return sent({ tempId: pendingItemId(op.id), id: existing.id });
      if (!findObject(fresh, op.contentType, op.objectId)) return skipped;
      const saved = await client.edit.addToItinerary({
        collection: op.collectionId,
        content_type: op.contentType,
        object_id: op.objectId,
        date: op.date,
        order: dayItemIds(fresh, op.date).length,
      });
      return sent({ tempId: pendingItemId(op.id), id: saved.id });
    },
    needs: (op) => [op.objectId],
    creates: (op) => pendingItemId(op.id),
  },

  visitToday: {
    show: (t, op) =>
      hasVisitOn(t, op.locationId, op.date)
        ? t
        : withVisit(
            t,
            {
              id: op.tempId,
              start_date: op.date,
              end_date: op.date,
              timezone: op.timezone,
              notes: null,
              activities: [],
            },
            op.locationId,
          ),
    async send({ client }, op, fresh) {
      if (!fresh.locations.some((l) => l.id === op.locationId)) return skipped;
      if (hasVisitOn(fresh, op.locationId, op.date)) return skipped;
      const saved = await client.edit.addVisit({
        location: op.locationId,
        start_date: op.date,
        end_date: op.date,
        timezone: op.timezone,
      });
      return sent({ tempId: op.tempId, id: saved.id });
    },
    needs: (op) => [op.locationId],
    creates: (op) => op.tempId,
  },

  rate: {
    show: (t, op) => withLocation(t, op.locationId, { rating: op.rating }),
    async send({ client }, op, fresh) {
      if (!fresh.locations.some((l) => l.id === op.locationId)) return skipped;
      await client.edit.rateLocation(op.locationId, op.rating);
      return sent();
    },
    needs: (op) => [op.locationId],
    foldInto: (w, op) => (w.type === 'rate' && w.locationId === op.locationId ? { ...w, rating: op.rating } : null),
  },

  reorderDay: {
    show: (t, op) =>
      withOrder(
        t,
        orderedDay(t, op.date, op.order).map((id, order) => ({ id, date: op.date, order })),
      ),
    async send({ client }, op, fresh) {
      // Our order for the items we knew; items someone else added meanwhile keep their place at the end.
      const ordered = orderedDay(fresh, op.date, op.order);
      if (same(ordered, dayItemIds(fresh, op.date))) return skipped;
      await client.edit.reorderItinerary(ordered.map((id, order) => ({ id, date: op.date, order })));
      return sent();
    },
    // Tolerates missing items (they are skipped), so it never depends on one.
    needs: () => [],
    foldInto: (w, op) => (w.type === 'reorderDay' && w.date === op.date ? { ...w, order: op.order } : null),
  },

  moveToDay: {
    show: (t, op) => withOrder(t, [{ id: op.itemId, date: op.date, order: Number.MAX_SAFE_INTEGER }]),
    async send({ client }, op, fresh) {
      const item = fresh.itinerary.find((i) => i.id === op.itemId);
      if (!item || item.date === op.date) return skipped;
      await client.edit.reorderItinerary([{ id: op.itemId, date: op.date, order: dayItemIds(fresh, op.date).length }]);
      return sent();
    },
    needs: (op) => [op.itemId],
  },

  removeFromDay: {
    show: (t, op) => withoutItineraryItem(t, op.itemId),
    async send({ client }, op, fresh) {
      if (!fresh.itinerary.some((i) => i.id === op.itemId)) return skipped;
      await client.edit.removeFromItinerary(op.itemId);
      return sent();
    },
    needs: (op) => [op.itemId],
    removes: (op) => op.itemId,
  },

  saveDay: {
    show: (t, op) => {
      const day = t.itinerary_days.find((d) => d.date === op.date);
      return withDay(t, {
        id: day?.id ?? `pending-day-${op.date}`,
        date: op.date,
        name: (op.patch.name as string | undefined) ?? day?.name ?? null,
        description: (op.patch.description as string | undefined) ?? day?.description ?? null,
      });
    },
    async send({ client, texts }, op, fresh) {
      const day = fresh.itinerary_days.find((d) => d.date === op.date);
      if (!day) {
        await client.edit.createDay({
          collection: op.collectionId,
          date: op.date,
          name: String(op.patch.name ?? ''),
          description: String(op.patch.description ?? ''),
        });
        return sent();
      }
      const { send, kept } = mergeFields(day as unknown as Fields, op.patch, op.base);
      if (Object.keys(send).length > 0)
        await client.edit.updateDay(day.id, {
          name: String(send.name ?? day.name ?? ''),
          description: String(send.description ?? day.description ?? ''),
        });
      return kept.length > 0 ? { status: 'conflict', notice: texts.fieldsKept(day.name || op.date) } : sent();
    },
    needs: () => [],
    foldInto: (w, op) => (w.type === 'saveDay' && w.date === op.date ? { ...w, ...foldFields(w, op) } : null),
  },

  createObject: {
    show: (t, op) =>
      findObject(t, op.objectKind, op.tempId)
        ? t
        : withObject(t, op.objectKind, {
            images: [],
            attachments: [],
            ...(op.objectKind === 'location' ? { visits: [], trails: [], collections: [op.collectionId] } : {}),
            ...shownFields(op.objectKind, op.input),
            id: op.tempId,
          }),
    async send({ client }, op, fresh) {
      const existing = op.attempts > 0 ? alreadyCreated(fresh, op.objectKind, op.input) : undefined;
      if (existing) return sent({ tempId: op.tempId, id: existing.id });
      const input = { ...op.input, collection: op.collectionId } as never;
      const saved =
        op.objectKind === 'lodging'
          ? await client.edit.createLodging(input)
          : op.objectKind === 'transportation'
            ? await client.edit.createTransportation(input)
            : await client.edit.createLocation(input);
      // The server sets a new location's `is_public` from its collections; a wanted "public" needs a second write.
      if (op.objectKind === 'location' && op.input.is_public && !(saved as { is_public?: boolean | null }).is_public)
        await client.edit.updateLocation(saved.id, { name: saved.name, is_public: true });
      return sent({ tempId: op.tempId, id: saved.id });
    },
    needs: () => [],
    creates: (op) => op.tempId,
  },

  updateObject: {
    show: (t, op) => {
      const current = findObject(t, op.objectKind, op.objectId);
      return current ? withObject(t, op.objectKind, { ...current, ...shownFields(op.objectKind, op.patch) }) : t;
    },
    async send({ client, texts }, op, fresh) {
      const current = findObject(fresh, op.objectKind, op.objectId);
      if (!current) return skipped;
      const { send, kept } = mergeFields(current, op.patch, op.base);
      if (Object.keys(send).length > 0) {
        if (op.objectKind === 'location') await client.edit.updateLocation(op.objectId, send as never);
        else {
          // Name (and a transportation's type) are required on these updates: the server's when we didn't change them.
          const body = {
            name: current.name,
            ...(op.objectKind === 'transportation' ? { type: current.type } : {}),
            ...send,
            collection: op.collectionId,
          } as never;
          if (op.objectKind === 'lodging') await client.edit.updateLodging(op.objectId, body);
          else await client.edit.updateTransportation(op.objectId, body);
        }
      }
      return kept.length > 0 ? { status: 'conflict', notice: texts.fieldsKept(String(current.name)) } : sent();
    },
    needs: (op) => [op.objectId],
    follow: (op, tempId, id) => (op.objectId === tempId ? { ...op, objectId: id, base: {} } : op),
    foldInto: (w, op) => {
      if (w.type === 'createObject' && w.tempId === op.objectId) return { ...w, input: { ...w.input, ...op.patch } };
      if (w.type === 'updateObject' && w.objectId === op.objectId) return { ...w, ...foldFields(w, op) };
      return null;
    },
  },

  deleteObject: {
    show: (t, op) => withoutObject(t, op.objectId),
    async send({ client }, op, fresh) {
      if (!findObject(fresh, op.objectKind, op.objectId)) return skipped;
      const id = op.objectId;
      switch (op.objectKind) {
        case 'note':
          await client.edit.deleteNote(id);
          break;
        case 'checklist':
          await client.edit.deleteChecklist(id);
          break;
        case 'location':
          await client.edit.deleteLocation(id);
          break;
        case 'lodging':
          await client.edit.deleteLodging(id);
          break;
        case 'transportation':
          await client.edit.deleteTransportation(id);
          break;
      }
      return sent();
    },
    needs: (op) => [op.objectId],
    removes: (op) => op.objectId,
  },

  uploadImage: {
    show: (t, op) =>
      findObject(t, op.ownerKind, op.objectId)
        ? withImage(t, op.objectId, { id: op.tempId, image: op.file.uri, is_primary: false })
        : t,
    async send({ client }, op, fresh) {
      if (!findObject(fresh, op.ownerKind, op.objectId)) return skipped;
      const image = await client.edit.uploadImage(op.ownerKind, op.objectId, op.file);
      return {
        status: 'sent',
        created: { tempId: op.tempId, id: image.id },
        uploaded: { url: image.image, localUri: op.file.uri },
      };
    },
    needs: (op) => [op.objectId],
    creates: (op) => op.tempId,
  },

  createChild: {
    show: (t, op) =>
      addChild(t, op.childKind, op.parentId, {
        ...(op.childKind === 'visit' ? { activities: [] } : {}),
        ...(op.childKind === 'attachment' && op.file ? { file: op.file.uri, name: op.file.name } : {}),
        ...op.input,
        id: op.tempId,
      }),
    async send({ client }, op, fresh) {
      if (!hasParent(fresh, op.childKind, op.parentId)) return skipped;
      if (op.attempts > 0) {
        // A retry after a lost answer: it may already be there.
        const existing = childrenOf(fresh, op.childKind, op.parentId).find((c) =>
          op.childKind === 'visit'
            ? same(c.start_date, op.input.start_date) && same(c.end_date, op.input.end_date)
            : c.name === (op.input.name ?? op.file?.name),
        );
        if (existing) return sent({ tempId: op.tempId, id: existing.id });
      }
      switch (op.childKind) {
        case 'visit': {
          const saved = await client.edit.addVisit({ ...op.input, location: op.parentId } as never);
          return sent({ tempId: op.tempId, id: saved.id });
        }
        case 'trail': {
          const saved = await client.edit.createTrail(op.parentId, op.input as never);
          return sent({ tempId: op.tempId, id: saved.id });
        }
        case 'activity': {
          const saved = await client.edit.createActivity(op.parentId, op.input as never, op.file);
          return {
            status: 'sent',
            created: { tempId: op.tempId, id: saved.id },
            ...(op.file ? { uploaded: { url: '', localUri: op.file.uri } } : {}),
          };
        }
        case 'attachment': {
          if (!op.file || !op.ownerKind) return skipped;
          const name = typeof op.input.name === 'string' ? op.input.name : undefined;
          const saved = await client.edit.uploadAttachment(op.ownerKind, op.parentId, op.file, name);
          return {
            status: 'sent',
            created: { tempId: op.tempId, id: saved.id },
            uploaded: { url: saved.file, localUri: op.file.uri },
          };
        }
      }
    },
    needs: (op) => [op.parentId],
    creates: (op) => op.tempId,
  },

  updateChild: {
    show: (t, op) => mapChild(t, op.childKind, op.childId, (child) => ({ ...child, ...op.patch })),
    async send({ client, texts }, op, fresh) {
      const found = findChild(fresh, op.childKind, op.childId);
      if (!found) return skipped;
      const { send, kept } = mergeFields(found.child, op.patch, op.base);
      if (Object.keys(send).length > 0) {
        if (op.childKind === 'visit') await client.edit.updateVisit(op.childId, send as never);
        else if (op.childKind === 'trail') await client.edit.updateTrail(op.childId, send as never);
        else if (op.childKind === 'activity') await client.edit.updateActivity(op.childId, send as never);
        else if (typeof send.name === 'string') await client.edit.renameAttachment(op.childId, send.name);
      }
      const label = String(found.child.name ?? found.child.start_date ?? '').slice(0, 40);
      return kept.length > 0 ? { status: 'conflict', notice: texts.fieldsKept(label) } : sent();
    },
    needs: (op) => [op.childId],
    follow: (op, tempId, id) => (op.childId === tempId ? { ...op, childId: id, base: {} } : op),
    foldInto: (w, op) => {
      if (w.type === 'createChild' && w.tempId === op.childId) return { ...w, input: { ...w.input, ...op.patch } };
      if (w.type === 'updateChild' && w.childId === op.childId) return { ...w, ...foldFields(w, op) };
      return null;
    },
  },

  deleteChild: {
    show: (t, op) => mapChild(t, op.childKind, op.childId, () => null),
    async send({ client }, op, fresh) {
      if (!findChild(fresh, op.childKind, op.childId)) return skipped;
      if (op.childKind === 'visit') await client.edit.deleteVisit(op.childId);
      else if (op.childKind === 'trail') await client.edit.deleteTrail(op.childId);
      else if (op.childKind === 'activity') await client.edit.deleteActivity(op.childId);
      else if (op.childKind === 'attachment') await client.edit.deleteAttachment(op.childId);
      else await client.edit.deleteImage(op.childId);
      return sent();
    },
    needs: (op) => [op.childId],
    removes: (op) => op.childId,
  },

  setPrimaryImage: {
    show: (t, op) => withPrimaryImage(t, op.imageId),
    async send({ client }, op, fresh) {
      const found = findChild(fresh, 'image', op.imageId);
      // Gone, or already the cover (the server answers 400 then).
      if (!found || found.child.is_primary) return skipped;
      await client.edit.setPrimaryImage(op.imageId);
      return sent();
    },
    needs: (op) => [op.imageId],
  },

  saveCollection: {
    show: (t, op) => {
      const { primary_image_id: cover, ...fields } = op.patch;
      const next = withCollectionFields(t, fields as Parameters<typeof withCollectionFields>[1]);
      const image = typeof cover === 'string' ? findChild(t, 'image', cover)?.child : undefined;
      return image ? { ...next, primary_image: image as unknown as Collection['primary_image'] } : next;
    },
    async send({ client, texts }, op, fresh) {
      const server = { ...(fresh as unknown as Fields), primary_image_id: fresh.primary_image?.id ?? null };
      const { send, kept } = mergeFields(server, op.patch, op.base);
      if (Object.keys(send).length > 0) await client.edit.updateCollection(op.collectionId, send as never);
      return kept.length > 0 ? { status: 'conflict', notice: texts.fieldsKept(fresh.name) } : sent();
    },
    // A cover photo still waiting to upload: the cover follows it.
    needs: (op) => (typeof op.patch.primary_image_id === 'string' ? [op.patch.primary_image_id] : []),
    foldInto: (w, op) => (w.type === 'saveCollection' ? { ...w, ...foldFields(w, op) } : null),
  },

  duplicateLocation: {
    show: (t, op) => {
      const source = findObject(t, 'location', op.locationId);
      return source && !findObject(t, 'location', op.tempId)
        ? withObject(t, 'location', {
            ...source,
            id: op.tempId,
            name: op.name,
            visits: [],
            attachments: [],
            collections: [op.collectionId],
          })
        : t;
    },
    async send({ client }, op, fresh) {
      if (!findObject(fresh, 'location', op.locationId)) return skipped;
      const existing = op.attempts > 0 ? fresh.locations.find((l) => l.name === op.name) : undefined;
      if (existing) return sent({ tempId: op.tempId, id: existing.id });
      const copy = await client.edit.duplicateLocation(op.locationId, op.collectionId);
      // Only the renaming failing leaves the server's "Copy of …"; the copy itself is there.
      await client.edit.updateLocation(copy.id, { name: op.name }).catch(() => undefined);
      return sent({ tempId: op.tempId, id: copy.id });
    },
    needs: (op) => [op.locationId],
    creates: (op) => op.tempId,
  },

  linkLocation: {
    show: (t, op) =>
      findObject(t, 'location', op.locationId)
        ? t
        : withObject(t, 'location', {
            images: [],
            attachments: [],
            visits: [],
            trails: [],
            ...op.snapshot,
            id: op.locationId,
          }),
    async send({ client }, op, fresh) {
      if (findObject(fresh, 'location', op.locationId)) return skipped;
      // Read again: its other collections may have changed, and they must all stay.
      const current = await client.getLocation(op.locationId);
      const collections = [...new Set([...(current.collections ?? []), op.collectionId])];
      await client.edit.updateLocation(op.locationId, { name: current.name, collections });
      return sent();
    },
    needs: () => [],
  },
};

/** The registry entry for `op`, typed loosely: each entry is checked against its own kind above. */
export const kindOf = (op: { type: OpType }): EditKind<any> => EDIT_KINDS[op.type];
