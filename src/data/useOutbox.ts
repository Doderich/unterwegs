import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Alert, AppState } from 'react-native';

import { useClient } from '@/auth/session';
import { tr } from '@/i18n';

import { getOutbox, onFlushRequested, subscribeOutbox, syncOutbox, type OutboxOp } from './outbox';
import { reportWriteFailure, useOnline } from './onlineWrite';

/** The edits waiting for the server (all collections). */
export function useOutbox(): OutboxOp[] {
  return useSyncExternalStore(subscribeOutbox, getOutbox);
}

/** How many edits of one collection are still waiting. */
export function usePendingCount(collectionId?: string): number {
  const ops = useOutbox();
  return collectionId ? ops.filter((o) => o.collectionId === collectionId).length : ops.length;
}

/**
 * Keeps sending waiting edits: at start, whenever the connection comes back or the app returns to the foreground,
 * and right after each new edit. Afterwards the touched collections are read again; edits the server refused and
 * notes saved as a copy are reported once.
 */
export function useOutboxSync() {
  const client = useClient();
  const queryClient = useQueryClient();
  const online = useOnline();
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    flushRef.current = async () => {
      if (!onlineRef.current) return;
      const report = await syncOutbox(client, queryClient, {
        copyName: (name) => tr('outbox.conflictCopyName', { name }),
        noteCopied: (name) => tr('outbox.conflictBody', { name }),
        fieldsKept: (name) => tr('outbox.fieldsKept', { name }),
      });
      if (!report) return;
      if (report.dropped.length > 0) {
        reportWriteFailure(
          report.dropped[0].error,
          tr('useCollectionEdits.youreNotAllowedEditTrip'),
          tr('outbox.notSaved', { count: report.dropped.length }),
        );
      }
      if (report.conflicts.length > 0) {
        Alert.alert(tr('outbox.conflictTitle'), report.conflicts.join('\n\n'));
      }
    };
    onFlushRequested(() => void flushRef.current());
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushRef.current();
    });
    return () => {
      onFlushRequested(null);
      appState.remove();
    };
  }, [client, queryClient]);

  // At start and whenever the connection comes back: send what waited.
  useEffect(() => {
    if (online) void flushRef.current();
  }, [online]);
}
