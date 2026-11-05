import { useQueryClient } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useMemo } from 'react';
import { Alert } from 'react-native';

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
import { requestErrorText } from '@/api/errors';
import type { Checklist, Location, Collection } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { tr } from '@/i18n';
import { seedCache } from '@/offline/fileCache';
import { haptics } from '@/settings/haptics';
import { todayIn } from '@/time/today';

import {
  moveToDay,
  moveWithinDay,
  tempId,
  withAttachment,
  withAttachmentName,
  withChecklist,
  withCollectionFields,
  withDay,
  withImage,
  withLocationObject,
  withLodging,
  withoutAttachment,
  withoutImage,
  withPrimaryImage,
  withTransportation,
  withItineraryItems,
  withLocation,
  withNote,
  withOrder,
  withoutItineraryItem,
  withoutObject,
  withoutVisit,
  withVisit,
  type OrderUpdate,
} from './edits';
import { queryKeys } from './queries';
import { isMember, locationZone, type DayEntry, type Day, type CollectionView } from './selectors';

export class OfflineError extends Error {
  constructor() {
    super(tr('common.editingNeedsInternetConnection'));
    this.name = 'OfflineError';
  }
}

export function errorText(e: unknown): string {
  if (e instanceof OfflineError) return e.message;
  if (e instanceof ApiError && e.status === 403) return tr('useCollectionEdits.youreNotAllowedEditTrip');
  return requestErrorText(e, { write: true });
}

const ITEM_KIND: Record<DayEntry['kind'], string> = {
  transportation: 'transportation',
  lodging: 'lodging',
  location: 'location',
  note: 'note',
  checklist: 'checklist',
};

/**
 * Online-only edits of one collection. Each action updates the cached collection optimistically, sends the request,
 * rolls back and shows an alert on failure, and refetches the collection afterwards.
 * Actions resolve to `null` when they failed (the alert is already shown).
 */
