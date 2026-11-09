import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

/** A finger has to land this close to a circle to count as a tap. */
export const POINT_HITBOX = { top: 22, right: 22, bottom: 22, left: 22 };

/** In both map styles, so saved offline areas have its glyphs. */
const LABEL_FONT = ['Noto Sans Regular'];

/**
 * Circles for a set of points. The caller decides the paint and what a tap means. With `labels`, a feature's
 * `label` property is written in its circle (the day number on the collection map).
 */
export function PointLayer({
  id,
  data,
  paint,
  labels = false,
  onPress,
}: {
  id: string;
  data: GeoJSON.FeatureCollection;
  paint: CircleLayerSpecification['paint'];
  labels?: boolean;
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
      {labels ? (
        <Layer
          type="symbol"
          id={`${id}-labels`}
          filter={['has', 'label']}
          layout={{
            'text-field': ['get', 'label'],
            'text-font': LABEL_FONT,
            'text-size': 11,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }}
          paint={{ 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(0,0,0,0.45)', 'text-halo-width': 1 }}
        />
      ) : null}
    </GeoJSONSource>
  );
}
