import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { useCountries, usePins, useWorldStats } from '@/data/queries';
import { useMarkFromLocations } from '@/data/useRegionEdits';
import { countrySections } from '@/data/world';
import { tr } from '@/i18n';
import { CardRow, cardRowWidth } from '@/ui/CardRow';
import { PassportStamps } from '@/ui/PassportStamps';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { statRows } from '@/ui/statRows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { GlobalSearchRow } from '@/ui/GlobalSearchRow';
import { MainSearchScreen } from '@/ui/MainSearchScreen';

/** Everything outside one collection: counts, the map of all locations, visited countries. */
export default function WorldScreen() {
  const rt = useRowTheme();
  const { width: windowWidth } = useWindowDimensions();
  const stats = useWorldStats();
  const pins = usePins();
  const countries = useCountries();
  const visited = countrySections(countries.data ?? []).visited;
  const marker = useMarkFromLocations();
  const [marking, setMarking] = useState(false);

  const markFromLocations = async () => {
    if (marking) return;
    setMarking(true);
    const result = await marker.run();
    setMarking(false);
    if (!result) return;
    const names = [...Object.values(result.regions), ...Object.values(result.cities)];
    Alert.alert(
      result.new_regions || result.new_cities
        ? tr('world.rRegionsCCitiesNewly', { r: result.new_regions, c: result.new_cities })
        : tr('world.nothingNew'),
      names.length
        ? names.slice(0, 12).join(', ') + (names.length > 12 ? ' …' : '')
        : tr('world.allRegionsCitiesOfVisited'),
    );
  };

  const refresh = async () => void (await Promise.all([stats.refetch(), pins.refetch(), countries.refetch()]));

  return (
    <MainSearchScreen tab="world">
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          <GlobalSearchRow />
          {/* The countries you've been to, as stamps in a passport: the travel record, before the numbers. */}
          {visited.length > 0 ? (
            <CardRow title={tr('world.visitedCountries')}>
              <PassportStamps countries={visited} width={cardRowWidth(windowWidth)} />
            </CardRow>
          ) : null}

          <FieldGroup.Section title={tr('common.statistics')}>
            {stats.data ? (
              statRows(rt, stats.data)
            ) : stats.isPending && stats.isFetching ? (
              <LoadingRows rows={5} thumbnails={false} />
            ) : (
              <ListItem colors={rt.listColors}>
                {stats.fetchStatus === 'paused' ? tr('common.offlineNoData') : tr('common.couldNotLoadedPullRefresh')}
              </ListItem>
            )}
          </FieldGroup.Section>

          <FieldGroup.Section>
            <ListItem colors={rt.listColors} leading={<RowIcon name="days" />} onPress={() => router.push('/calendar')}>
              {tr('common.calendar')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="category" />}
              onPress={() => router.push('/categories')}>
              {tr('common.categories')}
            </ListItem>
            <ListItem colors={rt.listColors} leading={<RowIcon name="group" />} onPress={() => router.push('/people')}>
              {tr('common.people')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.map')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="map" />}
              supportingText={
                <Sub>{pins.data ? tr('world.locationsFromAllTrips', { count: pins.data.length }) : null}</Sub>
              }
              onPress={() => router.push('/world/map')}>
              {tr('world.allLocationsOnMap')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section title={visited.length > 0 ? undefined : tr('world.visitedCountries')}>
            {countries.isPending && countries.isFetching ? <LoadingRows rows={3} /> : null}
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="flag" />}
              supportingText={
                <Sub>
                  {visited.length === 0 && countries.data
                    ? tr('world.noRegionsMarkedAsVisited')
                    : countries.data
                      ? tr('world.countries', { count: countries.data.length })
                      : countries.isError
                        ? tr('common.couldNotLoadedPullRefresh')
                        : null}
                </Sub>
              }
              onPress={() => router.push('/world/countries')}>
              {tr('world.allCountries')}
            </ListItem>
            {marker.online ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="visit" />}
                supportingText={<Sub>{tr('world.markRegionsCitiesOfAll')}</Sub>}
                onPress={() => void markFromLocations()}>
                {marking ? tr('world.marking') : tr('world.markFromMyPlaces')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>
        </RefreshableFieldGroup>
      </Host>
    </MainSearchScreen>
  );
}
