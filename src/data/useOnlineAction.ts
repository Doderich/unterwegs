import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { requestErrorText } from '@/api/errors';
import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';

import { OfflineError } from './useCollectionEdits';

export function useOnline(): boolean {
  const network = useNetworkState();
  return !(network.isInternetReachable === false || network.isConnected === false);
}

export function actionErrorText(e: unknown): string {
  if (e instanceof OfflineError) return e.message;
  if (e instanceof ApiError && e.status === 403) return tr('useOnlineAction.youDoNotHavePermission');
  return requestErrorText(e, { write: true });
}

/**
 * Online-only write without an optimistic update (sharing, categories, archive): sends the request, shows an alert
 * on failure, and refetches the given queries either way. Resolves to the result, or `null` after a failure.
 */
export function useOnlineAction() {
  const online = useOnline();
  const queryClient = useQueryClient();
  const run = useCallback(
    async <R>(request: () => Promise<R>, refetch: QueryKey[] = []): Promise<R | null> => {
      try {
        if (!online) throw new OfflineError();
        const result = await request();
        haptics.success();
        return result;
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), actionErrorText(e));
        return null;
      } finally {
        if (online) for (const queryKey of refetch) void queryClient.invalidateQueries({ queryKey });
      }
    },
    [online, queryClient],
  );
  return { online, run };
}
