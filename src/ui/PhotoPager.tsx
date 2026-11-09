import PagerView from '@expo/ui/community/pager-view';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';

import type { Image } from '@/api/schemas';
import { tr } from '@/i18n';
import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';

import { AuthImage } from './AuthImage';
import { useColors } from './theme';
import { legibleWeight } from './textWeight';
import { TapPressable } from './TapPressable';

/** Primary image first, then the rest in server order. */
export function sortedImages(images: Image[]): Image[] {
  return [...images].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary));
}

/**
 * Swipeable photos of one resource. The frame follows the screen: about a third of the window height, between 4:3
 * and 16:10 of the width, so tall phones get a generous photo and wide screens (unfolded, tablet, landscape) keep
 * the facts below in view. The frame is reserved before the photos load
 * (no jump), a "2 / 5" pill shows the position, and a tap opens the full-screen gallery (cover / delete when
 * `collectionId` is given). React Native view: host it with ResourceGallery.
 */
export function PhotoPager({
  images,
  title,
  collectionId,
  ratio,
  inset,
  rounded = false,
}: {
  images: Image[];
  title: string;
  collectionId?: string;
  /** Fixed width ÷ height instead of the screen-dependent frame (e.g. a compact strip). */
  ratio?: number;
  /** Horizontal space around the frame, to size it before the first layout pass. */
  inset: number;
  /** Rounded corners when the frame sits inside a card's padding (Android). */
  rounded?: boolean;
}) {
  const colors = useColors();
  const window = useWindowDimensions();
  const settings = useSettings();
  const [width, setWidth] = useState(window.width - inset);
  const [page, setPage] = useState(0);
  const sorted = sortedImages(images);
  const height = Math.round(ratio ? width / ratio : frameHeight(width, window.height));
  // The pill sits in a fixed frame: it grows with the text size, capped at 1.4× (DESIGN.md Fixed-Box Cap Rule).
  const appScale = rnTextScale(settings.textSize);

  const open = (index: number) =>
    router.push({
      pathname: '/gallery',
      params: {
        urls: JSON.stringify(sorted.map((i) => i.image)),
        index: String(index),
        title,
        ...(collectionId ? { collectionId } : {}),
      },
    });

  return (
    <View
      style={{
        width: '100%',
        height,
        backgroundColor: colors.border,
        borderRadius: rounded ? 12 : 0,
        overflow: 'hidden',
      }}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <PagerView style={StyleSheet.absoluteFill} onPageSelected={(e) => setPage(e.nativeEvent.position)}>
        {sorted.map((img, index) => (
          <TapPressable
            key={img.id}
            style={StyleSheet.absoluteFill}
            accessibilityRole="imagebutton"
            accessibilityLabel={tr('photoPager.titleImageNOfTotal', { title, n: index + 1, total: sorted.length })}
            accessibilityHint={tr('photoPager.opensPhotosFullScreen')}
            onPress={() => open(index)}>
            <AuthImage url={img.image} style={StyleSheet.absoluteFill} />
          </TapPressable>
        ))}
      </PagerView>
      {sorted.length > 1 ? (
        <View style={styles.pill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <RNText
            allowFontScaling={appScale == null}
            maxFontSizeMultiplier={1.4}
            style={[
              styles.pillText,
              { fontSize: 13 * Math.min(appScale ?? 1, 1.4), fontWeight: legibleWeight('600', settings.boldText) },
            ]}>{`${page + 1} / ${sorted.length}`}</RNText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pillText: { color: '#FFFFFF', fontWeight: '600', fontVariant: ['tabular-nums'] },
});

/** About a third of the window height, kept between 4:3 (tallest) and 16:10 (flattest) of the frame width. */
export function frameHeight(width: number, windowHeight: number): number {
  return Math.min(width / (4 / 3), Math.max(width / (16 / 10), windowHeight / 3));
}
