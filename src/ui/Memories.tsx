import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { CollectionSummary, Image } from '@/api/schemas';
import { firstImage } from '@/data/images';
import { tr } from '@/i18n';

import { AuthImage } from './AuthImage';
import { formatDateRange, timeAgo } from './format';
import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';

/** Cards hold a photo of fixed size, so their text grows at most this much (Fixed-Box Cap Rule). */
const MAX_SCALE = 1.4;

function cover(collection: CollectionSummary): Image | null {
  return collection.primary_image ?? firstImage(collection.location_images);
}

function openCollection(collection: CollectionSummary) {
  router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } });
}

/**
 * A finished collection as a photo you can pick up again: its cover, the name and how long ago it was. Used in the
 * memories strip on Collections and for "Heute vor einem Jahr" on Home.
 */
export function MemoryCard({
  collection,
  today,
  width,
  height,
  caption,
}: {
  collection: CollectionSummary;
  today: string;
  width?: number;
  height: number;
  /** Replaces the "vor 2 Jahren" line, e.g. "Heute vor 1 Jahr". */
  caption?: string;
}) {
  const colors = useColors();
  const image = cover(collection);
  const ago = caption ?? (collection.end_date ? timeAgo(collection.end_date, today) : null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[collection.name, ago, formatDateRange(collection.start_date, collection.end_date)]
        .filter(Boolean)
        .join(', ')}
      onPress={() => openCollection(collection)}
      style={({ pressed }) => [
        styles.card,
        { width, height, backgroundColor: colors.tint },
        pressed && styles.pressed,
      ]}>
      {image ? <AuthImage url={image.image} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      <View style={styles.text}>
        {ago ? (
          <ScaledText maxScale={MAX_SCALE} style={{ ...typeScale.label, ...styles.ago }}>
            {ago}
          </ScaledText>
        ) : null}
        <ScaledText maxScale={MAX_SCALE} numberOfLines={2} style={{ ...typeScale.bodyStrong, color: '#FFFFFF' }}>
          {collection.name}
        </ScaledText>
      </View>
    </Pressable>
  );
}

/** Finished collections as a sideways strip of cover photos, most recent first. */
export function MemoryStrip({
  collections,
  today,
  width,
}: {
  collections: CollectionSummary[];
  today: string;
  width?: number;
}) {
  return (
    <ScrollView
      style={{ width }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {collections.map((c) => (
        <MemoryCard key={c.id} collection={c} today={today} width={176} height={224} />
      ))}
    </ScrollView>
  );
}

/** A collection of an earlier year that ran over today's date: "Heute vor 2 Jahren". */
export function onThisDay(collections: CollectionSummary[], today: string): CollectionSummary | null {
  const md = today.slice(5);
  const year = Number(today.slice(0, 4));
  return (
    collections.find((c) => {
      if (!c.start_date || !c.end_date || Number(c.end_date.slice(0, 4)) >= year) return false;
      const start = c.start_date.slice(5);
      const end = c.end_date.slice(5);
      // A trip over New Year wraps around the end of the year.
      return start <= end ? md >= start && md <= end : md >= start || md <= end;
    }) ?? null
  );
}

export function onThisDayCaption(collection: CollectionSummary, today: string): string {
  const years = Number(today.slice(0, 4)) - Number(collection.start_date!.slice(0, 4));
  return tr('memories.onThisDay', { ago: tr('format.agoYears', { count: Math.max(1, years) }) });
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  pressed: { transform: [{ scale: 0.98 }] },
  // Same recipe as the hero: clear on top, dark at the bottom where the white text sits.
  scrim: { backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.78) 100%)' },
  text: { padding: 16, gap: 4 },
  // Apricot like the hero countdown, with its shadow so it holds on bright skies.
  ago: { fontWeight: '600', color: '#FDBA74', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
  strip: { gap: 12 },
  photo: { width: 120, height: 120, borderRadius: 16, overflow: 'hidden' },
});

export type DayPhoto = { key: string; url: string; label: string; onPress: () => void };

/** A day that is behind you, told in its photos: a sideways strip, each photo opening what it shows. */
export function DayPhotoStrip({ photos, width }: { photos: DayPhoto[]; width?: number }) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ width }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {photos.map((p) => (
        <Pressable
          key={p.key}
          accessibilityRole="imagebutton"
          accessibilityLabel={p.label}
          onPress={p.onPress}
          style={({ pressed }) => [styles.photo, { backgroundColor: colors.border }, pressed && styles.pressed]}>
          <AuthImage url={p.url} style={StyleSheet.absoluteFill} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
