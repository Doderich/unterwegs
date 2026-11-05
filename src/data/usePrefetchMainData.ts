import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useClient } from '@/auth/session';
import { warmCollectionDetails, warmMainData } from './mainData';
import { useCollections } from './queries';
import { todayIn } from '@/time/today';
import { deviceTimeZone } from '@/time/tz';
import { useOnline } from './useOnlineAction';

/** Warm main destinations after restoration, through the same cache their screens observe. */
export function usePrefetchMainData() {
  const cache = useQueryClient();
  const client = useClient();
  const restoring = useIsRestoring();
  const online = useOnline();
  const { data: collections } = useCollections();
  useEffect(() => {
    if (restoring || !online) return;
    void warmMainData(cache, client);
  }, [cache, client, online, restoring]);
  useEffect(() => {
    if (restoring || !online || !collections) return;
    void warmCollectionDetails(cache, client, collections, todayIn(deviceTimeZone()));
  }, [cache, client, collections, online, restoring]);
}
