import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, ZoomIn, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onCelebrate } from './celebrate';
import { ScaledText } from './ScaledText';
import { useColors, useReduceMotion } from './theme';
import { typeScale } from './typeScale';

const HOLD_MS = 1800;

/** Shows `celebrate()` messages: a pill with a check that pops in, holds and fades. Mounted once at the root. */
export function CelebrationHost() {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => onCelebrate((text) => setMessage({ text, id: Date.now() })), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), HOLD_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  // Reduce motion: a plain fade, no pop.
  const entering = reduceMotion ? FadeIn.duration(150) : ZoomIn.springify().damping(14).stiffness(220);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer, { paddingBottom: insets.bottom + 96 }]}>
      <Animated.View
        key={message.id}
        entering={entering}
        exiting={FadeOut.duration(reduceMotion ? 150 : 250)}
        style={[styles.pill, { backgroundColor: colors.tint }]}
        importantForAccessibility="no-hide-descendants">
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }}
          tintColor={colors.background}
          size={24}
        />
        <ScaledText maxScale={1.4} style={{ ...typeScale.bodyStrong, color: colors.background }}>
          {message.text}
        </ScaledText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { justifyContent: 'flex-end', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#0B2B29',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
