import type { NoteInput, UploadFile } from '@/api/client';

import type { ChildKind } from './children';

/**
 * Edits made through the outbox (docs/adr/0016-offline-edits-through-an-outbox.md). Each is an *operation* ("tick
 * this item", "move this itinerary item to day 3", "set the check-in to 15:00"), not a snapshot, so it can be
 * replayed on top of whatever the server has by then.
 */
export type ChecklistChange =
  | { kind: 'toggle'; itemId: string; name: string; checked: boolean }
  | { kind: 'add'; itemId: string; name: string }
  | { kind: 'remove'; itemId: string; name: string }
  | { kind: 'renameItem'; itemId: string; from: string; name: string }
  | { kind: 'rename'; name: string };

/** Lodgings, transportations and locations: the objects edited through forms. */
export type ObjectKind = 'lodging' | 'transportation' | 'location';
/** What an itinerary item can put on a day. */
export type PlanKind = ObjectKind | 'note' | 'checklist';
/** Children edited through forms (images are only added, made the cover or deleted). */
export type EditableChild = Exclude<ChildKind, 'image'>;
export type Fields = Record<string, unknown>;

/** Added by the outbox when an edit is queued. */
type Bookkeeping = { id: string; createdAt: number; attempts: number };
type OpBase = Bookkeeping & { collectionId: string };

export type OutboxOp = OpBase &
  (
    | { type: 'checklist'; checklistId: string; change: ChecklistChange }
    | { type: 'createChecklist'; tempId: string; name: string; date: string | null }
    | { type: 'createNote'; tempId: string; input: NoteInput }
    | { type: 'updateNote'; noteId: string; baseUpdatedAt: string | null; input: NoteInput }
    | { type: 'addToDay'; date: string; contentType: PlanKind; objectId: string }
    | { type: 'visitToday'; tempId: string; locationId: string; date: string; timezone: string }
    | { type: 'rate'; locationId: string; rating: number | null }
    /** The day's itinerary items in this order. */
    | { type: 'reorderDay'; date: string; order: string[] }
    | { type: 'moveToDay'; itemId: string; date: string }
    | { type: 'removeFromDay'; itemId: string }
    /** `base`: the values before the edit, for the fields in `patch`. */
    | { type: 'saveDay'; date: string; patch: Fields; base: Fields }
    | { type: 'createObject'; objectKind: ObjectKind; tempId: string; input: Fields }
    | { type: 'updateObject'; objectKind: ObjectKind; objectId: string; patch: Fields; base: Fields }
    | { type: 'deleteObject'; objectKind: PlanKind; objectId: string }
    /** `file` is a copy in the app's documents, kept until the upload went through. */
    | { type: 'uploadImage'; ownerKind: ObjectKind; objectId: string; tempId: string; file: UploadFile }
    /** A visit or trail (on a location), an activity (on a visit, with its GPX file) or an attachment (with its file). */
    | {
        type: 'createChild';
        childKind: EditableChild;
        parentId: string;
        /** For attachments: what kind of object `parentId` is. */
        ownerKind?: ObjectKind;
        tempId: string;
        input: Fields;
        file?: UploadFile;
      }
    | { type: 'updateChild'; childKind: EditableChild; childId: string; patch: Fields; base: Fields }
    | { type: 'deleteChild'; childKind: ChildKind; childId: string }
    | { type: 'setPrimaryImage'; imageId: string }
    /** The collection's own fields (name, dates, description, link, cover as `primary_image_id`). */
    | { type: 'saveCollection'; patch: Fields; base: Fields }
    | { type: 'duplicateLocation'; locationId: string; tempId: string; name: string }
    /** An existing location of the user added to this collection; `snapshot` shows it until the server has it. */
    | { type: 'linkLocation'; locationId: string; snapshot: Fields }
  );

export type OpType = OutboxOp['type'];
export type OpOf<T extends OpType> = Extract<OutboxOp, { type: T }>;

/** An operation without the bookkeeping the outbox adds. */
export type NewOp = OutboxOp extends infer T ? (T extends OutboxOp ? Omit<T, keyof Bookkeeping> : never) : never;
export type NewOpOf<T extends OpType> = Extract<NewOp, { type: T }>;

/** Words for what happened on a conflict; passed in so the outbox stays free of the UI language. */
export type ConflictTexts = {
  /** Name of the copy kept when a note changed on both sides. */
  copyName: (name: string) => string;
  noteCopied: (copyName: string) => string;
  /** Someone else changed the same fields of `name`; theirs were kept. */
  fieldsKept: (name: string) => string;
};

export type SendResult =
  | {
      status: 'sent';
      /** The server's id for something created with a temporary one. */
      created?: { tempId: string; id: string };
      /** A file that went up: cache it under `url` (when there is one) and drop the kept copy. */
      uploaded?: { url: string; localUri: string };
    }
  /** Saved, but not everything as written: `notice` says what was kept instead. */
  | { status: 'conflict'; notice: string }
  /** Nothing to do any more (the object is gone, or the server already has it). */
  | { status: 'skipped' };

/** The overlay's id for an itinerary item put on a day offline, until the server gives it one. */
export const pendingItemId = (opId: string) => `pending-${opId}`;
