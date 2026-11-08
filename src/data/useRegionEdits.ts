import { useMemo } from 'react';

import type { City, Country, Region, VisitedCity, VisitedRegion } from '@/api/schemas';
import { useClient } from '@/auth/session';

import { patch, useOnlineWrite } from './onlineWrite';
import { queryKeys } from './queries';
import { withCityVisit, withCountryVisits, withoutCityVisit, withoutRegionVisit, withRegionVisit } from './world';
import { readsAffectedBy } from './affected';

/**
 * Online-only: mark regions of one country as visited or not. Optimistic on the region visits and the country's
 * count, rolled back with an alert on failure.
 */
export function useRegionEdits(countryCode: string) {
  const client = useClient();
  const { online, write } = useOnlineWrite();

  return useMemo(() => {
    const mark = (update: (v: VisitedRegion[]) => VisitedRegion[], delta: number, request: () => Promise<unknown>) =>
      write({
        request,
        optimistic: [
          patch(queryKeys.world.regionVisits(countryCode), update),
          patch<Country[]>(queryKeys.world.countries, (c) => withCountryVisits(c, countryCode, delta)),
        ],
        refetch: readsAffectedBy('world'),
        successHaptic: true,
      }).then((result) => result !== null);

    return {
      online,
      markVisited: (region: Region) =>
        mark(
          (v) => withRegionVisit(v, region),
          1,
          () => client.edit.markRegionVisited(region.id),
        ),
      unmarkVisited: (region: Region) =>
        mark(
          (v) => withoutRegionVisit(v, region.id),
          -1,
          () => client.edit.unmarkRegionVisited(region.id),
        ),
    };
  }, [client, write, online, countryCode]);
}

/**
 * Online-only: mark cities of one region as visited or not. Optimistic on the city visits; marking a city also marks
 * its region on the server.
 */
export function useCityEdits(regionId: string) {
  const client = useClient();
  const { online, write } = useOnlineWrite();

  return useMemo(() => {
    const mark = (update: (v: VisitedCity[]) => VisitedCity[], request: () => Promise<unknown>) =>
      write({
        request,
        optimistic: [patch(queryKeys.world.cityVisits(regionId), update)],
        refetch: readsAffectedBy('world'),
        successHaptic: true,
      }).then((result) => result !== null);

    return {
      online,
      markVisited: (city: City) =>
        mark(
          (v) => withCityVisit(v, city),
          () => client.edit.markCityVisited(city.id),
        ),
      unmarkVisited: (city: City) =>
        mark(
          (v) => withoutCityVisit(v, city.id),
          () => client.edit.unmarkCityVisited(city.id),
        ),
    };
  }, [client, write, online, regionId]);
}

/** Online-only: "Regionen aus meinen Orten markieren". Resolves to what was newly marked, or null after an alert. */
export function useMarkFromLocations() {
  const client = useClient();
  const { online, write } = useOnlineWrite();
  return {
    online,
    run: () =>
      write({
        request: () => client.edit.markRegionsFromLocations(),
        refetch: readsAffectedBy('world'),
        successHaptic: true,
      }),
  };
}
