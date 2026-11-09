import { Platform, useWindowDimensions } from 'react-native';

/** From here an iPad window is regular width; Slide Over and a narrow Split View stay compact (docs/IPAD.md). */
export const REGULAR_WIDTH = 700;

/** A regular-width iPad window: tabs at the top, photo cards two by two. The phone and Android stay compact. */
export function useRegularWidth(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'ios' && Platform.isPad && width >= REGULAR_WIDTH;
}
