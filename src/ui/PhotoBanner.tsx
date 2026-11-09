import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AuthImage } from './AuthImage';
import { useColors } from './theme';

/** Half as tall as the card is wide, kept between these, so a phone row and an iPad card both read as a photo. */
const MIN_HEIGHT = 150;
const MAX_HEIGHT = 280;

/** The photo's height for a card of this width. */
export const bannerHeight = (width: number) => Math.round(Math.min(Math.max(width / 2, MIN_HEIGHT), MAX_HEIGHT));

/**
 * The full-width photo at the top of a photo card (DESIGN.md → Photo Row). Sized from its own width, so a card in
 * the iPad's two columns gets a shorter photo than one across the list. The Hairline fill is there before the
 * photo loads and stays when it can't (offline without a copy), so rows never jump. Hidden from screen readers:
 * the card's text names it.
 */
export function PhotoBanner({ url, height: fixed }: { url: string; height?: number }) {
  const colors = useColors();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width - 32);
  // A grid row sets one height for all its cards, so the photos line up.
  const height = fixed ?? bannerHeight(width);
  return (
    <View
      style={[styles.frame, { height, backgroundColor: colors.border }]}
      onLayout={fixed ? undefined : (e) => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <AuthImage url={url} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({ frame: { width: '100%', overflow: 'hidden' } });
