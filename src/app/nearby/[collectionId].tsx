import { FieldGroup, ListItem } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { RecommendationCategory } from '@/api/client';
import type { Recommendation } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { useCollectionView, useIntegrations } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useDuplicateGuard } from '@/ui/duplicateGuard';
import { tr } from '@/i18n';
import { useActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { formatDistance } from '@/ui/format';
import { starsLabel } from '@/ui/forms';
import { openInMaps, openUrl, RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';

const categoryOptions = () => [
  { value: 'tourism', label: tr('nearby.sights') },
  { value: 'food', label: tr('nearby.foodDrink') },
  { value: 'lodging', label: tr('common.stays') },
];

/**
 * Places near a point (from the server's recommendations: OpenStreetMap, plus Google when set up there).
 * Online only and not kept offline; a place can be added to the collection as a location.
 */
export default function NearbyScreen() {
  const { collectionId, lat, lon, name } = useLocalSearchParams<{
    collectionId: string;
    lat: string;
    lon: string;
    name?: string;
  }>();
  const client = useClient();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const sheet = useActionSheet(rt);
  const guardDuplicate = useDuplicateGuard(edits, view);
  const [category, setCategory] = useState<RecommendationCategory>('tourism');
  const [adding, setAdding] = useState<string | null>(null);
  const latitude = Number(lat);
  const longitude = Number(lon);

  // With a Google key on the server, Google answers in seconds; Overpass only as its fallback.
  const sources = useIntegrations().data?.google_maps ? 'google' : 'osm';
  const places = useQuery({
    queryKey: ['recommendations', latitude, longitude, category, sources],
    queryFn: () => client.recommendations(latitude, longitude, category, sources),
    enabled: edits.can('quickAdd') && Number.isFinite(latitude) && Number.isFinite(longitude),
    // Not part of the offline copy: an old list of places is worth less than the storage.
    gcTime: 0,
    retry: false,
  });
  const categorySelect = useSelect(rt, {
    title: tr('nearby.lookingFor'),
    label: tr('nearby.lookingFor'),
    value: category,
    options: categoryOptions(),
    onChange: (v) => setCategory(v as RecommendationCategory),
  });

  const known = new Set(view?.collection.locations.map((l) => l.name.trim().toLowerCase()) ?? []);

  const quickInput = (p: Recommendation) => ({
    name: p.name,
    latitude: p.latitude!,
    longitude: p.longitude!,
    location: p.address ?? null,
    description: p.description ?? null,
    link: p.website ?? null,
    rating: p.rating ?? null,
    types: p.types ?? [],
    photos: (p.photos ?? []).slice(0, 5),
  });

  /** As a location: the duplicate check first, then quick-add (address, photos and tags from the place). */
  const addLocation = async (p: Recommendation) => {
    if (p.latitude == null || p.longitude == null) return;
    setAdding(p.id);
    const create = await guardDuplicate({
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      location: p.address,
    });
    const saved = create ? await edits.quickAdd('location', quickInput(p)) : null;
    setAdding(null);
    if (saved)
      router.replace({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: saved.id } });
  };

  /** As a lodging: quick-add, then the form for check-in and check-out. */
  const addLodging = async (p: Recommendation) => {
    if (p.latitude == null || p.longitude == null) return;
    setAdding(p.id);
    const saved = await edits.quickAdd('lodging', quickInput(p));
    setAdding(null);
    if (saved) router.replace({ pathname: '/lodging-edit/[collectionId]', params: { collectionId, itemId: saved.id } });
  };

  const open = (p: Recommendation) => {
    const actions: SheetAction[] = [
      {
        label: tr('nearby.addTripAsPlace'),
        icon: 'add',
        disabled: !edits.can('quickAdd') || !!adding || p.latitude == null,
        onPress: () => addLocation(p),
      },
      ...(category === 'lodging'
        ? [
            {
              label: tr('nearby.addAsLodging'),
              icon: 'lodging' as const,
              disabled: !edits.can('quickAdd') || !!adding || p.latitude == null,
              onPress: () => addLodging(p),
            },
          ]
        : []),
      { label: tr('common.openInMaps'), icon: 'map', onPress: () => openInMaps(p.name, p.latitude, p.longitude) },
    ];
    if (p.website) actions.push({ label: tr('common.website'), icon: 'external', onPress: () => openUrl(p.website!) });
    sheet.open(p.name, actions);
  };

  const status = !edits.can('quickAdd')
    ? tr('common.onlyWithInternet')
    : places.isPending
      ? tr('nearby.searchingCanTakeUpMinute')
      : places.isError
        ? tr('nearby.serverCantFindPlacesRight')
        : places.data?.length
          ? null
          : tr('nearby.nothingFoundNearby');

  return (
    <>
      <Stack.Screen options={{ title: name ? tr('nearby.nearName', { name }) : tr('common.nearby') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>{categorySelect.row}</FieldGroup.Section>
          <FieldGroup.Section title={tr('nearby.within5Km')}>
            {status ? <ListItem colors={rt.listColors}>{status}</ListItem> : null}
            {(places.data ?? []).map((p) => (
              <ListItem
                key={p.id}
                colors={rt.listColors}
                leading={<RowIcon name="location" />}
                supportingText={
                  <Sub>
                    {[
                      formatDistance(p.distance_km),
                      starsLabel(p.rating),
                      known.has(p.name.trim().toLowerCase()) ? tr('nearby.alreadyInTrip') : null,
                      p.address,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Sub>
                }
                onPress={() => open(p)}>
                {adding === p.id ? tr('common.adding') : p.name}
              </ListItem>
            ))}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {categorySelect.sheet}
      {sheet.sheet}
    </>
  );
}
