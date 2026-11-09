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
import { useHeaderSearch } from '@/ui/HeaderSearch';

import { useLocations } from '@/data/useLocation';
import { tr } from '@/i18n';
import { Host } from '@/ui/Host';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { useSelect } from '@/ui/Select';
import { photoListItem, usePhotoColumns, photoSection } from '@/ui/PhotoListItem';

export default function PlacesScreen() {
  const photoColumns = usePhotoColumns();
  const locations = useLocations();
  const search = useScreenSearch();
  const rt = useRowTheme();
  const [query, setQuery] = useState('');
  const ipadSearch = useHeaderSearch({ placeholder: tr('places.search'), onChange: setQuery });
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
      {Platform.OS === 'ios' ? (
        <MainToolbar tab="places" search={Platform.isPad ? ipadSearch.button : undefined} />
      ) : null}
      {/* iPad: a magnifier apart from + and settings that opens the field in the header (useHeaderSearch). */}
      {Platform.OS === 'ios' && Platform.isPad ? ipadSearch.bar : null}
      {Platform.OS === 'ios' && !Platform.isPad ? (
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
          {photoSection(
            { key: 'photos-7' },
            <>
              {places.map((place) =>
                photoListItem({
                  key: place.id,
                  colors: rt.listColors,
                  images: place.images,
                  icon: <RowIcon name="location" />,
                  title: place.name,
                  subtitle: [place.location, !place.collections?.length ? tr('places.standalone') : null]
                    .filter(Boolean)
                    .join(' · '),
                  onPress: () => router.push({ pathname: '/place/[id]', params: { id: place.id } }),
                }),
              )}
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
            </>,
            photoColumns,
          )}
        </RefreshableFieldGroup>
      </Host>
      {select.sheet}
    </>
  );
}
