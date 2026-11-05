import type { TextProps } from '@expo/ui';

type Weight = NonNullable<NonNullable<TextProps['textStyle']>['fontWeight']>;

const HEAVIER: Record<Weight, Weight> = {
  normal: '600',
  bold: '800',
  '100': '300',
  '200': '400',
  '300': '500',
  '400': '600',
  '500': '700',
  '600': '800',
  '700': '800',
  '800': '900',
  '900': '900',
};

/** Explicit fonts need the app's bold preference too; keep the existing hierarchy. */
export function legibleWeight(weight: Weight | undefined, bold: boolean): Weight | undefined {
  return bold ? HEAVIER[weight ?? 'normal'] : weight;
}
