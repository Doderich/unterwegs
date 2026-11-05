import { RNHostView } from '@expo/ui';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { tr } from '@/i18n';
import { useColors, useReduceMotion } from './theme';

/** Content-sized placeholders, announced as one busy region rather than a list of fake items. */
export function LoadingRows({ rows = 4, thumbnails = true }: { rows?: number; thumbnails?: boolean }) {
  const colors = useColors();
  const reducedMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(120, Math.min(width, 720) - 64);
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 900, useNativeDriver: true, isInteraction: false }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reducedMotion]);
  return (
    <RNHostView matchContents>
      <Animated.View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={tr('common.loading')}
        accessibilityState={{ busy: true }}
        style={[styles.list, { width: contentWidth, opacity }]}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.list}>
          {Array.from({ length: rows }, (_, index) => (
            <View key={index} style={styles.row}>
              {thumbnails ? <View style={[styles.thumbnail, { backgroundColor: colors.border }]} /> : null}
              <View style={styles.lines}>
                <View style={[styles.line, { backgroundColor: colors.border, width: index % 2 ? '65%' : '85%' }]} />
                <View style={[styles.caption, { backgroundColor: colors.border, width: index % 2 ? '85%' : '55%' }]} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </RNHostView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 20, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  thumbnail: { width: 56, height: 56, borderRadius: 9 },
  lines: { flex: 1, gap: 10 },
  line: { height: 16, borderRadius: 4 },
  caption: { height: 12, borderRadius: 4 },
});
