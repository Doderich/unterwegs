import { Text as UIText, type TextProps } from '@expo/ui';
import { font } from '@expo/ui/swift-ui/modifiers';

import { useSettings } from '@/settings/store';

import { legibleWeight } from './textWeight';

type TextStyleName = NonNullable<Parameters<typeof font>[0]['textStyle']>;
type Weight = NonNullable<Parameters<typeof font>[0]['weight']>;

/** iOS default point size of each text style; a fixed `fontSize` maps to the nearest one. */
const STYLES: [number, TextStyleName][] = [
  [11, 'caption2'],
  [12, 'caption'],
  [13, 'footnote'],
  [15, 'subheadline'],
  [16, 'callout'],
  [17, 'body'],
  [20, 'title3'],
  [22, 'title2'],
  [28, 'title'],
  [34, 'largeTitle'],
];

const WEIGHTS: Record<string, Weight> = {
  normal: 'regular',
  bold: 'bold',
  '100': 'ultraLight',
  '200': 'thin',
  '300': 'light',
  '400': 'regular',
  '500': 'medium',
  '600': 'semibold',
  '700': 'bold',
  '800': 'heavy',
  '900': 'black',
};

function nearestStyle(size: number): TextStyleName {
  return STYLES.reduce((best, s) => (Math.abs(s[0] - size) < Math.abs(best[0] - size) ? s : best))[1];
}

/**
 * `@expo/ui` Text that follows Dynamic Type (and the app's text size). A plain `fontSize` would become a
 * fixed-size SwiftUI font, so it is mapped to the nearest text style instead.
 */
export function Text({ textStyle, modifiers, ...props }: TextProps) {
  const { boldText } = useSettings();
  if (!boldText && textStyle?.fontSize == null && textStyle?.fontWeight == null) {
    return <UIText textStyle={textStyle} modifiers={modifiers} {...props} />;
  }
  const { fontSize, fontWeight, ...rest } = textStyle ?? {};
  const weight = legibleWeight(fontWeight, boldText);
  const scaled = font({
    textStyle: nearestStyle(fontSize ?? 17),
    weight: weight ? WEIGHTS[weight] : undefined,
  });
  return <UIText textStyle={rest} modifiers={[scaled, ...(modifiers ?? [])]} {...props} />;
}
