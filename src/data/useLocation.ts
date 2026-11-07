import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useClient } from '@/auth/session';
import type { Location } from '@/api/schemas';
import { useMediaOffline } from '@/offline/useCollectionOffline';
import { mainQueryOptions, queryKeys } from './queries';
import { useOnlineAction } from './useOnlineAction';
import { readsAffectedBy } from './affected';

export function useLocations(enabled = true) {
  const client = useClient();
  return useQuery({ ...mainQueryOptions(client).locations, enabled });
}

export function useLocation(id: string) {
  const client = useClient();
  const cache = useQueryClient();
  return useQuery({
    queryKey: queryKeys.location(id),
    queryFn: () => client.getLocation(id),
    enabled: !!id,
    initialData: () => cache.getQueryData<Location[]>(queryKeys.locations)?.find((l) => l.id === id),
  });
}

export function useLocationFiles(location: Location | undefined) {
  const urls = useMemo(
    () => (location ? [...location.attachments.map((a) => a.file), ...location.images.map((i) => i.image)] : []),
    [location],
  );
  return useMediaOffline(urls, true);
}

export function useLocationAction(id = '') {
  const action = useOnlineAction();
  return {
    online: action.online,
    run: <T>(request: () => Promise<T>) => action.run(request, readsAffectedBy({ location: id })),
  };
}
