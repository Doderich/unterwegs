import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Country } from '@/api/schemas';
import { flagEmoji } from '@/data/world';
import { tr } from '@/i18n';

import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';
import { TapPressable } from './TapPressable';

/** Stamps have a fixed size, so their text grows at most this much. */
const MAX_SCALE = 1.4;

/** A stamp's tilt, the same for a country every time (from its code), between -4° and 4°. */
function tilt(code: string): number {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 9) - 4;
}

/**
 * Visited countries as stamps in a passport: the flag, the country code and how many of its regions are marked,
 * each stamp inked in teal and set at its own slight angle. Tapping a stamp opens the country.
 */
export function PassportStamps({
  countries,
  width,
}: {
  countries: (Country & { displayName: string })[];
  width?: number;
}) {
  const colors = useColors();
  if (countries.length === 0) return null;
  return (
    <View style={[styles.page, { width, backgroundColor: colors.wash }]}>
      {countries.map((c) => (
        <TapPressable
          key={c.country_code}
          accessibilityRole="button"
          accessibilityLabel={`${c.displayName}, ${tr('common.nOfTotalRegions', { n: c.num_visits, total: c.num_regions })}`}
          onPress={() =>
            router.push({ pathname: '/world/[code]', params: { code: c.country_code, name: c.displayName } })
          }
          style={({ pressed }) => [
            styles.stamp,
            {
              borderColor: colors.tint,
              transform: [{ rotate: `${tilt(c.country_code)}deg` }, { scale: pressed ? 0.94 : 1 }],
            },
          ]}>
          <ScaledText maxScale={MAX_SCALE} style={styles.flag} importantForAccessibility="no">
            {flagEmoji(c.country_code)}
          </ScaledText>
          <ScaledText maxScale={MAX_SCALE} style={{ ...typeScale.label, ...styles.code, color: colors.tint }}>
            {c.country_code.toUpperCase()}
          </ScaledText>
          <ScaledText
            maxScale={MAX_SCALE}
            style={{ ...typeScale.label, color: colors.text, fontVariant: ['tabular-nums'] }}>
            {`${c.num_visits}/${c.num_regions}`}
          </ScaledText>
        </TapPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { borderRadius: 24, padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  stamp: {
    minWidth: 88,
    minHeight: 96,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flag: { fontSize: 28, lineHeight: 36 },
  code: { fontWeight: '600', letterSpacing: 1.2 },
});
