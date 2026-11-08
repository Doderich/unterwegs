import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

/** A finger has to land this close to a circle to count as a tap. */
export const POINT_HITBOX = { top: 22, right: 22, bottom: 22, left: 22 };

/** Circles for a set of points. The caller decides the paint and what a tap means. */
export function PointLayer({
  id,
  data,
  paint,
  onPress,
}: {
  id: string;
  data: GeoJSON.FeatureCollection;
  paint: CircleLayerSpecification['paint'];
  onPress: (properties: Record<string, unknown>) => void;
}) {
  return (
    <GeoJSONSource
      id={id}
      data={data}
      hitbox={POINT_HITBOX}
      onPress={(event) => {
        const properties = event.nativeEvent.features[0]?.properties;
        if (properties) onPress(properties as Record<string, unknown>);
      }}>
      <Layer type="circle" id={`${id}-circles`} paint={paint} />
    </GeoJSONSource>
  );
}
