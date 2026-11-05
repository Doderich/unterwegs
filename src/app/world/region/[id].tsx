import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { useCities, useCityVisits, useRegions, useRegionVisits } from '@/data/queries';
import { useCityEdits, useRegionEdits } from '@/data/useRegionEdits';
import { cityRows, percent, regionRows } from '@/data/world';
import { tr } from '@/i18n';
import { androidToolbarIcon, icons } from '@/ui/icons';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { useRowTheme } from '@/ui/rows';
import { Host } from '@/ui/Host';

/** Cities of one region (like the website's region page); tap marks a city visited or not. Online only. */
export default function RegionScreen() {
  const { id, name, country } = useLocalSearchParams<{ id: string; name?: string; country: string }>();
  const rt = useRowTheme();
  const cities = useCities(id);
  const visits = useCityVisits(id);
  const regions = useRegions(country);
  const regionVisits = useRegionVisits(country);
  const cityEdits = useCityEdits(id);
  const regionEdits = useRegionEdits(country);
  const rows = useMemo(() => cityRows(cities.data ?? [], visits.data ?? []), [cities.data, visits.data]);
  const region = useMemo(
    () => regionRows(regions.data ?? [], regionVisits.data ?? []).find((r) => r.id === id),
    [regions.data, regionVisits.data, id],
  );
  const visitedCount = rows.filter((c) => c.visited).length;
  const hasMap = rows.some((c) => c.latitude != null && c.longitude != null);

  const refresh = async () =>
    void (await Promise.all([cities.refetch(), visits.refetch(), regions.refetch(), regionVisits.refetch()]));

  const check = (visited: boolean) => (
    <Icon
      name={icons[visited ? 'checked' : 'unchecked']}
      size={22}
      color={visited ? rt.colors.tint : rt.colors.secondary}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: name ?? id }} />
      {hasMap ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('map')}
            accessibilityLabel={tr('common.map')}
            onPress={() => router.push({ pathname: '/world/map', params: { region: id, title: name ?? id } })}>
            {tr('common.map')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          {region ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={check(region.visited)}
                onPress={
                  regionEdits.online
                    ? () => void (region.visited ? regionEdits.unmarkVisited(region) : regionEdits.markVisited(region))
                    : undefined
                }>
                {tr('world.regionVisited')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section
            title={
              rows.length > 0
                ? tr('world.nOfTotalCitiesVisited', {
                    n: visitedCount,
                    total: rows.length,
                    p: percent(visitedCount, rows.length),
                  })
                : undefined
            }>
            {rows.length === 0 ? (
              <ListItem colors={rt.listColors}>
                {cities.isPending
                  ? tr('common.loading')
                  : cities.isError
                    ? tr('common.couldNotLoadedPullRefresh')
                    : tr('world.noCities')}
              </ListItem>
            ) : null}
            {rows.map((c) => (
              <ListItem
                key={c.id}
                colors={rt.listColors}
                leading={check(c.visited)}
                onPress={
                  cityEdits.online
                    ? () => void (c.visited ? cityEdits.unmarkVisited(c) : cityEdits.markVisited(c))
                    : undefined
                }>
                {c.name}
              </ListItem>
            ))}
          </FieldGroup.Section>

          {!cityEdits.online && rows.length > 0 ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<Icon name={icons.offline} size={22} color={rt.colors.secondary} />}>
                {tr('common.editingNeedsInternetConnection')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </>
  );
}
