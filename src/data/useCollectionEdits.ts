import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  ApiError,
  type CollectionInput,
  type LocationInput,
  type LodgingInput,
  type MediaOwnerKind,
  type NoteInput,
  type ActivityInput,
  type QuickAddInput,
  type TrailInput,
  type TransportationInput,
  type UploadFile,
  type VisitInput,
} from '@/api/client';
import type { Checklist, Location, Collection } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';
import { celebrate } from '@/ui/celebrate';
import { shrinkImageFile } from '@/ui/media';

import { importWebImage } from './webImageImport';
import { todayIn } from '@/time/today';

import { moveWithinDay, tempId, withImage, withLocationObject, withLodging, type OrderUpdate } from './edits';
import {
  editOf,
  enqueue,
  findChild,
  findObject,
  keepForUpload,
  type ChecklistChange,
  type ChildKind,
  type EditableChild,
  type Fields,
  type NewOp,
  type ObjectKind,
  type PlanKind,
} from './outbox';
import { patch, reportWriteFailure, useOnline, writeOnline } from './onlineWrite';
import { queryKeys } from './queries';
import { isMember, locationZone, type DayEntry, type Day, type CollectionView } from './selectors';
import { readsAffectedBy } from './affected';

/** Edits that only make sense with the server at hand: they look something up or let the server compute. */
const ONLINE_ONLY = new Set(['quickAdd', 'importImage', 'autoGenerateItinerary']);

/**
 * Every edit of one collection's content, through one interface. Most go through the outbox (ADR 0016): saved on
 * the phone at once, shown through the collection overlay, sent now or when the connection is back. The few in
 * `ONLINE_ONLY` are online writes. Screens don't choose: they ask `can(action)` and call the action. Actions resolve
 * to their (pending) result, or `null` when refused or failed (already reported).
 */
