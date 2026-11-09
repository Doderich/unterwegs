import { MapFrame } from '@/ui/MapFrame';
import { PointLayer } from '@/ui/mapPoints';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { MAP_STYLE } from '@/maps/regions';
import { useOfflineMaps } from '@/maps/useOfflineMaps';
import { useOnline } from '@/data/useOnlineAction';
import { Column, RNHostView, Row, Spacer } from '@expo/ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollectionContext } from '@/data/CollectionContext';
import { mapData, type Day, type MapPoint } from '@/data/selectors';
import { pinBounds } from '@/data/world';
import { tr } from '@/i18n';
import { dayChoices, dayLabel } from '@/ui/dayPlan';
import { useActionSheet } from '@/ui/ActionSheet';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { dayColor, dayMapPoints, type DayMapPoint } from '@/data/dayMap';
import { useSelect } from '@/ui/Select';
import { Sub } from '@/ui/Sub';
import { SheetRow } from '@/ui/SheetRow';
import { firstImage } from '@/data/images';
import { PhotoBanner } from '@/ui/PhotoBanner';
import { openInMaps, RowIcon, useRowTheme } from '@/ui/rows';
import { useColors, useListColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { CollectionLoading } from '@/ui/CollectionLoading';
import { Host } from '@/ui/Host';
import { MapFab } from '@/ui/UserOnMap';
import { useTabVisited } from '@/ui/useTabVisited';
import { CollectionTabHeader } from '@/ui/CollectionTabStack';

const LINE_COLOR = '#7C3AED';

/** Stays are where a day starts and ends: neutral, so they never read as one of the days. */
const STAY_COLOR = { light: '#1F2937', dark: '#E5E7EB' };
const OPEN_COLOR = '#8E8E93';

/** Colour, size and day number of a marker. With the whole collection the number tells the day; colour helps. */
function markerStyle(p: DayMapPoint, all: boolean, dark: boolean) {
  if (p.kind === 'lodging')
    return { color: dark ? STAY_COLOR.dark : STAY_COLOR.light, radius: 9, opacity: p.role === 'start' ? 0.7 : 1 };
  if (p.role === 'open') return { color: OPEN_COLOR, radius: 6, opacity: all ? 1 : 0.55 };
  const color = p.dayNumber ? dayColor(p.dayNumber, dark) : OPEN_COLOR;
  if (p.kind !== 'location') return { color, radius: 6, opacity: 1 };
  return all && p.dayNumber
    ? { color, radius: 10, opacity: 1, label: String(p.dayNumber) }
    : { color, radius: 8, opacity: 1 };
}

/** "Day 2 · Tue, 2 Feb", "Not on a day yet", or for a stay where the selected day starts, "Last night". */
function dayLine(p: DayMapPoint, days: Day[]): string | null {
  if (p.role === 'open') return tr('map.onNoDay');
  if (p.role === 'start') return tr('map.lastNight');
  if (p.role === 'tonight') return tr('today.tonight');
  const day = days.find((d) => d.number === p.dayNumber);
  return day ? dayLabel(day) : null;
}

const KIND_LABEL: Record<MapPoint['kind'], () => string> = {
  location: () => tr('common.place'),
  lodging: () => tr('common.accommodation'),
  'transport-start': () => tr('common.departure'),
  'transport-end': () => tr('common.arrival'),
};

export function MapScreen() {
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
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const [day, setDay] = useState<string>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const daySheet = useActionSheet(rt);
  const dark = scheme === 'dark';

  const data = useMemo(() => (view ? mapData(view) : { points: [], lines: [] }), [view]);
  const mapDays = useMemo(
    () =>
      (view?.days ?? []).map((d) => ({ date: d.date, number: d.number, nightLodgingId: d.nightLodging?.id ?? null })),
    [view],
  );
  // Colour by day, or one day with its stays and the places still open (docs/IPAD.md → The day map).
  const points = useMemo(() => dayMapPoints(data.points, mapDays, day), [data.points, mapDays, day]);
  // Follows the point through an edit, so moving it to another day updates the open sheet.
  const selected = points.find((p) => p.key === selectedKey) ?? null;
  const setSelected = (p: DayMapPoint | null) => setSelectedKey(p?.key ?? null);
  const lineIds = useMemo(() => new Set(points.filter((p) => p.role !== 'open').map((p) => p.id)), [points]);
  const lines = useMemo(() => data.lines.filter((l) => day === 'all' || lineIds.has(l.id)), [data.lines, day, lineIds]);

  const pointsGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        id: p.key,
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { key: p.key, kind: p.kind, title: p.title, ...markerStyle(p, day === 'all', dark) },
      })),
    }),
    [points, day, dark],
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
    // A single day frames its own places and stays; the open places around it may fall outside.
    const shown = day === 'all' ? points : points.filter((p) => p.role !== 'open');
    const local = shown.filter((p) => p.kind === 'location' || p.kind === 'lodging');
    return pinBounds(local.length > 0 ? local : shown.length > 0 ? shown : points);
  }, [points, day]);

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

  if (!view) return <CollectionLoading />;

  const openDetail = (p: MapPoint) => {
    setSelected(null);
    const collectionId = view.collection.id;
    if (p.kind === 'location')
      router.push({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
    else if (p.kind === 'lodging')
      router.push({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
    else router.push({ pathname: '/transport/[collectionId]/[itemId]', params: { collectionId, itemId: p.id } });
  };

  /**
   * Putting a place on a day from the map: the same day-plan edits as the day list, through the outbox, so they
   * work offline. Stays and connections are dated by their own times and stay where they are.
   */
  const dayActions = (p: DayMapPoint) => {
    if (p.kind !== 'location' || !edits.canEdit) return [];
    const entryOn = (date: string) =>
      view.days.find((d) => d.date === date)?.entries.find((e) => e.kind === 'location' && e.location.id === p.id);
    const chooseDay = (except: string | undefined, onPick: (target: Day) => unknown) =>
      daySheet.open(
        tr('common.whichDayConfirm'),
        dayChoices(view.days, (target) => void onPick(target), except ? { except } : undefined),
      );
    const current = day !== 'all' ? day : p.dates.length === 1 ? p.dates[0] : undefined;
    const entry = current ? entryOn(current) : undefined;
    const target = day !== 'all' ? view.days.find((d) => d.date === day) : undefined;
    if (target && p.role === 'open')
      return [
        {
          key: 'put',
          icon: 'addToPlan' as const,
          label: tr('map.putOnDay', { day: dayLabel(target) }),
          onPress: () => void edits.addToDay(target.date, 'location', p.id),
        },
      ];
    if (entry && current)
      return [
        {
          key: 'move',
          icon: 'days' as const,
          label: tr('dayEdit.moveAnotherDay'),
          onPress: () => chooseDay(current, (to) => edits.moveEntryToDay(to, entry)),
        },
        ...(day !== 'all'
          ? [
              {
                key: 'remove',
                icon: 'remove' as const,
                label: tr('dayEdit.removeFromDay'),
                onPress: () => void edits.removeEntry(entry),
              },
            ]
          : []),
      ];
    return [
      {
        key: 'add',
        icon: 'addToPlan' as const,
        label: tr('days.addDay'),
        onPress: () => chooseDay(undefined, (to) => edits.addToDay(to.date, 'location', p.id)),
      },
    ];
  };

  const imagesFor = (p: MapPoint) =>
    p.kind === 'location'
      ? view.collection.locations.find((l) => l.id === p.id)?.images
      : p.kind === 'lodging'
        ? view.collection.lodging.find((l) => l.id === p.id)?.images
        : view.collection.transportations.find((t) => t.id === p.id)?.images;

  const previewPhoto = selected ? firstImage(imagesFor(selected))?.image : undefined;

  const mapStyle =
    !online && offline.regions.length ? MAP_STYLE.light : scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light;

  return (
    <MapFrame
      bounds={bounds}
      topReserve={64}
      mapStyle={mapStyle}
      topStyle={{ paddingVertical: Platform.OS === 'android' ? 0 : 4, backgroundColor: colors.card }}
      presented={!!selected}
      onDismiss={() => setSelected(null)}
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
          </Column>
        </Host>
      }
      extra={
        <>
          {daySelect.sheet}
          {daySheet.sheet}
          {selected ? null : (
            <MapFab
              label={tr('common.offlineMaps')}
              name={{ ios: 'icloud.slash', android: 'cloud_off' }}
              bottom={insets.bottom + 128}
              onPress={() => router.push({ pathname: '/offline-maps/[collectionId]', params: { collectionId } })}
            />
          )}
        </>
      }
      sheet={
        selected ? (
          <Column spacing={0}>
            {/* The photo across the card, as in every list (DESIGN.md → Photo Row). */}
            {previewPhoto ? (
              <RNHostView matchContents={{ vertical: true }}>
                <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 4 }}>
                  <PhotoBanner url={previewPhoto} />
                </View>
              </RNHostView>
            ) : null}
            <SheetRow
              colors={listColors}
              leading={
                <RowIcon
                  name={selected.kind === 'lodging' ? 'lodging' : selected.kind === 'location' ? 'location' : 'train'}
                />
              }
              supportingText={
                <Sub>
                  {[KIND_LABEL[selected.kind](), dayLine(selected, view.days), selected.subtitle]
                    .filter(Boolean)
                    .join(' · ')}
                </Sub>
              }
              onPress={() => openDetail(selected)}>
              {selected.title}
            </SheetRow>
            {dayActions(selected).map((action) => (
              <SheetRow
                key={action.key}
                colors={listColors}
                leading={<RowIcon name={action.icon} />}
                onPress={action.onPress}>
                {action.label}
              </SheetRow>
            ))}
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
          paint={{ 'line-color': LINE_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] }}
        />
      </GeoJSONSource>
      <PointLayer
        id="points"
        data={pointsGeo}
        labels
        paint={{
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': ['get', 'opacity'],
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

export default function MapScreenTab() {
  return (
    <>
      <CollectionTabHeader />
      <MapScreen />
    </>
  );
}
