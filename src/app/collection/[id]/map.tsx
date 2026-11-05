import { MapCanvas } from '@/ui/MapCanvas';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { MAP_STYLE } from '@/maps/regions';
import { useOfflineMaps } from '@/maps/useOfflineMaps';
import { useOnline } from '@/data/useOnlineAction';
import { BottomSheet, Column, Row, Spacer } from '@expo/ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollectionContext } from '@/data/CollectionContext';
import { mapData, type MapPoint } from '@/data/selectors';
import { tr } from '@/i18n';
import { formatDayLabel } from '@/time/tz';
import { useSelect } from '@/ui/Select';
import { Sub } from '@/ui/Sub';
import { SheetRow } from '@/ui/SheetRow';
import { leadingFor } from '@/ui/entries';
import { openInMaps, RowIcon, useRowTheme } from '@/ui/rows';
import { useColors, useListColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { useTabVisited } from '@/ui/useTabVisited';

const KIND_COLORS = {
  location: '#2563EB',
  lodging: '#C2410C',
  'transport-start': '#059669',
  'transport-end': '#059669',
};

const KIND_LABEL: Record<MapPoint['kind'], () => string> = {
  location: () => tr('common.place'),
  lodging: () => tr('common.accommodation'),
  'transport-start': () => tr('common.departure'),
  'transport-end': () => tr('common.arrival'),
};

export default function MapScreen() {
  const visited = useTabVisited();
  const backgroundColor = useScreenBackground();
  return visited ? <MapScreenContent /> : <View style={{ flex: 1, backgroundColor }} />;
}

function MapScreenContent() {
  const listColors = useListColors();
  const { view, collectionId } = useCollectionContext();
  const online = useOnline();
  const offline = useOfflineMaps(collectionId);
  const colors = useColors();
  const backgroundColor = useScreenBackground();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // iOS draws the map under the translucent navigation bar; Android lays the tab content out below it.
  const headerOffset = Platform.OS === 'ios' ? headerHeight + 12 : 12;
  const [day, setDay] = useState<string>('all');
  const [selected, setSelected] = useState<MapPoint | null>(null);

  const data = useMemo(() => (view ? mapData(view) : { points: [], lines: [] }), [view]);
  const points = useMemo(
    () => (day === 'all' ? data.points : data.points.filter((p) => p.dates.includes(day))),
    [data.points, day],
  );
  const lineIds = useMemo(() => new Set(points.map((p) => p.id)), [points]);
  const lines = useMemo(() => data.lines.filter((l) => day === 'all' || lineIds.has(l.id)), [data.lines, day, lineIds]);

  const pointsGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        id: p.key,
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { key: p.key, kind: p.kind, title: p.title },
      })),
    }),
    [points],
  );
  const linesGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: lines.map((l) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [l.from, l.to] },
        properties: { type: l.type },
      })),
    }),
    [lines],
  );

  const bounds = useMemo(() => {
    // Fit where we actually are (lodgings + locations); far-away departure airports only when nothing else is shown.
    const local = points.filter((p) => p.kind === 'location' || p.kind === 'lodging');
    const coords = (local.length > 0 ? local : points).map((p) => [p.longitude, p.latitude] as const);
    if (coords.length === 0) return null;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const pad = coords.length === 1 ? 0.02 : 0;
    return [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad] as [
      number,
      number,
      number,
      number,
    ];
  }, [points]);

  const daySelect = useSelect(useRowTheme(), {
    title: tr('common.chooseDay'),
    value: day,
    onChange: setDay,
    hint: tr('map.points', { count: points.length }),
    options: [
      { value: 'all', label: tr('map.wholeTrip') },
      ...(view?.days ?? []).map((d) => ({
        value: d.date,
        label: `${tr('common.dayN', { n: d.number })} · ${formatDayLabel(d.date)}`,
      })),
    ],
  });

  if (!view) return <View style={{ flex: 1, backgroundColor }} />;

  const openDetail = (p: MapPoint) => {
    setSelected(null);
    const collectionId = view.collection.id;
    if (p.kind === 'location')
      router.push({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
    else if (p.kind === 'lodging')
      router.push({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
    else router.push({ pathname: '/transport/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
  };

  const imagesFor = (p: MapPoint) =>
    p.kind === 'location'
      ? view.collection.locations.find((l) => l.id === p.id)?.images
      : p.kind === 'lodging'
        ? view.collection.lodging.find((l) => l.id === p.id)?.images
        : view.collection.transportations.find((t) => t.id === p.id)?.images;

  const padding = { top: headerOffset + 120, bottom: 100 + insets.bottom, left: 40, right: 40 };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <MapCanvas
        style={StyleSheet.absoluteFill}
        mapStyle={
          !online && offline.regions.length ? MAP_STYLE.light : scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light
        }
        logo={false}
        compass>
        <Camera
          {...(bounds ? { bounds, padding, duration: 600, easing: 'ease' as const } : {})}
          initialViewState={bounds ? { bounds, padding } : undefined}
        />
        <GeoJSONSource id="lines" data={linesGeo}>
          <Layer
            type="line"
            id="transport-lines"
            paint={{ 'line-color': KIND_COLORS['transport-start'], 'line-width': 2.5, 'line-dasharray': [2, 1.5] }}
          />
        </GeoJSONSource>
        <GeoJSONSource
          id="points"
          data={pointsGeo}
          hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}
          onPress={(e) => {
            const key = e.nativeEvent.features[0]?.properties?.key as string | undefined;
            const point = key ? points.find((p) => p.key === key) : undefined;
            if (point) setSelected(point);
          }}>
          <Layer
            type="circle"
            id="point-circles"
            paint={{
              'circle-radius': ['match', ['get', 'kind'], 'lodging', 9, 7],
              'circle-color': [
                'match',
                ['get', 'kind'],
                'lodging',
                KIND_COLORS.lodging,
                'location',
                KIND_COLORS.location,
                KIND_COLORS['transport-start'],
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
        </GeoJSONSource>
      </MapCanvas>

      <View style={[styles.filter, { top: headerOffset, backgroundColor: colors.card }]}>
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <Column spacing={0} style={{ paddingHorizontal: Platform.OS === 'ios' ? 8 : 0 }}>
            {Platform.OS === 'android' ? (
              daySelect.row
            ) : (
              <Row
                alignment="center"
                style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                modifiers={[frame({ minHeight: 44 })]}>
                <Text textStyle={{ color: colors.secondary }}>{tr('map.points', { count: points.length })}</Text>
                <Spacer flexible />
                {daySelect.row}
              </Row>
            )}
            <SheetRow
              colors={listColors}
              leading={<RowIcon name="offline" />}
              onPress={() => router.push({ pathname: '/offline-maps/[collectionId]', params: { collectionId } })}>
              {tr('common.offlineMaps')}
            </SheetRow>
          </Column>
        </Host>
      </View>
      {daySelect.sheet}

      <BottomSheet
        isPresented={!!selected}
        onDismiss={() => setSelected(null)}
        contentPadding={{ top: 20, bottom: 16, left: 16, right: 16 }}>
        {selected ? (
          <Column spacing={0}>
            <SheetRow
              colors={listColors}
              leading={leadingFor(
                imagesFor(selected),
                <RowIcon
                  name={selected.kind === 'lodging' ? 'lodging' : selected.kind === 'location' ? 'location' : 'train'}
                />,
              )}
              supportingText={<Sub>{[KIND_LABEL[selected.kind](), selected.subtitle].filter(Boolean).join(' · ')}</Sub>}
              onPress={() => openDetail(selected)}>
              {selected.title}
            </SheetRow>
            <SheetRow
              colors={listColors}
              leading={<RowIcon name="pin" />}
              onPress={() => openInMaps(selected.title, selected.latitude, selected.longitude)}>
              {tr('common.openInMaps')}
            </SheetRow>
          </Column>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filter: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: Platform.OS === 'android' ? 0 : 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
