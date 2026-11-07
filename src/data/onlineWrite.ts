import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { requestErrorText } from '@/api/errors';
import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';

/**
 * Writes that need the server now (sharing, invites, archive, categories, account, world marks, lookups such as
 * "nearby" or web images). The other write adapter is the outbox (ADR 0016), for edits of a collection's content.
 * Connectivity, the wording of failures and the alert/haptic policy live here, once.
 */

type NetworkLike = { isConnected?: boolean | null; isInternetReachable?: boolean | null };

/** Connected unless the system says otherwise ("unknown" counts as online, so a slow probe never blocks). */
export const isConnected = (network: NetworkLike): boolean =>
  !(network.isInternetReachable === false || network.isConnected === false);

export function useOnline(): boolean {
  return isConnected(useNetworkState());
}

export class OfflineError extends Error {
  constructor() {
    super(tr('common.editingNeedsInternetConnection'));
    this.name = 'OfflineError';
  }
}

/** Why a write failed, in words; `forbidden` names what a 403 means where it happened. */
export function writeErrorText(e: unknown, forbidden?: string): string {
  if (e instanceof OfflineError) return e.message;
  if (e instanceof ApiError && e.status === 403) return forbidden ?? tr('useOnlineAction.youDoNotHavePermission');
  return requestErrorText(e, { write: true });
}

/** The one way a failed write is shown: an error haptic and an alert. */
export function reportWriteFailure(e: unknown, forbidden?: string, title = tr('common.notSaved')) {
  haptics.error();
  Alert.alert(title, writeErrorText(e, forbidden));
}

/** A change to cached data shown before the server answers, undone if it refuses. */
export type OptimisticPatch = { key: QueryKey; update: (data: never) => unknown };

/** A typed `OptimisticPatch`: `update` gets the cached data of `key`. */
export const patch = <T>(key: QueryKey, update: (data: T) => T): OptimisticPatch => ({
  key,
  update: update as (data: never) => unknown,
});

export type OnlineWrite<R> = {
  request: () => Promise<R>;
  optimistic?: OptimisticPatch[];
  /** Applied with the server's answer, before the refetch. */
  confirmed?: (result: R) => void;
  /** Reads to refresh afterwards, success or not. */
  refetch?: QueryKey[];
  /** A success haptic for actions the user waits on (marking a region, sharing). */
  successHaptic?: boolean;
  forbidden?: string;
};

/**
 * One online write: refuses offline, patches cached data optimistically, sends, rolls back and reports on failure,
 * refreshes the given reads. Resolves to the result, or null after a failure (already reported).
 */
export async function writeOnline<R>(
  queryClient: QueryClient,
  online: boolean,
  { request, optimistic = [], confirmed, refetch = [], successHaptic, forbidden }: OnlineWrite<R>,
): Promise<R | null> {
  const previous: { key: QueryKey; data: unknown }[] = [];
  try {
    if (!online) throw new OfflineError();
    for (const patch of optimistic) {
      await queryClient.cancelQueries({ queryKey: patch.key });
      const data = queryClient.getQueryData(patch.key);
      if (data === undefined) continue;
      previous.push({ key: patch.key, data });
      queryClient.setQueryData(patch.key, patch.update(data as never));
    }
    const result = await request();
    confirmed?.(result);
    if (successHaptic) haptics.success();
    return result;
  } catch (e) {
    for (const p of previous) queryClient.setQueryData(p.key, p.data);
    reportWriteFailure(e, forbidden);
    return null;
  } finally {
    if (online) for (const queryKey of refetch) void queryClient.invalidateQueries({ queryKey });
  }
}

/** `writeOnline` bound to this screen's query client and connection. */
export function useOnlineWrite() {
  const queryClient = useQueryClient();
  const online = useOnline();
  return useMemo(
    () => ({ online, write: <R>(w: OnlineWrite<R>) => writeOnline(queryClient, online, w) }),
    [queryClient, online],
  );
}
