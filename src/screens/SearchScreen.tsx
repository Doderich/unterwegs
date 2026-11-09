import { FieldGroup, ListItem } from '@expo/ui';
import { useQueries } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import type { Collection } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { queryKeys, useArchivedCollections, useCollections, useCountries } from '@/data/queries';
import { searchEverything, type SearchHit, type SearchKind } from '@/data/search';
import { useOnline } from '@/data/useOnlineAction';
import { useLocations } from '@/data/useLocation';
import { tr } from '@/i18n';
import type { IconKey } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { SearchHeader } from '@/ui/MaterialSearch';
import { matchesLocationFilter } from '@/data/locationLibrary';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { photoListItem, usePhotoColumns, photoSection } from '@/ui/PhotoListItem';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';

const ICONS: Record<SearchKind, IconKey> = {
  collection: 'luggage',
  location: 'location',
  lodging: 'lodging',
  transportation: 'train',
  note: 'note',
  checklist: 'checklist',
  country: 'world',
};

/**
 * Search across all collections, their locations, lodging, transportation, notes and checklists, and the
 * countries. Runs on the phone over the offline copy; online, it first loads every collection so nothing is missed.
 */
export default function SearchScreen({
  initialCollectionId,
  embeddedQuery,
}: {
  initialCollectionId?: string;
  embeddedQuery?: string;
} = {}) {
  const photoColumns = usePhotoColumns();
  const params = useLocalSearchParams<{ collectionId?: string; scope?: string; filter?: string }>();
  const collectionId = initialCollectionId ?? params.collectionId;
  const scoped = collectionId ?? null;
  const placesOnly = !scoped && params.scope === 'places';
  const locations = useLocations(!scoped);
  const client = useClient();
  const rt = useRowTheme();
  const online = useOnline();
  const [localQuery, setQuery] = useState('');
  const query = embeddedQuery ?? localQuery;
  const embedded = embeddedQuery !== undefined;
  const collections = useCollections();
  const archived = useArchivedCollections();
  const countries = useCountries();
  const all = useMemo(() => [...(collections.data ?? []), ...(archived.data ?? [])], [collections.data, archived.data]);
  const details = useQueries({
    queries: (scoped ? [scoped] : placesOnly ? [] : all.map((c) => c.id)).map((id) => ({
      queryKey: queryKeys.collection(id),
      queryFn: () => client.getCollection(id),
      // Data only (no photos or files), so loading every collection for the search is cheap.
      enabled: online,
    })),
  });
  const loaded = details.flatMap((d) => (d.data ? [d.data as Collection] : []));
  const loading = placesOnly
    ? locations.isPending && locations.isFetching
    : details.some((d) => d.isPending && d.isFetching) ||
      (!scoped &&
        ((collections.isPending && collections.isFetching) ||
          (archived.isPending && archived.isFetching) ||
          (locations.isPending && locations.isFetching) ||
          (countries.isPending && countries.isFetching)));

  // `loaded` is a new array each render; it only changes when a collection query gets new data.
  const version = details.map((d) => d.dataUpdatedAt).join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoaded = useMemo(() => loaded, [version]);
  const hits = useMemo(
    () =>
      (placesOnly && !query.trim()
        ? (locations.data ?? [])
            .filter((place) => matchesLocationFilter(place, params.filter))
            .map((place): SearchHit => ({
              kind: 'location',
              id: place.id,
              title: place.name,
              subtitle: place.location ?? '',
            }))
        : searchEverything(query, {
            collections: scoped || placesOnly ? [] : all,
            details: stableLoaded,
            countries: scoped || placesOnly ? [] : (countries.data ?? []),
            locations: scoped
              ? []
              : (locations.data ?? []).filter((place) => !placesOnly || matchesLocationFilter(place, params.filter)),
          })
      ).slice(0, 60),
    [query, all, stableLoaded, countries.data, scoped, placesOnly, params.filter, locations.data],
  );

  const missing = (scoped ? 1 : placesOnly ? 0 : all.length) - loaded.length;
  const footer = missing > 0 && !online ? tr('search.offlineUnopened', { count: missing }) : null;

  const placeholder = scoped
    ? tr('search.thisCollection')
    : placesOnly
      ? tr('places.search')
      : tr('search.placesLodgingNotesCountries');
  return (
    <View style={{ flex: 1, backgroundColor: rt.colors.background }}>
      {!embedded ? (
        <Stack.Screen options={{ title: tr('common.search'), headerShown: Platform.OS !== 'android' }} />
      ) : null}
      {!embedded && Platform.OS === 'android' ? (
        <SearchHeader query={query} onChange={setQuery} placeholder={placeholder} onBack={() => router.back()} />
      ) : null}
      {!embedded && Platform.OS === 'ios' ? (
        <Stack.SearchBar
          // The iPhone shows the field at the bottom; iPad would fold it into a header button over a blank page.
          placement={Platform.isPad ? 'stacked' : 'automatic'}
          autoFocus
          hideWhenScrolling={false}
          hideNavigationBar={false}
          obscureBackground={false}
          placeholder={placeholder}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
        />
      ) : null}
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup>
          {query.trim() || placesOnly
            ? photoSection(
                { key: 'photos-10', title: hits.length ? tr('search.results', { count: hits.length }) : undefined },
                <>
                  {hits.length === 0 ? (
                    loading ? (
                      <LoadingRows rows={4} />
                    ) : (
                      <ListItem colors={rt.listColors}>
                        {placesOnly && !locations.data && !online
                          ? tr('common.offlineNoData')
                          : tr('common.nothingFound')}
                      </ListItem>
                    )
                  ) : null}
                  {hits.map((h) =>
                    photoListItem({
                      key: `${h.kind}:${h.id}`,
                      colors: rt.listColors,
                      imageUrl: h.image,
                      icon: <RowIcon name={ICONS[h.kind]} />,
                      title: h.title,
                      subtitle: h.subtitle,
                      onPress: () => open(h),
                    }),
                  )}
                </>,
                photoColumns,
              )
            : null}
          {/* Before anything is typed, say what this search covers instead of showing an empty page. */}
          {collectionId && !query.trim() && !placesOnly ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} leading={<RowIcon name="search" />}>
                <Sub>{tr('search.collectionHint')}</Sub>
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {loading && hits.length > 0 && (query.trim() || placesOnly) ? (
            <FieldGroup.Section>
              <LoadingRows rows={2} />
            </FieldGroup.Section>
          ) : null}
          {footer ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} leading={<RowIcon name={online ? 'refresh' : 'offline'} />}>
                <Sub>{footer}</Sub>
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </View>
  );
}

function open(h: SearchHit) {
  const params = { collectionId: h.collectionId ?? '', itemId: h.id };
  switch (h.kind) {
    case 'collection':
      return router.push({ pathname: '/collection/[id]', params: { id: h.id, name: h.title } });
    case 'country':
      return router.push({ pathname: '/world/[code]', params: { code: h.id, name: h.title } });
    case 'location':
      if (!h.collectionId) return router.push({ pathname: '/place/[id]', params: { id: h.id } });
      return router.push({ pathname: '/location/[collectionId]/[itemId]', params });
    case 'lodging':
      return router.push({ pathname: '/lodging/[collectionId]/[itemId]', params });
    case 'transportation':
      return router.push({ pathname: '/transport/[collectionId]/[itemId]', params });
    default:
      return router.push({ pathname: '/note/[collectionId]/[itemId]', params });
  }
}
