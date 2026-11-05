import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type ScrollViewInstance,
  type TextStyle,
  useColorScheme,
} from 'react-native';

import { tr } from '@/i18n';
import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';
import { dayChipParts, formatLongDay } from '@/time/tz';

import { useColors, useReduceMotion } from './theme';

type DayNavProps = {
  dates: string[];
  index: number;
  /** The actual current date (may not be the selected one). */
  today: string;
  onSelect: (index: number) => void;
};

/** React Native text that follows the system size, or the app's own text size when it overrides it. */
function useScaledText() {
  const { textSize, boldText } = useSettings();
  const scale = rnTextScale(textSize);
  return (size: number, weight: TextStyle['fontWeight'] = '400'): TextStyle => ({
    fontSize: size * (scale ?? 1),
    fontWeight: boldText && (weight === '400' || weight === '600') ? '700' : weight,
  });
}

/** iOS headers are translucent and React Native views start under them; native lists inset themselves. */
function useTopInset(): number {
  const header = useHeaderHeight();
  return Platform.OS === 'ios' ? header : 0;
}

function dayLabel(date: string, number: number, total: number, isToday: boolean) {
  return `${formatLongDay(date)}, ${tr('common.dayNOfTotal', { n: number, total })}${isToday ? `, ${tr('common.today')}` : ''}`;
}

/**
 * Day navigation on Today: one chip per day, scrolled so the selected day stays in view. The selected day is filled
 * Terracotta; the actual current day keeps a Terracotta dot, so "selected" and "today" read apart.
 */
export function DayStrip({
  dates,
  index,
  today,
  onSelect,
  insetHeader = true,
}: DayNavProps & { insetHeader?: boolean }) {
  const colors = useColors();
  const text = useScaledText();
  const reduceMotion = useReduceMotion();
  const { textSize } = useSettings();
  const scroller = useRef<ScrollViewInstance>(null);
  const top = useTopInset();
  // The dark-mode accent is a light orange: black on it, white on the light-mode terracotta (both ≥ 4.5:1).
  const onTint = useColorScheme() === 'dark' ? '#000000' : '#FFFFFF';
  const offsets = useRef<number[]>([]);

  useEffect(() => {
    const x = offsets.current[index];
    if (x != null) scroller.current?.scrollTo({ x: Math.max(0, x - 96), animated: !reduceMotion });
  }, [index, reduceMotion]);

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insetHeader ? top : 0, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        accessibilityRole="tablist">
        {dates.map((date, i) => {
          const selected = i === index;
          const isToday = date === today;
          const p = dayChipParts(date);
          const fg = selected ? onTint : colors.text;
          return (
            <Pressable
              key={date}
              onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.x)}
              onPress={() => onSelect(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={dayLabel(date, i + 1, dates.length, isToday)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: selected ? colors.tint : colors.card, opacity: pressed ? 0.7 : 1 },
              ]}>
              <RNText
                allowFontScaling={rnTextScale(textSize) == null}
                style={[text(13, '600'), { color: selected ? fg : colors.secondary }]}>
                {p.weekday}
              </RNText>
              <RNText
                allowFontScaling={rnTextScale(textSize) == null}
                style={[text(20, '700'), styles.number, { color: fg }]}>
                {p.day}
              </RNText>
              <RNText
                allowFontScaling={rnTextScale(textSize) == null}
                style={[text(13), { color: selected ? fg : colors.secondary }]}>
                {p.month}
              </RNText>
              <View
                style={[styles.dot, { backgroundColor: isToday ? (selected ? onTint : colors.tint) : 'transparent' }]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  strip: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { minWidth: 56, minHeight: 48, paddingHorizontal: 10, paddingTop: 8, borderRadius: 14, alignItems: 'center' },
  number: { fontVariant: ['tabular-nums'], marginVertical: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, marginBottom: 6 },
});
