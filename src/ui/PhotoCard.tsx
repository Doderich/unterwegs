import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { bannerHeight, PhotoBanner } from './PhotoBanner';
import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';
import { TapPressable } from './TapPressable';

export type PhotoRowProps = {
  url: string;
  title: string;
  subtitle?: string | null;
  subtitleColor?: string;
  onPress?: () => void;
};

/** Space between two photo cards, and above and below a run of them. */
export const PHOTO_CARD_GAP = 12;

/**
 * One photo row as its own card (DESIGN.md → Photo Row): the photo across the top, the name and context line
 * below, rounded and with space around it, so each place in a list reads as somewhere of its own.
 */
export function PhotoCard({
  url,
  title,
  subtitle,
  subtitleColor,
  onPress,
  photoHeight,
  oneLine = false,
}: PhotoRowProps & { photoHeight?: number; oneLine?: boolean }) {
  const colors = useColors();
  return (
    <TapPressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card }, pressed && styles.pressed]}>
      <PhotoBanner url={url} height={photoHeight} />
      <View style={styles.text}>
        <ScaledText numberOfLines={oneLine ? 1 : undefined} style={{ ...typeScale.body, color: colors.text }}>
          {title}
        </ScaledText>
        {/* In a grid every card keeps its second line, empty or not, so all cards are the same height. */}
        {subtitle || oneLine ? (
          <ScaledText
            numberOfLines={oneLine ? 1 : undefined}
            style={{ ...typeScale.supporting, color: subtitleColor ?? colors.secondary }}>
            {subtitle || ' '}
          </ScaledText>
        ) : null}
      </View>
    </TapPressable>
  );
}

/** The inset-grouped list's side margin in a regular-width iPad window, for the first frame before measuring. */
const LIST_MARGIN = 20;

/**
 * One card across the row, or several side by side (DESIGN.md → Photo Row). Every card in a grid has the same
 * width, photo height and number of text lines, whatever its name or photo. The list row gives its content no fixed
 * width, so the row starts from the window's width and then measures itself; a missing partner leaves its space
 * empty.
 */
export function PhotoCards({ cards, columns = cards.length }: { cards: PhotoRowProps[]; columns?: number }) {
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width - 2 * LIST_MARGIN);
  if (cards.length === 1 && columns === 1) return <PhotoCard {...cards[0]} />;
  const count = Math.max(columns, cards.length);
  const cell = Math.floor((width - PHOTO_CARD_GAP * (count - 1)) / count);
  return (
    <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: cell }}>
          {cards[i] ? <PhotoCard {...cards[i]} photoHeight={bannerHeight(cell)} oneLine /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', gap: PHOTO_CARD_GAP },
  card: { borderRadius: 20, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  text: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 4 },
});
