import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { matchesLocationFilter } from '@/data/locationLibrary';
import { SearchLauncher } from '@/ui/MaterialSearch';
import { CardRow } from '@/ui/CardRow';
import { LoadingRows } from '@/ui/LoadingRows';
import { useScreenSearch } from '@/ui/ScreenSearch';
import { MainToolbar } from '@/ui/MainToolbar';

import { useLocations } from '@/data/useLocation';
import { tr } from '@/i18n';
import { leadingFor } from '@/ui/entries';
import { Host } from '@/ui/Host';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { useSelect } from '@/ui/Select';

export default function PlacesScreen() {
  const locations = useLocations();
  const search = useScreenSearch();
  const rt = useRowTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const select = useSelect(rt, {
    title: tr('places.filter'),
    label: tr('places.filter'),
    value: filter,
    onChange: setFilter,
    options: [
      { value: 'all', label: tr('places.all') },
      { value: 'standalone', label: tr('places.standalone') },
      { value: 'visited', label: tr('common.visited') },
      { value: 'saved', label: tr('places.notVisited') },
    ],
  });
  const loading = locations.isPending && locations.isFetching;
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const places = (locations.data ?? [])
    .filter(
      (p) =>
        matchesLocationFilter(p, filter) &&
        words.every((w) =>
          [p.name, p.location, p.description, ...(p.tags ?? [])].join(' ').toLocaleLowerCase().includes(w),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <Stack.Screen options={{ title: tr('shell.places') }} />
      {Platform.OS === 'ios' ? <MainToolbar tab="places" /> : null}
      {Platform.OS === 'ios' ? (
        <Stack.SearchBar
          ref={search}
          placement="automatic"
          hideWhenScrolling={false}
          hideNavigationBar={false}
          obscureBackground={false}
          placeholder={tr('places.search')}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onCancelButtonPress={() => {
            setQuery('');
            search.current?.blur();
          }}
        />
      ) : null}
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup
          onRefresh={async () => {
            await locations.refetch();
          }}>
          {Platform.OS === 'android' ? (
            <CardRow>
              <SearchLauncher
                placeholder={tr('places.search')}
                onPress={() => router.push({ pathname: '/search', params: { scope: 'places', filter } })}
              />
            </CardRow>
          ) : null}
          <FieldGroup.Section>
            {select.row}
            <ListItem colors={rt.listColors} leading={<RowIcon name="map" />} onPress={() => router.push('/world/map')}>
              {tr('places.showMap')}
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section>
            {places.map((place) => (
              <ListItem
                key={place.id}
                colors={rt.listColors}
                leading={leadingFor(place.images, <RowIcon name="location" />)}
                supportingText={
                  <Sub>
                    {[place.location, !place.collections?.length ? tr('places.standalone') : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Sub>
                }
                onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}>
                {place.name}
              </ListItem>
            ))}
            {!places.length && loading ? <LoadingRows /> : null}
            {!places.length && !loading ? (
              <Text textStyle={{ color: rt.colors.secondary }}>
                {locations.fetchStatus === 'paused' && !locations.data
                  ? tr('common.offlineNoData')
                  : locations.isError
                    ? tr('places.loadFailed')
                    : tr('places.empty')}
              </Text>
            ) : null}
          </FieldGroup.Section>
        </RefreshableFieldGroup>
      </Host>
      {select.sheet}
    </>
  );
}
