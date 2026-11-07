import type { QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useOnlineWrite } from './onlineWrite';

export { useOnline } from './onlineWrite';

/**
 * Online-only write without an optimistic update (sharing, categories, archive, account): sends the request, shows
 * an alert on failure, and refetches the given queries. Resolves to the result, or `null` after a failure.
 */
export function useOnlineAction() {
  const { online, write } = useOnlineWrite();
  const run = useCallback(
    <R>(request: () => Promise<R>, refetch: QueryKey[] = []) => write({ request, refetch, successHaptic: true }),
    [write],
  );
  return { online, run };
}
