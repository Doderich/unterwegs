import { useQueryClient } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import { requestErrorText } from '@/api/errors';
import type { City, Country, Region, VisitedCity, VisitedRegion } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';

import { queryKeys } from './queries';
import { OfflineError } from './useCollectionEdits';
import { withCityVisit, withCountryVisits, withoutCityVisit, withoutRegionVisit, withRegionVisit } from './world';

/**
 * Online-only: mark regions of one country as visited or not. Optimistic on the region visits and the
 * country's count, rolled back with an alert on failure; afterwards all world data (stats, countries) refetches.
 */
export function useRegionEdits(countryCode: string) {
  const client = useClient();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const online = !(network.isInternetReachable === false || network.isConnected === false);

  return useMemo(() => {
    const visitsKey = queryKeys.world.regionVisits(countryCode);
    const countriesKey = queryKeys.world.countries;

    async function run(
      update: (v: VisitedRegion[]) => VisitedRegion[],
      delta: number,
      request: () => Promise<unknown>,
    ): Promise<boolean> {
      try {
        if (!online) throw new OfflineError();
        await queryClient.cancelQueries({ queryKey: visitsKey });
        const previousVisits = queryClient.getQueryData<VisitedRegion[]>(visitsKey);
        const previousCountries = queryClient.getQueryData<Country[]>(countriesKey);
        if (previousVisits) queryClient.setQueryData(visitsKey, update(previousVisits));
        if (previousCountries)
          queryClient.setQueryData(countriesKey, withCountryVisits(previousCountries, countryCode, delta));
        try {
          await request();
          haptics.success();
          return true;
        } catch (e) {
          if (previousVisits) queryClient.setQueryData(visitsKey, previousVisits);
          if (previousCountries) queryClient.setQueryData(countriesKey, previousCountries);
          throw e;
        } finally {
          void queryClient.invalidateQueries({ queryKey: ['world'] });
        }
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), errorText(e));
        return false;
      }
    }

    return {
      online,
      markVisited: (region: Region) =>
        run(
          (v) => withRegionVisit(v, region),
          1,
          () => client.edit.markRegionVisited(region.id),
        ),
      unmarkVisited: (region: Region) =>
        run(
          (v) => withoutRegionVisit(v, region.id),
          -1,
          () => client.edit.unmarkRegionVisited(region.id),
        ),
    };
  }, [client, queryClient, online, countryCode]);
}

/**
 * Online-only: mark cities of one region as visited or not. Optimistic on the city visits; afterwards all world
 * data refetches, because marking a city also marks its region on the server.
 */
export function useCityEdits(regionId: string) {
  const client = useClient();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const online = !(network.isInternetReachable === false || network.isConnected === false);

  return useMemo(() => {
    const visitsKey = queryKeys.world.cityVisits(regionId);

    async function run(update: (v: VisitedCity[]) => VisitedCity[], request: () => Promise<unknown>) {
      try {
        if (!online) throw new OfflineError();
        await queryClient.cancelQueries({ queryKey: visitsKey });
        const previous = queryClient.getQueryData<VisitedCity[]>(visitsKey);
        if (previous) queryClient.setQueryData(visitsKey, update(previous));
        try {
          await request();
          haptics.success();
          return true;
        } catch (e) {
          if (previous) queryClient.setQueryData(visitsKey, previous);
          throw e;
        } finally {
          void queryClient.invalidateQueries({ queryKey: ['world'] });
        }
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), errorText(e));
        return false;
      }
    }

    return {
      online,
      markVisited: (city: City) =>
        run(
          (v) => withCityVisit(v, city),
          () => client.edit.markCityVisited(city.id),
        ),
      unmarkVisited: (city: City) =>
        run(
          (v) => withoutCityVisit(v, city.id),
          () => client.edit.unmarkCityVisited(city.id),
        ),
    };
  }, [client, queryClient, online, regionId]);
}

/** Online-only: "Regionen aus meinen Orten markieren". */
export function useMarkFromLocations() {
  const client = useClient();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const online = !(network.isInternetReachable === false || network.isConnected === false);
  return {
    online,
    /** Resolves to what was newly marked, or null after an alert. */
    run: async () => {
      try {
        if (!online) throw new OfflineError();
        const result = await client.edit.markRegionsFromLocations();
        haptics.success();
        return result;
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), errorText(e));
        return null;
      } finally {
        void queryClient.invalidateQueries({ queryKey: ['world'] });
      }
    },
  };
}

function errorText(e: unknown): string {
  if (e instanceof OfflineError) return e.message;
  return requestErrorText(e, { write: true });
}
