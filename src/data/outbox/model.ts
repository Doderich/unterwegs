import { ApiError, SchemaError } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { kindOf, replaceId, type SendContext } from './kinds';
import type { NewOp, OutboxOp, SendResult } from './types';

/** The collection as it will be once the waiting edits are saved: what the screens show meanwhile. */
export function applyPending(collection: Collection, ops: OutboxOp[]): Collection {
  return ops
    .filter((op) => op.collectionId === collection.id)
    .reduce<Collection>((t, op) => kindOf(op).show(t, op), collection);
}

/** Replays one edit on `fresh`, the collection as the server has it now. */
export function sendOp(ctx: SendContext, op: OutboxOp, fresh: Collection): Promise<SendResult> {
  return kindOf(op).send(ctx, op, fresh);
}

/** After a create: a waiting edit that pointed at the temporary id now points at the server's. */
export function withRealId(op: OutboxOp, tempId: string, id: string): OutboxOp {
  const follow = kindOf(op).follow;
  const followed = follow ? follow(op, tempId, id) : op;
  return replaceId(followed, tempId, id);
}

/** What to do after a failed send: try again later, or give the edit up (the server will never take it). */
export function failureKind(e: unknown): 'retry' | 'drop' | 'done' {
  // The server answered with something the app can't read: the write itself went through.
  if (e instanceof SchemaError) return 'done';
  if (e instanceof ApiError) return e.status >= 500 || e.status === 408 || e.status === 429 ? 'retry' : 'drop';
  // No answer at all (no connection, timeout).
  return 'retry';
}

/**
 * A new edit against the ones already waiting, so the queue says what the user meant and nothing conflicts with
 * itself:
 * - removing something that was only created offline cancels its creation and, transitively, every waiting edit
 *   that needs it (a visit on a new location, an activity on that visit …);
 * - an edit about the same thing as a waiting one folds into it (the first edit's `base` is kept).
 * `inFlight` is the edit being sent right now, which never changes under the sender. Returns null when the edit is
 * simply appended; `op` null when it cancelled out.
 */
export function mergeIntoPending(
  ops: OutboxOp[],
  op: NewOp,
  inFlight: OutboxOp | null,
): { ops: OutboxOp[]; op: OutboxOp | null } | null {
  const waiting = (o: OutboxOp) => o !== inFlight;
  const kind = kindOf(op);

  const target = kind.removes?.(op);
  if (target && ops.some((o) => waiting(o) && kindOf(o).creates?.(o) === target)) {
    const cancelled = new Set([target]);
    let rest = ops;
    let changed = true;
    while (changed) {
      changed = false;
      rest = rest.filter((o) => {
        if (!waiting(o)) return true;
        const created = kindOf(o).creates?.(o);
        const gone =
          (created && cancelled.has(created)) ||
          kindOf(o)
            .needs(o)
            .some((id) => cancelled.has(id));
        if (gone && created && !cancelled.has(created)) {
          cancelled.add(created);
          changed = true;
        }
        return !gone;
      });
    }
    return { ops: rest, op: null };
  }

  if (kind.foldInto) {
    for (let i = 0; i < ops.length; i++) {
      if (!waiting(ops[i])) continue;
      const merged = kind.foldInto(ops[i], op);
      if (merged) {
        const next = [...ops];
        next[i] = merged;
        return { ops: next, op: merged };
      }
    }
  }
  return null;
}
