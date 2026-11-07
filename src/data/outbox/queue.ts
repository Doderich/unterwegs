import type { ApiClient, UploadFile } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { tempId } from '../edits';
import { failureKind, mergeIntoPending, sendOp, withRealId } from './model';
import type { ConflictTexts, NewOp, OutboxOp } from './types';

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/** Files kept for uploads: copied out of the picker's cache, cached under their URL once sent, then removed. */
export type FileKeeper = {
  keep(file: UploadFile): Promise<UploadFile>;
  /** After the upload (`url` empty when there is nothing to cache) or when the edit was cancelled. */
  settle(url: string, localUri: string): Promise<void>;
};

export type FlushReport = {
  sent: number;
  /** Edits the server refused for good (no permission, object gone); they are removed. */
  dropped: { op: OutboxOp; error: unknown }[];
  /** What was kept instead of an edit that collided with someone else's (a note copy, fields kept). */
  conflicts: string[];
  collections: Set<string>;
  /** Stopped early: no connection or the server is unwell; the rest waits. */
  interrupted: boolean;
};

const KEY = 'unterwegs.outbox.v1';

/**
 * The outbox (ADR 0016): edits waiting for the server, persisted under their own key (never cleared by an app
 * update), sent in order. `storage` is opened on first use; tests pass an in-memory store and keeper.
 */
export function createOutbox({ storage, files }: { storage: () => Promise<KeyValueStore>; files: FileKeeper }) {
  let ops: OutboxOp[] = [];
  const listeners = new Set<() => void>();
  let store: KeyValueStore | null = null;
  let loading: Promise<void> | null = null;
  /** The edit being sent right now (never merged into or cancelled under the sender). */
  let inFlight: OutboxOp | null = null;
  let running: Promise<FlushReport> | null = null;
  let flushRequested: (() => void) | null = null;
  /** Temporary ids of things created offline, mapped to the server's once sent, for screens still showing them. */
  const realIds = new Map<string, string>();

  const emit = () => listeners.forEach((l) => l());

  function loaded(): Promise<void> {
    loading ??= storage()
      .then(async (s) => {
        store = s;
        const raw = await s.getItem(KEY);
        const saved = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
        // Anything queued before loading finished comes after what was already saved.
        ops = [...saved, ...ops];
        emit();
      })
      .catch(() => undefined);
    return loading;
  }

  function save(next: OutboxOp[]) {
    ops = next;
    emit();
    void loaded()
      .then(() => store?.setItem(KEY, JSON.stringify(ops)))
      .catch(() => undefined);
  }

  const keptFile = (op: OutboxOp) => (op.type === 'uploadImage' || op.type === 'createChild' ? op.file : undefined);

  return {
    subscribe(listener: () => void): () => void {
      void loaded();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    get: (): OutboxOp[] => ops,

    /** Resolves once the saved edits are read (tests and the first flush wait for it). */
    ready: () => loaded(),

    /** Queues an edit, folded into a waiting one where they touch the same thing; null when it cancelled out. */
    enqueue(op: NewOp): OutboxOp | null {
      const merged = mergeIntoPending(ops, op, inFlight);
      let result: OutboxOp | null;
      if (merged) {
        // Edits that cancelled out leave no kept file behind.
        for (const gone of ops.filter((o) => !merged.ops.includes(o))) {
          const file = keptFile(gone);
          if (file) void files.settle('', file.uri);
        }
        save(merged.ops);
        result = merged.op;
      } else {
        result = { ...op, id: tempId(), createdAt: Date.now(), attempts: 0 } as OutboxOp;
        save([...ops, result]);
      }
      flushRequested?.();
      return result;
    },

    keep: (file: UploadFile) => files.keep(file),

    realIdFor: (id: string): string => realIds.get(id) ?? id,

    /** Called after every new edit, so an edit made online goes out right away. */
    onFlushRequested(fn: (() => void) | null) {
      flushRequested = fn;
    },

    /** Signing out discards edits that were never sent (they belong to that account and server). */
    clear() {
      for (const o of ops) {
        const file = keptFile(o);
        if (file) void files.settle('', file.uri);
      }
      save([]);
    },

    /**
     * Sends the waiting edits in order, each replayed on the collection as the server has it now (one read per
     * collection, again after each write). Stops at the first edit that can't get through; refused ones are dropped
     * and reported. One flush at a time; a second call joins the running one.
     */
    flush(
      client: ApiClient,
      texts: ConflictTexts,
      /**
       * Called for each edit the server took, before it leaves the queue: fold it into the cached collection, so the
       * screen never falls back to the old copy while the fresh one is on its way.
       */
      onSent?: (op: OutboxOp, created?: { tempId: string; id: string }) => void,
    ): Promise<FlushReport> {
      running ??= (async () => {
        await loaded();
        const report: FlushReport = { sent: 0, dropped: [], conflicts: [], collections: new Set(), interrupted: false };
        const fresh = new Map<string, Collection>();
        // The queue may change while an edit is sent (new edits, folds): everything below works by identity.
        const without = (op: OutboxOp) => ops.filter((o) => o !== op);
        try {
          while (ops.length > 0) {
            const op = ops[0];
            inFlight = op;
            try {
              let collection = fresh.get(op.collectionId);
              if (!collection) {
                collection = await client.getCollection(op.collectionId);
                fresh.set(op.collectionId, collection);
              }
              const result = await sendOp({ client, texts }, op, collection);
              fresh.delete(op.collectionId);
              report.collections.add(op.collectionId);
              if (result.status === 'sent') report.sent++;
              if (result.status === 'conflict') report.conflicts.push(result.notice);
              const created = result.status === 'sent' ? result.created : undefined;
              if (created) realIds.set(created.tempId, created.id);
              if (result.status === 'sent') onSent?.(op, created);
              if (result.status === 'sent' && result.uploaded)
                void files.settle(result.uploaded.url, result.uploaded.localUri);
              const rest = without(op);
              save(created ? rest.map((o) => withRealId(o, created.tempId, created.id)) : rest);
            } catch (e) {
              const kind = failureKind(e);
              if (kind === 'retry') {
                save(ops.map((o) => (o === op ? { ...op, attempts: op.attempts + 1 } : o)));
                report.interrupted = true;
                break;
              }
              if (kind === 'drop') report.dropped.push({ op, error: e });
              report.collections.add(op.collectionId);
              save(without(op));
            } finally {
              inFlight = null;
            }
          }
          return report;
        } finally {
          running = null;
        }
      })();
      return running;
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