export function useCollectionEdits(view: CollectionView | null) {
  const client = useClient();
  const queryClient = useQueryClient();
  const online = useOnline();
  const collectionId = view?.collection.id ?? '';
  const canEdit = !view || isMember(view.collection);

  return useMemo(() => {
    const key = queryKeys.collection(collectionId);

    /** An online write on this collection: optimistic patch, rollback on failure, refetch afterwards. */
    function run<R>(
      optimistic: ((t: Collection) => Collection) | null,
      request: () => Promise<R>,
      confirmed?: (t: Collection, result: R) => Collection,
    ): Promise<R | null> {
      return writeOnline(queryClient, online, {
        request,
        optimistic: optimistic ? [patch(key, optimistic)] : [],
        confirmed: confirmed
          ? (result) => {
              const current = queryClient.getQueryData<Collection>(key);
              if (current) queryClient.setQueryData(key, confirmed(current, result));
            }
          : undefined,
        refetch: readsAffectedBy({ collection: collectionId }),
        forbidden: tr('useCollectionEdits.youreNotAllowedEditTrip'),
      });
    }

    /**
     * Edits that work offline go through the outbox (ADR 0016): saved on the phone at once, shown through the
     * collection overlay, sent now or when the connection is back. Resolves like `run`: the (pending) result, or
     * `null` when the collection can't be edited by this user.
     */
    function queue<R>(op: NewOp, result: R): Promise<R | null> {
      if (!canEdit) {
        reportWriteFailure(new ApiError('forbidden', 403, ''), tr('useCollectionEdits.youreNotAllowedEditTrip'));
        return Promise.resolve(null);
      }
      enqueue(op);
      return Promise.resolve(result);
    }

    const changeChecklist = (checklist: Checklist, change: ChecklistChange) =>
      queue({ type: 'checklist', collectionId, checklistId: checklist.id, change }, true);

    /** A day's entries in a new order (ids from `moveWithinDay`). */
    const reorder = (date: string, updates: OrderUpdate[] | null) =>
      updates
        ? queue({ type: 'reorderDay', collectionId, date, order: updates.map((u) => u.id) }, true)
        : Promise.resolve(null);

    const addToDay = (date: string, kind: DayEntry['kind'], objectId: string) =>
      queue({ type: 'addToDay', collectionId, date, contentType: kind, objectId }, true);

    /** The server's version of an object, as last read (not the overlay): what an offline edit starts from. */
    const serverObject = (kind: ObjectKind, id: string): Fields => {
      const saved = queryClient.getQueryData<Collection>(key);
      return (saved && findObject(saved, kind, id)) ?? {};
    };

    /** An object as the screen shows it: the server's version with the waiting edits laid over it. */
    const shownObject = (kind: ObjectKind, id: string): Fields => (view && findObject(view.collection, kind, id)) ?? {};
    const shownChild = (kind: ChildKind, id: string): Fields =>
      (view && findChild(view.collection, kind, id)?.child) ?? {};

    /** The server's version of a visit, trail, activity or attachment, as last read. */
    const serverChild = (kind: ChildKind, id: string): Fields => {
      const saved = queryClient.getQueryData<Collection>(key);
      return (saved && findChild(saved, kind, id)?.child) ?? {};
    };

    /** Create (`id` null) or update a visit, trail, activity or attachment, through the outbox. */
    const saveChild = <R>(
      kind: EditableChild,
      parentId: string,
      id: string | null,
      input: Fields,
      result: (id: string) => R,
      extra: { ownerKind?: ObjectKind; file?: UploadFile } = {},
    ) => {
      if (id) {
        const { patch, base } = editOf(shownChild(kind, id), serverChild(kind, id), input);
        if (Object.keys(patch).length === 0) return Promise.resolve(result(id));
        return queue({ type: 'updateChild', collectionId, childKind: kind, childId: id, patch, base }, result(id));
      }
      const created = tempId();
      return queue(
        { type: 'createChild', collectionId, childKind: kind, parentId, tempId: created, input, ...extra },
        result(created),
      );
    };

    /** Create (id null; put on `onDay` when given) or update a stay, connection or place, through the outbox. */
    const saveObject = (kind: ObjectKind, id: string | null, input: Fields, onDay?: string) => {
      if (id) {
        const { patch, base } = editOf(shownObject(kind, id), serverObject(kind, id), input);
        if (Object.keys(patch).length === 0) return Promise.resolve({ id, ...input });
        return queue(
          { type: 'updateObject', collectionId, objectKind: kind, objectId: id, patch, base },
          { id, ...input },
        );
      }
      const created = tempId();
      const result = queue(
        { type: 'createObject', collectionId, objectKind: kind, tempId: created, input },
        {
          id: created,
          ...input,
        },
      );
      if (canEdit && onDay)
        enqueue({ type: 'addToDay', collectionId, date: onDay, contentType: kind, objectId: created });
      return result;
    };

    return {
      /** The user may edit this collection's content (own or shared with them), online or not. */
      canEdit,
      /** Whether `action` can be done right now: allowed, and connected when it needs the server. */
      can: (action: string): boolean => canEdit && (online || !ONLINE_ONLY.has(action)),
      collectionId,

      toggleChecklistItem: (checklist: Checklist, index: number) => {
        const item = checklist.items[index];
        const checked = !item.is_checked;
        const allDone = checked && checklist.items.every((it, i) => i === index || it.is_checked);
        // Ticking off the last item is the list's peak moment: a success tap instead of the plain selection one.
        if (allDone) {
          haptics.success();
          celebrate(tr('celebration.checklistDone'));
        } else haptics.selection();
        return changeChecklist(checklist, { kind: 'toggle', itemId: item.id, name: item.name, checked });
      },
      addChecklistItem: (checklist: Checklist, name: string) =>
        changeChecklist(checklist, { kind: 'add', itemId: tempId(), name: name.trim() }),
      removeChecklistItem: (checklist: Checklist, index: number) =>
        changeChecklist(checklist, {
          kind: 'remove',
          itemId: checklist.items[index].id,
          name: checklist.items[index].name,
        }),
      renameChecklist: (checklist: Checklist, name: string) =>
        changeChecklist(checklist, { kind: 'rename', name: name.trim() }),

      createChecklist: async (name: string, date: string | null) => {
        const id = tempId();
        const created = await queue(
          { type: 'createChecklist', collectionId, tempId: id, name, date },
          {
            id,
            name,
            date,
            items: [] as Checklist['items'],
          },
        );
        if (created && date) enqueue({ type: 'addToDay', collectionId, date, contentType: 'checklist', objectId: id });
        return created;
      },

      /** Create (noteId null) or update a note. A new note made from a day is also put on that day's plan. */
      saveNote: async (noteId: string | null, input: NoteInput, onDay?: string) => {
        if (noteId) {
          // The version this edit starts from; a different one on the server at send time means a conflict.
          const base = queryClient.getQueryData<Collection>(key)?.notes.find((n) => n.id === noteId)?.updated_at;
          return queue(
            { type: 'updateNote', collectionId, noteId, baseUpdatedAt: base ?? null, input },
            { id: noteId },
          );
        }
        const id = tempId();
        const created = await queue({ type: 'createNote', collectionId, tempId: id, input }, { id, ...input });
        if (created && onDay)
          enqueue({ type: 'addToDay', collectionId, date: onDay, contentType: 'note', objectId: id });
        return created;
      },

      /**
       * Copies a location into this collection (with its photos, without visits and attachments) and names it
       * "… (Kopie)". When only the renaming fails, the copy keeps the server's "Copy of …".
       */
      duplicateLocation: (location: Location) => {
        const id = tempId();
        const name = tr('common.nameCopy', { name: location.name });
        return queue(
          { type: 'duplicateLocation', collectionId, locationId: location.id, tempId: id, name },
          {
            ...location,
            id,
            name,
          },
        );
      },

      /** Deletes the object; the server also removes its itinerary items (and for locations its visits). */
      deleteObject: (kind: PlanKind, id: string) =>
        queue({ type: 'deleteObject', collectionId, objectKind: kind, objectId: id }, true),

      renameChecklistItem: (checklist: Checklist, index: number, name: string) =>
        changeChecklist(checklist, {
          kind: 'renameItem',
          itemId: checklist.items[index].id,
          from: checklist.items[index].name,
          name: name.trim(),
        }),

      /** Create (`visitId` null) or update a visit. */
      saveVisit: (location: Location, visitId: string | null, input: VisitInput) =>
        saveChild('visit', location.id, visitId, input as unknown as Fields, (id) => ({ id, ...input })),

      /**
       * Create (`locationId` null; put on `onDay` when given) or update a location. Offline too; a new place asked to
       * be public is created first and made public with the next sync (the server sets it from its collections).
       */
      saveLocation: async (locationId: string | null, input: LocationInput, onDay?: string) => {
        const saved = await saveObject('location', locationId, input as unknown as Fields, onDay);
        return saved as (Fields & { id: string }) | null;
      },

      /**
       * Adds an existing location of the user (from another collection) to this one, keeping its other collections;
       * `onDay` also puts it on that day's plan.
       */
      linkLocation: async (locationId: string, onDay?: string) => {
        // Shown from the place library on the phone until the server has it in this collection.
        const known = queryClient.getQueryData<Location[]>(queryKeys.locations)?.find((l) => l.id === locationId);
        const linked = await queue(
          {
            type: 'linkLocation',
            collectionId,
            locationId,
            snapshot: (known ?? { name: '' }) as unknown as Fields,
          },
          { id: locationId },
        );
        if (linked && onDay) await addToDay(onDay, 'location', locationId);
        return linked;
      },

      saveTrail: (locationId: string, trailId: string | null, input: TrailInput) =>
        saveChild('trail', locationId, trailId, input as Fields, (id) => ({ id, ...input })),
      deleteTrail: (trailId: string) =>
        queue({ type: 'deleteChild', collectionId, childKind: 'trail', childId: trailId }, true),
      /** A GPX file waits in the app's documents like a photo. */
      saveActivity: async (visitId: string, activityId: string | null, input: ActivityInput, gpx?: UploadFile) =>
        saveChild('activity', visitId, activityId, input as unknown as Fields, (id) => ({ id, ...input }), {
          file: gpx && !activityId ? await keepForUpload(gpx) : undefined,
        }),
      deleteActivity: (activityId: string) =>
        queue({ type: 'deleteChild', collectionId, childKind: 'activity', childId: activityId }, true),

      /** A location or lodging from a found place, in one server call (address, photos, type). */
      quickAdd: (kind: 'location' | 'lodging', input: Omit<QuickAddInput, 'collection_id'>) =>
        kind === 'location'
          ? run(
              null,
              () => client.edit.quickAddLocation({ ...input, collection_id: collectionId }),
              (t, saved) => withLocationObject(t, saved),
            )
          : run(
              null,
              () => client.edit.quickAddLodging({ ...input, collection_id: collectionId }),
              (t, saved) => withLodging(t, saved),
            ),

      saveLodging: (lodgingId: string | null, input: Partial<LodgingInput> & { name: string }) =>
        saveObject('lodging', lodgingId, input as Fields) as Promise<(Fields & { id: string }) | null>,

      saveTransportation: (
        transportationId: string | null,
        input: Partial<TransportationInput> & { name: string; type: string },
      ) => saveObject('transportation', transportationId, input as Fields) as Promise<(Fields & { id: string }) | null>,

      /**
       * Adds one photo, offline too: a copy of the file waits in the app's documents and shows at once; after the
       * upload it goes into the offline cache under the server's URL.
       */
      uploadImage: async (kind: MediaOwnerKind, objectId: string, file: UploadFile) => {
        const kept = await keepForUpload(file);
        const id = tempId();
        return queue(
          { type: 'uploadImage', collectionId, ownerKind: kind, objectId, tempId: id, file: kept },
          {
            id,
            image: kept.uri,
            is_primary: false,
          },
        );
      },
      /** Fills the empty day plan from dates on the server; the refetch brings the new items. */
      autoGenerateItinerary: () => run(null, () => client.edit.autoGenerateItinerary(collectionId)),

      /**
       * An image from a public address (Wikipedia, a typed link), downloaded by the server, or by the phone when the
       * server can't (`webImageImport.ts`).
       */
      importImage: (kind: MediaOwnerKind, objectId: string, url: string, source: 'wikipedia' | 'url') =>
        run(
          null,
          () => importWebImage(client, kind, objectId, url, source, { prepare: shrinkImageFile }),
          (t, result) => result.created.reduce((acc, image) => withImage(acc, objectId, image), t),
        ),
      setPrimaryImage: (imageId: string) => queue({ type: 'setPrimaryImage', collectionId, imageId }, true),
      deleteImage: (imageId: string) =>
        queue({ type: 'deleteChild', collectionId, childKind: 'image', childId: imageId }, true),
      /** A file attached offline waits in the app's documents and shows at once; it opens from there meanwhile. */
      uploadAttachment: async (kind: MediaOwnerKind, objectId: string, file: UploadFile, name?: string) => {
        const kept = await keepForUpload(file);
        const id = tempId();
        return queue(
          {
            type: 'createChild',
            collectionId,
            childKind: 'attachment',
            parentId: objectId,
            ownerKind: kind,
            tempId: id,
            input: name ? { name } : {},
            file: kept,
          },
          { id, file: kept.uri, name: name ?? file.name, extension: null },
        );
      },
      renameAttachment: (attachmentId: string, name: string) =>
        saveChild('attachment', '', attachmentId, { name }, () => true),
      deleteAttachment: (attachmentId: string) =>
        queue({ type: 'deleteChild', collectionId, childKind: 'attachment', childId: attachmentId }, true),

      /**
       * Owner only. New dates drop itinerary items and days outside them (the screen asks first). Offline too: only
       * the changed fields are sent, field by field like everything else.
       */
      saveCollection: (fields: Partial<CollectionInput>) => {
        const saved = queryClient.getQueryData<Collection>(key);
        const { patch, base } = editOf(
          (view?.collection ?? {}) as unknown as Fields,
          (saved ?? {}) as unknown as Fields,
          fields as Fields,
        );
        if (Object.keys(patch).length === 0) return Promise.resolve(true);
        return queue({ type: 'saveCollection', collectionId, patch, base }, true);
      },
      setCover: (imageId: string) =>
        queue(
          {
            type: 'saveCollection',
            collectionId,
            patch: { primary_image_id: imageId },
            base: { primary_image_id: queryClient.getQueryData<Collection>(key)?.primary_image?.id ?? null },
          },
          true,
        ),

      saveDay: (date: string, name: string, description: string) => {
        const existing = queryClient.getQueryData<Collection>(key)?.itinerary_days.find((d) => d.date === date);
        const shown = view?.collection.itinerary_days.find((d) => d.date === date);
        const { patch, base } = editOf((shown ?? {}) as Fields, (existing ?? {}) as Fields, { name, description });
        if (shown && Object.keys(patch).length === 0) return Promise.resolve(true);
        return queue(
          { type: 'saveDay', collectionId, date, patch: shown ? patch : { name, description }, base },
          true,
        );
      },

      moveEntry: (day: Day, entry: DayEntry, direction: -1 | 1) =>
        entry.itineraryId ? reorder(day.date, moveWithinDay(day, entry.itineraryId, direction)) : Promise.resolve(null),
      moveEntryToDay: (target: Day, entry: DayEntry) =>
        entry.itineraryId
          ? queue({ type: 'moveToDay', collectionId, itemId: entry.itineraryId, date: target.date }, true)
          : Promise.resolve(null),
      removeEntry: (entry: DayEntry) =>
        entry.itineraryId
          ? queue({ type: 'removeFromDay', collectionId, itemId: entry.itineraryId }, true)
          : Promise.resolve(null),
      addToDay,

      /** All-day visit today in the location's own zone, stored like the website: midnight UTC of the date. */
      addVisitToday: (location: Location) => {
        const timeZone = view ? locationZone(view, location) : 'UTC';
        const date = `${todayIn(timeZone)}T00:00:00Z`;
        return queue(
          { type: 'visitToday', collectionId, tempId: tempId(), locationId: location.id, date, timezone: timeZone },
          true,
        );
      },
      deleteVisit: (visitId: string) =>
        queue({ type: 'deleteChild', collectionId, childKind: 'visit', childId: visitId }, true),
      rate: (location: Location, rating: number | null) =>
        queue({ type: 'rate', collectionId, locationId: location.id, rating }, true),
    };
  }, [client, queryClient, online, canEdit, collectionId, view]);
}

export type CollectionEdits = ReturnType<typeof useCollectionEdits>;
