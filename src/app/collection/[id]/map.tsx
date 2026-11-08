import { MapFrame } from '@/ui/MapFrame';
import { PointLayer } from '@/ui/mapPoints';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { MAP_STYLE } from '@/maps/regions';
import { useOfflineMaps } from '@/maps/useOfflineMaps';
import { useOnline } from '@/data/useOnlineAction';
import { Column, Row, Spacer } from '@expo/ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { useCollectionContext } from '@/data/CollectionContext';
import { mapData, type MapPoint } from '@/data/selectors';
import { pinBounds } from '@/data/world';
import { tr } from '@/i18n';
import { dayLabel } from '@/ui/dayPlan';
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
  'transport-start': '#7C3AED',
  'transport-end': '#7C3AED',
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
    return pinBounds(local.length > 0 ? local : points);
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
        label: dayLabel(d),
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

  const mapStyle =
    !online && offline.regions.length ? MAP_STYLE.light : scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light;

  return (
    <MapFrame
      bounds={bounds}
      topReserve={120}
      mapStyle={mapStyle}
      topStyle={{ paddingVertical: Platform.OS === 'android' ? 0 : 4, backgroundColor: colors.card }}
      presented={!!selected}
      onDismiss={() => setSelected(null)}
      extra={daySelect.sheet}
      top={
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
      }
      sheet={
        selected ? (
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
        ) : null
      }>
      <GeoJSONSource id="lines" data={linesGeo}>
        <Layer
          type="line"
          id="transport-lines"
          paint={{ 'line-color': KIND_COLORS['transport-start'], 'line-width': 2.5, 'line-dasharray': [2, 1.5] }}
        />
      </GeoJSONSource>
      <PointLayer
        id="points"
        data={pointsGeo}
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
        onPress={(properties) => {
          const key = properties.key;
          const point = typeof key === 'string' ? points.find((p) => p.key === key) : undefined;
          if (point) setSelected(point);
        }}
      />
    </MapFrame>
  );
}
