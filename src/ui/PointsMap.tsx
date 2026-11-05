import { MapCanvas } from '@/ui/MapCanvas';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { MAP_STYLE } from '@/maps/regions';
import { BottomSheet, Column, Row, Spacer } from '@expo/ui';
import { Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { pinBounds } from '@/data/world';
import { tr } from '@/i18n';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from './Host';

const VISITED = '#059669';
const OPEN = '#2563EB';

export type MapPoint = { id: string; latitude: number; longitude: number; visited: boolean };

/**
 * A full-screen map of points, green when visited, with a legend on top and a bottom sheet for the tapped point.
 * Used for all locations, the regions of a country and the cities of a region.
 */
export function PointsMap({
  points,
  loading,
  countLabel,
  openLabel,
  renderSelected,
}: {
  points: MapPoint[];
  loading: boolean;
  /** Left of the legend, e.g. "47 Regionen". */
  countLabel: string;
  /** Legend text for points that aren't visited, e.g. "offen". */
  openLabel: string;
  renderSelected: (id: string, close: () => void) => ReactNode;
}) {
  const colors = useColors();
  const backgroundColor = useScreenBackground();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const headerOffset = Platform.OS === 'ios' ? headerHeight + 12 : 12;
  const [selected, setSelected] = useState<string | null>(null);

  const bounds = useMemo(() => pinBounds(points), [points]);
  const visitedCount = points.filter((p) => p.visited).length;
  const geo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: points.map((p) => ({
        type: 'Feature',
        id: p.id,
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { id: p.id, visited: p.visited },
      })),
    }),
    [points],
  );

  const padding = { top: headerOffset + 70, bottom: 100 + insets.bottom, left: 40, right: 40 };
  const close = () => setSelected(null);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <MapCanvas
        style={StyleSheet.absoluteFill}
        mapStyle={scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light}
        logo={false}
        compass>
        <Camera
          {...(bounds ? { bounds, padding, duration: 600, easing: 'ease' as const } : {})}
          initialViewState={bounds ? { bounds, padding } : undefined}
        />
        <GeoJSONSource
          id="points"
          data={geo}
          hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}
          onPress={(e) => {
            const id = e.nativeEvent.features[0]?.properties?.id as string | undefined;
            if (id) setSelected(id);
          }}>
          <Layer
            type="circle"
            id="point-circles"
            paint={{
              'circle-radius': 7,
              'circle-color': ['case', ['get', 'visited'], VISITED, OPEN],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
        </GeoJSONSource>
      </MapCanvas>

      <View style={[styles.legend, { top: headerOffset, backgroundColor: colors.card }]}>
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <Row alignment="center" style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text textStyle={{ color: colors.secondary }}>{loading ? tr('common.loading') : countLabel}</Text>
            <Spacer flexible />
            <Text textStyle={{ color: VISITED }}>{'● '}</Text>
            <Text textStyle={{ color: colors.secondary }}>{tr('pointsMap.nVisited', { n: visitedCount })}</Text>
            <Text textStyle={{ color: OPEN }}>{'  ● '}</Text>
            <Text textStyle={{ color: colors.secondary }}>{openLabel}</Text>
          </Row>
        </Host>
      </View>

      <BottomSheet
        isPresented={!!selected}
        onDismiss={close}
        contentPadding={{ top: 20, bottom: 16, left: 16, right: 16 }}>
        {selected ? <Column spacing={4}>{renderSelected(selected, close)}</Column> : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legend: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