export function useCollectionEdits(view: CollectionView | null) {
  const client = useClient();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const online = !(network.isInternetReachable === false || network.isConnected === false);
  const collectionId = view?.collection.id ?? '';

  return useMemo(() => {
    const key = queryKeys.collection(collectionId);

    /** `confirmed`: applied to the cached collection with the server's answer, before the refetch. */
    async function run<R>(
      optimistic: ((t: Collection) => Collection) | null,
      request: () => Promise<R>,
      confirmed?: (t: Collection, result: R) => Collection,
    ): Promise<R | null> {
      try {
        if (!online) throw new OfflineError();
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData<Collection>(key);
        if (previous && optimistic) queryClient.setQueryData(key, optimistic(previous));
        try {
          const result = await request();
          if (confirmed) {
            const current = queryClient.getQueryData<Collection>(key);
            if (current) queryClient.setQueryData(key, confirmed(current, result));
          }
          return result;
        } catch (e) {
          if (previous) queryClient.setQueryData(key, previous);
          throw e;
        } finally {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), errorText(e));
        return null;
      }
    }

    const setChecklist = (checklist: Checklist, items: Checklist['items'], name = checklist.name) =>
      run(
        (t) => withChecklist(t, { ...checklist, name, items }),
        () =>
          client.edit.updateChecklist(checklist.id, {
            collection: collectionId,
            name,
            items: items.map((i) => ({ name: i.name, is_checked: !!i.is_checked })),
          }),
      );

    const reorder = (updates: OrderUpdate[] | null) =>
      updates
        ? run(
            (t) => withOrder(t, updates),
            () => client.edit.reorderItinerary(updates),
          )
        : Promise.resolve(null);

    const addToDay = async (date: string, kind: DayEntry['kind'], objectId: string) => {
      const day = view?.days.find((d) => d.date === date);
      const order = day?.entries.length ?? 0;
      const id = tempId();
      return run(
        (t) =>
          withItineraryItems(t, [
            { id, content_type: kind, object_id: objectId, object_name: kind, date, is_global: false, order },
          ]),
        () =>
          client.edit.addToItinerary({
            collection: collectionId,
            content_type: ITEM_KIND[kind],
            object_id: objectId,
            date,
            order,
          }),
      );
    };

    return {
      /** Edits are possible: online, and the collection is the user's own or shared with them. */
      online: online && (!view || isMember(view.collection)),
      collectionId,

      toggleChecklistItem: (checklist: Checklist, index: number) => {
        haptics.selection();
        return setChecklist(
          checklist,
          checklist.items.map((it, i) => (i === index ? { ...it, is_checked: !it.is_checked } : it)),
        );
      },
      addChecklistItem: (checklist: Checklist, name: string) =>
        setChecklist(checklist, [...checklist.items, { id: tempId(), name: name.trim(), is_checked: false }]),
      removeChecklistItem: (checklist: Checklist, index: number) =>
        setChecklist(
          checklist,
          checklist.items.filter((_, i) => i !== index),
        ),
      renameChecklist: (checklist: Checklist, name: string) => setChecklist(checklist, checklist.items, name.trim()),

      createChecklist: async (name: string, date: string | null) => {
        const id = tempId();
        const created = await run(
          (t) => withChecklist(t, { id, name, date, items: [] }),
          () => client.edit.createChecklist({ name, items: [], collection: collectionId }),
        );
        if (created && date) await addToDay(date, 'checklist', created.id);
        return created;
      },

      /** Create (noteId null) or update a note. A new note made from a day is also put on that day's plan. */
      saveNote: async (noteId: string | null, input: NoteInput, onDay?: string) => {
        if (noteId) {
          return run(
            (t) => {
              const prev = t.notes.find((n) => n.id === noteId);
              return prev ? withNote(t, { ...prev, ...input }) : t;
            },
            () => client.edit.updateNote(noteId, { ...input, collection: collectionId }),
          );
        }
        const id = tempId();
        const created = await run(
          (t) => withNote(t, { id, ...input }),
          () => client.edit.createNote({ ...input, collection: collectionId }),
        );
        if (created && onDay) await addToDay(onDay, 'note', created.id);
        return created;
      },

      /**
       * Copies a location into this collection (with its photos, without visits and attachments) and names it
       * "… (Kopie)". When only the renaming fails, the copy keeps the server's "Copy of …".
       */
      duplicateLocation: (location: Location) =>
        run(
          null,
          async () => {
            const copy = await client.edit.duplicateLocation(location.id, collectionId);
            const name = tr('common.nameCopy', { name: location.name });
            return client.edit.updateLocation(copy.id, { name }).catch(() => copy);
          },
          (t, saved) => withLocationObject(t, saved),
        ),

      /** Deletes the object; the server also removes its itinerary items (and for locations its visits). */
      deleteObject: (kind: 'note' | 'checklist' | 'location' | 'lodging' | 'transportation', id: string) =>
        run(
          (t) => withoutObject(t, id),
          () => {
            switch (kind) {
              case 'note':
                return client.edit.deleteNote(id);
              case 'checklist':
                return client.edit.deleteChecklist(id);
              case 'location':
                return client.edit.deleteLocation(id);
              case 'lodging':
                return client.edit.deleteLodging(id);
              case 'transportation':
                return client.edit.deleteTransportation(id);
            }
          },
        ),

      renameChecklistItem: (checklist: Checklist, index: number, name: string) =>
        setChecklist(
          checklist,
          checklist.items.map((it, i) => (i === index ? { ...it, name: name.trim() } : it)),
        ),

      /** Create (`visitId` null) or update a visit. */
      saveVisit: (location: Location, visitId: string | null, input: VisitInput) => {
        const id = visitId ?? tempId();
        return run(
          (t) => {
            const activities = location.visits.find((v) => v.id === visitId)?.activities ?? [];
            return withVisit(t, { id, activities, ...input }, location.id);
          },
          () =>
            visitId
              ? client.edit.updateVisit(visitId, input)
              : client.edit.addVisit({ location: location.id, ...input }),
          (t, saved) => withVisit(withoutVisit(t, id), saved, location.id),
        );
      },

      /** Create (`locationId` null; put on `onDay` when given) or update a location. */
      saveLocation: async (locationId: string | null, input: LocationInput, onDay?: string) => {
        if (locationId) {
          return run(
            (t) => {
              const prev = t.locations.find((l) => l.id === locationId);
              const { category: _category, ...fields } = input;
              return prev ? withLocationObject(t, { ...prev, ...fields }) : t;
            },
            () => client.edit.updateLocation(locationId, input),
            (t, saved) => withLocationObject(t, saved),
          );
        }
        const created = await run(
          null,
          async () => {
            const saved = await client.edit.createLocation({ ...input, collection: collectionId });
            // The server sets a new location's `is_public` from its collections; a wanted "public" needs a second write.
            return input.is_public && !saved.is_public
              ? client.edit.updateLocation(saved.id, { name: saved.name, is_public: true })
              : saved;
          },
          (t, saved) => withLocationObject(t, saved),
        );
        if (created && onDay) await addToDay(onDay, 'location', created.id);
        return created;
      },

      /**
       * Adds an existing location of the user (from another collection) to this one, keeping its other collections;
       * `onDay` also puts it on that day's plan.
       */
      linkLocation: async (locationId: string, onDay?: string) => {
        const linked = await run(
          null,
          async () => {
            const current = await client.getLocation(locationId);
            const collections = [...new Set([...(current.collections ?? []), collectionId])];
            return client.edit.updateLocation(locationId, { name: current.name, collections });
          },
          (t, saved) => withLocationObject(t, saved),
        );
        if (linked && onDay) await addToDay(onDay, 'location', linked.id);
        return linked;
      },

      /** Trails and activities: no optimistic patch, the refetch of the collection brings them. */
      saveTrail: (locationId: string, trailId: string | null, input: TrailInput) =>
        run(null, () =>
          trailId ? client.edit.updateTrail(trailId, input) : client.edit.createTrail(locationId, input),
        ),
      deleteTrail: (trailId: string) => run(null, () => client.edit.deleteTrail(trailId).then(() => true)),
      saveActivity: (visitId: string, activityId: string | null, input: ActivityInput, gpx?: UploadFile) =>
        run(null, () =>
          activityId ? client.edit.updateActivity(activityId, input) : client.edit.createActivity(visitId, input, gpx),
        ),
      deleteActivity: (activityId: string) => run(null, () => client.edit.deleteActivity(activityId).then(() => true)),

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
        lodgingId
          ? run(
              (t) => {
                const prev = t.lodging.find((l) => l.id === lodgingId);
                return prev ? withLodging(t, { ...prev, ...input }) : t;
              },
              () => client.edit.updateLodging(lodgingId, { ...input, collection: collectionId }),
              (t, saved) => withLodging(t, saved),
            )
          : run(
              null,
              () => client.edit.createLodging({ ...input, collection: collectionId }),
              (t, saved) => withLodging(t, saved),
            ),

      saveTransportation: (
        transportationId: string | null,
        input: Partial<TransportationInput> & { name: string; type: string },
      ) =>
        transportationId
          ? run(
              (t) => {
                const prev = t.transportations.find((x) => x.id === transportationId);
                return prev ? withTransportation(t, { ...prev, ...input }) : t;
              },
              () => client.edit.updateTransportation(transportationId, { ...input, collection: collectionId }),
              (t, saved) => withTransportation(t, saved),
            )
          : run(
              null,
              () => client.edit.createTransportation({ ...input, collection: collectionId }),
              (t, saved) => withTransportation(t, saved),
            ),

      /** Uploads one image; the local file goes into the offline cache under the server's URL. */
      uploadImage: (kind: MediaOwnerKind, objectId: string, file: UploadFile) =>
        run(
          null,
          () => client.edit.uploadImage(kind, objectId, file),
          (t, image) => {
            seedCache(image.image, file.uri);
            return withImage(t, objectId, image);
          },
        ),
      /** Fills the empty day plan from dates on the server; the refetch brings the new items. */
      autoGenerateItinerary: () => run(null, () => client.edit.autoGenerateItinerary(collectionId)),

      /** Images from public URLs (Wikipedia, a typed address), downloaded by the server. */
      importImages: (kind: MediaOwnerKind, objectId: string, urls: string[], source: 'wikipedia' | 'url') =>
        run(
          null,
          () => client.edit.importImages(kind, objectId, urls, source),
          (t, result) => result.created.reduce((acc, image) => withImage(acc, objectId, image), t),
        ),
      setPrimaryImage: (imageId: string) =>
        run(
          (t) => withPrimaryImage(t, imageId),
          () => client.edit.setPrimaryImage(imageId),
        ),
      deleteImage: (imageId: string) =>
        run(
          (t) => withoutImage(t, imageId),
          () => client.edit.deleteImage(imageId),
        ),
      uploadAttachment: (kind: MediaOwnerKind, objectId: string, file: UploadFile, name?: string) =>
        run(
          null,
          () => client.edit.uploadAttachment(kind, objectId, file, name),
          (t, attachment) => {
            seedCache(attachment.file, file.uri);
            return withAttachment(t, objectId, attachment);
          },
        ),
      renameAttachment: (attachmentId: string, name: string) =>
        run(
          (t) => withAttachmentName(t, attachmentId, name),
          () => client.edit.renameAttachment(attachmentId, name),
        ),
      deleteAttachment: (attachmentId: string) =>
        run(
          (t) => withoutAttachment(t, attachmentId),
          () => client.edit.deleteAttachment(attachmentId),
        ),

      /** Owner only. New dates drop itinerary items and days outside them (the screen asks first). */
      saveCollection: (fields: Partial<CollectionInput>) =>
        run(
          (t) => withCollectionFields(t, fields),
          () => client.edit.updateCollection(collectionId, fields),
        ),
      setCover: (imageId: string) =>
        run(null, () => client.edit.updateCollection(collectionId, { primary_image_id: imageId })),

      saveDay: (date: string, name: string, description: string) => {
        const existing = view?.collection.itinerary_days.find((d) => d.date === date);
        return run(
          (t) => withDay(t, { id: existing?.id ?? tempId(), date, name, description }),
          () =>
            existing
              ? client.edit.updateDay(existing.id, { name, description })
              : client.edit.createDay({ collection: collectionId, date, name, description }),
        );
      },

      moveEntry: (day: Day, entry: DayEntry, direction: -1 | 1) =>
        entry.itineraryId ? reorder(moveWithinDay(day, entry.itineraryId, direction)) : Promise.resolve(null),
      moveEntryToDay: (target: Day, entry: DayEntry) =>
        entry.itineraryId ? reorder(moveToDay(target, entry.itineraryId)) : Promise.resolve(null),
      removeEntry: (entry: DayEntry) =>
        entry.itineraryId
          ? run(
              (t) => withoutItineraryItem(t, entry.itineraryId!),
              () => client.edit.removeFromItinerary(entry.itineraryId!),
            )
          : Promise.resolve(null),
      addToDay,

      /** All-day visit today in the location's own zone, stored like the website: midnight UTC of the date. */
      addVisitToday: (location: Location) => {
        const timeZone = view ? locationZone(view, location) : 'UTC';
        const date = `${todayIn(timeZone)}T00:00:00Z`;
        const id = tempId();
        return run(
          (t) =>
            withVisit(
              t,
              { id, start_date: date, end_date: date, timezone: timeZone, notes: null, activities: [] },
              location.id,
            ),
          () => client.edit.addVisit({ location: location.id, start_date: date, end_date: date, timezone: timeZone }),
        );
      },
      deleteVisit: (visitId: string) =>
        run(
          (t) => withoutVisit(t, visitId),
          () => client.edit.deleteVisit(visitId),
        ),
      rate: (location: Location, rating: number | null) =>
        run(
          (t) => withLocation(t, location.id, { rating }),
          () => client.edit.rateLocation(location.id, rating),
        ),
    };
  }, [client, queryClient, online, collectionId, view]);
}

export type CollectionEdits = ReturnType<typeof useCollectionEdits>;
