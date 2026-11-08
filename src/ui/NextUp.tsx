import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { firstImage } from '@/data/images';
import { entryTitle, locationZone, type CollectionView, type Day, type DayEntry } from '@/data/selectors';
import { tr } from '@/i18n';
import { departureZone, lodgingZone } from '@/time/ownZone';
import { formatDuration, formatTime } from '@/time/tz';

import { AuthImage } from './AuthImage';
import { openEntryDetail } from './entries';
import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';

/** The current minute; ticks once a minute so "in 25 Min." stays true while the screen is open. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The zone an entry's time belongs to (DESIGN.md: every time in its own zone). */
function entryZone(view: CollectionView, entry: DayEntry): string {
  if (entry.kind === 'transportation') return departureZone(entry.transport, view.timeZone);
  if (entry.kind === 'lodging') return lodgingZone(entry.lodging, view.timeZone);
  if (entry.kind === 'location') return locationZone(view, entry.location);
  return view.timeZone;
}

function entryImages(entry: DayEntry) {
  if (entry.kind === 'transportation') return entry.transport.images;
  if (entry.kind === 'lodging') return entry.lodging.images;
  if (entry.kind === 'location') return entry.location.images;
  return null;
}

/** The next timed thing today that hasn't started yet. */
export function nextEntry(day: Day, now: number): DayEntry | null {
  return (
    day.entries.find(
      (e) => e.startUtc && e.kind !== 'note' && e.kind !== 'checklist' && Date.parse(e.startUtc) > now,
    ) ?? null
  );
}

/**
 * "Als Nächstes" on today's page: the one thing coming up, as a wash-tinted card at the top. Time first, large, with
 * how long until it in apricot; the entry's photo when it has one. Tapping opens the entry.
 */
export function NextUpCard({
  view,
  day,
  now,
  width,
}: {
  view: CollectionView;
  day: Day;
  /** From `useNow()` on the screen, which also decides whether to show the card. */
  now: number;
  width?: number;
}) {
  const colors = useColors();
  const entry = nextEntry(day, now);
  if (!entry?.startUtc) return null;

  const zone = entryZone(view, entry);
  const time = formatTime(entry.startUtc, zone);
  const minutes = Math.max(1, Math.round((Date.parse(entry.startUtc) - now) / 60_000));
  const until = tr('nextUp.inDuration', { duration: formatDuration(minutes) });
  const title = entryTitle(entry);
  const image = firstImage(entryImages(entry));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tr('nextUp.title')}: ${title}, ${time}, ${until}`}
      onPress={() => openEntryDetail(view.collection.id, entry)}
      style={({ pressed }) => [styles.card, { width, backgroundColor: colors.wash }, pressed && styles.pressed]}>
      <View style={styles.text}>
        <ScaledText style={{ ...typeScale.bodyStrong, color: colors.next }}>{until}</ScaledText>
        <ScaledText style={{ ...typeScale.figure, color: colors.text, fontVariant: ['tabular-nums'] }}>
          {time}
        </ScaledText>
        <ScaledText style={{ ...typeScale.bodyStrong, color: colors.text }} numberOfLines={2}>
          {title}
        </ScaledText>
      </View>
      {image ? (
        <View
          style={[styles.photo, { backgroundColor: colors.border }]}
          importantForAccessibility="no-hide-descendants">
          <AuthImage url={image.image} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  pressed: { transform: [{ scale: 0.98 }] },
  text: { flex: 1, gap: 4 },
  photo: { width: 88, height: 88, borderRadius: 16, overflow: 'hidden' },
});
