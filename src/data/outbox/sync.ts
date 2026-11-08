import type { QueryClient } from '@tanstack/react-query';

import type { ApiClient } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { queryKeys } from '../queryKeys';
import { replaceId } from './kinds';
import { applyPending } from './model';
import type { FlushReport, Outbox } from './queue';
import type { ConflictTexts } from './types';

/**
 * Sends the waiting edits and keeps the cached collections in step (ADR 0016): each edit the server took is folded
 * into its cached collection at once (with the server id of what it created), so a screen never falls back to the
 * old copy; afterwards every touched collection is read again. Resolves with what happened, for the caller to
 * report (refused edits, conflicts), or null when nothing was waiting.
 */
export async function syncOutbox(
  outbox: Pick<Outbox, 'get' | 'flush'>,
  client: ApiClient,
  cache: QueryClient,
  texts: ConflictTexts,
): Promise<FlushReport | null> {
  if (outbox.get().length === 0) return null;
  const report = await outbox.flush(client, texts, (op, created) =>
    cache.setQueryData<Collection>(queryKeys.collection(op.collectionId), (saved) => {
      if (!saved) return saved;
      const next = applyPending(saved, [op]);
      return created ? replaceId(next, created.tempId, created.id) : next;
    }),
  );
  await Promise.all([...report.collections].map((id) => cache.invalidateQueries({ queryKey: queryKeys.collection(id) })));
  return report;
}
