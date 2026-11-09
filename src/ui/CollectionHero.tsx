import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';

import type { CollectionSummary } from '@/api/schemas';
import { useCollectionView } from '@/data/queries';
import { viewToday } from '@/data/selectors';
import { tr } from '@/i18n';
import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';

import { AuthImage } from './AuthImage';
import { formatDateRange, collectionCountdown } from './format';
import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { TapPressable } from './TapPressable';

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
  // The cover first, then the places' photos, each once: a wide card shows several instead of stretching one.
  const photos = [collection.primary_image, ...(collection.location_images ?? [])]
    .filter((image): image is NonNullable<typeof image> => !!image)
    .map((image) => image.image)
    .filter((url, i, all) => all.indexOf(url) === i);
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
    <TapPressable
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
      {photos.length ? <HeroPhotos urls={photos} /> : null}
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
    </TapPressable>
  );
}

/** A photo is at least this wide on the card, so each keeps a natural crop. */
const MIN_PHOTO_WIDTH = 380;
/** At most this many photos side by side. */
const MAX_PHOTOS = 4;

/**
 * The card's background: one photo on a phone; on a wide card (iPad, landscape) as many of the collection's photos
 * side by side as fit at a natural crop, rather than one photo stretched across the window.
 */
function HeroPhotos({ urls }: { urls: string[] }) {
  const [width, setWidth] = useState(0);
  const count = Math.max(1, Math.min(urls.length, MAX_PHOTOS, Math.floor(width / MIN_PHOTO_WIDTH)));
  return (
    <View style={[StyleSheet.absoluteFill, styles.photos]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {urls.slice(0, count).map((url) => (
        <AuthImage key={url} url={url} style={styles.photo} />
      ))}
    </View>
  );
}

/** The card has a fixed height, so text grows at most this much. */
const MAX_SCALE = 1.4;

function Label(props: TextProps & { style: TextStyle }) {
  return <ScaledText {...props} maxScale={MAX_SCALE} />;
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', gap: 2 },
  photo: { flex: 1, height: '100%' },
  card: { borderRadius: 28, overflow: 'hidden', justifyContent: 'space-between' },
  // The card gives a little under the thumb, like a ticket pressed on a counter.
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  scrim: {
    backgroundImage:
      'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.82) 100%)',
  },
  badge: {
    alignSelf: 'flex-start',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  // Written in sentence case and uppercased only visually, so screen readers read words, not letters.
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  bottom: { padding: 24, gap: 4 },
  countdown: {
    color: '#FDBA74',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 8,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '600', lineHeight: 32 },
  // Secondary text is the same white at 80%: hierarchy by opacity, not another colour.
  meta: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stat: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  statText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
