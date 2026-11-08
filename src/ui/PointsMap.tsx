import { Column, Row, Spacer } from '@expo/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { pinBounds } from '@/data/world';
import { tr } from '@/i18n';
import { MAP_STYLE } from '@/maps/regions';

import { Host } from './Host';
import { MapFrame } from './MapFrame';
import { PointLayer } from './mapPoints';
import { Text } from './Text';
import { useColors } from './theme';

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
  const scheme = useColorScheme();
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
  const close = () => setSelected(null);

  return (
    <MapFrame
      bounds={bounds}
      topReserve={70}
      mapStyle={scheme === 'dark' ? MAP_STYLE.dark : MAP_STYLE.light}
      presented={!!selected}
      onDismiss={close}
      topStyle={{ backgroundColor: colors.card }}
      top={
        <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <Row alignment="center" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text textStyle={{ color: colors.secondary }}>{loading ? tr('common.loading') : countLabel}</Text>
            <Spacer flexible />
            <Text textStyle={{ color: VISITED }}>{'● '}</Text>
            <Text textStyle={{ color: colors.secondary }}>{tr('pointsMap.nVisited', { n: visitedCount })}</Text>
            <Text textStyle={{ color: OPEN }}>{'  ● '}</Text>
            <Text textStyle={{ color: colors.secondary }}>{openLabel}</Text>
          </Row>
        </Host>
      }
      sheet={selected ? <Column spacing={4}>{renderSelected(selected, close)}</Column> : null}>
      <PointLayer
        id="points"
        data={geo}
        paint={{
          'circle-radius': 7,
          'circle-color': ['case', ['get', 'visited'], VISITED, OPEN],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        }}
        onPress={(properties) => {
          const id = properties.id;
          if (typeof id === 'string') setSelected(id);
        }}
      />
    </MapFrame>
  );
}
