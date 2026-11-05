import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';

import type { CollectionSummary } from '@/api/schemas';
import { useCollectionView } from '@/data/queries';
import { viewToday } from '@/data/selectors';
import { tr } from '@/i18n';
import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';

import { AuthImage } from './AuthImage';
import { formatDateRange, collectionCountdown } from './format';
import { useColors } from './theme';

/**
 * The current or next collection as a big photo card (React Native view: embed via RNHostView).
 * Stats and today's day come from the cached full collection once it is loaded.
 */
export function CollectionHero({
  collection,
  current,
  today,
  width,
  compact = false,
}: {
  collection: CollectionSummary;
  current: boolean;
  /** Device-zone date; the collection's own zone is used once the collection is loaded. */
  today: string;
  /** Fixed width, or undefined to fill the host. */
  width?: number;
  compact?: boolean;
}) {
  const { height, fontScale } = useWindowDimensions();
  const settings = useSettings();
  const textScale = Math.min(rnTextScale(settings.textSize) ?? fontScale, 1.4);
  const colors = useColors();
  const { view } = useCollectionView(collection.id);
  const cover = collection.primary_image ?? collection.location_images?.[0];
  const cardHeight = Math.round(
    compact
      ? Math.max(Math.min(Math.max(height * 0.3, 240), 340), 240 * textScale)
      : Math.min(Math.max(height * 0.46, 320), 560),
  );

  const collectionToday = view ? viewToday(view).date : today;
  const countdown =
    collection.start_date && collection.end_date
      ? collectionCountdown(collection.start_date, collection.end_date, collectionToday)
      : null;
  const day = current ? view?.days.find((d) => d.date === collectionToday) : view?.days[0];
  const dayLine = day?.name
    ? current
      ? tr('collectionHero.todayName', { name: day.name })
      : tr('collectionHero.day1Name', { name: day.name })
    : null;
  const stats = view
    ? [
        tr('common.days', { count: view.days.length }),
        tr('common.places', { count: view.collection.locations.length }),
        tr('common.stayCount', { count: view.lodgings.length }),
      ]
    : [];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[collection.name, countdown, formatDateRange(collection.start_date, collection.end_date)]
        .filter(Boolean)
        .join(', ')}
      onPress={() =>
        router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } })
      }
      style={({ pressed }) => [
        styles.card,
        { width, height: cardHeight, backgroundColor: colors.tint },
        pressed && styles.pressed,
      ]}>
      {cover ? <AuthImage url={cover.image} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <View style={styles.badge}>
        <Label style={styles.badgeText}>{current ? tr('collectionHero.onRoad') : tr('collectionHero.nextTrip')}</Label>
      </View>

      <View style={styles.bottom}>
        {countdown ? <Label style={styles.countdown}>{countdown}</Label> : null}
        <Label style={styles.title} numberOfLines={2}>
          {collection.name}
        </Label>
        <Label style={styles.meta} numberOfLines={1}>
          {[formatDateRange(collection.start_date, collection.end_date), dayLine].filter(Boolean).join(' · ')}
        </Label>
        {stats.length > 0 ? (
          <View style={styles.stats}>
            {stats.map((s) => (
              <View key={s} style={styles.stat}>
                <Label style={styles.statText}>{s}</Label>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** The card has a fixed height, so text grows at most this much. */
const MAX_SCALE = 1.4;
const BOLDER: Record<string, TextStyle['fontWeight']> = { '400': '600', '600': '800', '700': '800', '800': '900' };

/**
 * React Native text that follows the app's text size and bold-text settings (native list rows do
 * that by themselves).
 */
function Label({ style, ...props }: TextProps & { style: TextStyle }) {
  const { textSize, boldText } = useSettings();
  const scale = rnTextScale(textSize);
  const factor = Math.min(scale ?? 1, MAX_SCALE);
  return (
    <Text
      {...props}
      allowFontScaling={scale === null}
      maxFontSizeMultiplier={MAX_SCALE}
      style={[
        style,
        scale !== null && {
          fontSize: (style.fontSize ?? 15) * factor,
          lineHeight: style.lineHeight ? style.lineHeight * factor : undefined,
        },
        boldText && { fontWeight: BOLDER[String(style.fontWeight ?? '400')] ?? style.fontWeight },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between' },
  pressed: { opacity: 0.9 },
  scrim: {
    backgroundImage:
      'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.82) 100%)',
  },
  badge: {
    alignSelf: 'flex-start',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  bottom: { padding: 20, gap: 4 },
  countdown: {
    color: '#FDBA74',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 34 },
  meta: { color: 'rgba(255,255,255,0.88)', fontSize: 15 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  stat: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  statText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
