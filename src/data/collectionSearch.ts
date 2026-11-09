import type { Location } from '@/api/schemas';

import { firstImage } from './images';
import { fold } from './search';
import { entryObjectId, viewToday, type CollectionView, type Day } from './selectors';

/**
 * Search inside one collection (docs/IPAD.md → search): finding one thing fast ("the booking number", "which day is
 * the museum") and, while planning, whether a place is already in the collection. Results come grouped, each with
 * the day it is on; notes and checklists show the line that matched. Places from the library that aren't in the
 * collection yet come last, so they can be added.
 */
export type CollectionHitKind = 'location' | 'lodging' | 'transportation' | 'note' | 'checklist' | 'library';

export type CollectionHit = {
  kind: CollectionHitKind;
  id: string;
  title: string;
  /** The first day it is on, with the entry's start time if it has one; null when it is on no day. */
  day: { day: Day; startUtc: string | null } | null;
  /** The line that matched, when it isn't the title (a note's text, a checklist item, a booking number). */
  excerpt: string | null;
  /** Where it is, for places from the library. */
  place: string | null;
  image?: string;
};

export type CollectionGroup = 'places' | 'stays' | 'connections' | 'notes' | 'library';

export type CollectionResults = { group: CollectionGroup; hits: CollectionHit[] }[];

/** Library places shown at most; the rest is one more word away. */
const LIBRARY_LIMIT = 8;

/** The first day each object is on, with its time there. Stays count from their check-in day. */
function daysOf(view: CollectionView) {
  const days = new Map<string, { day: Day; startUtc: string | null }>();
  for (const day of view.days) {
    for (const e of day.entries) {
      const id = entryObjectId(e);
      if (!days.has(id)) days.set(id, { day, startUtc: e.startUtc ?? null });
    }
  }
  for (const stay of view.lodgings) {
    const day = view.days.find((d) => d.date === stay.checkInDate);
    if (day && !days.has(stay.lodging.id)) days.set(stay.lodging.id, { day, startUtc: null });
  }
  return days;
}

/** Words of a text, folded: "Old-Port (Montréal)" → ["old", "port", "montreal"]. */
const wordsOf = (text: string) =>
  fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Characters shown before and after the matching word in a long line. */
const BEFORE = 24;
const AFTER = 56;

/** The part of a line around the word that starts with `word`, trimmed to whole words: "… in the historic Old Montreal …". */
export function snippet(line: string, word: string): string {
  const text = line.trim().replace(/^[-*#>\s]+/, '');
  if (text.length <= BEFORE + AFTER) return text;
  // Same length after folding for Latin text; for the rare mismatch the start of the line is shown.
  const at = Math.max(
    0,
    fold(text).search(new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u')),
  );
  let start = Math.max(0, at - BEFORE);
  let end = Math.min(text.length, at + AFTER);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(' ', end) > at ? text.lastIndexOf(' ', end) : end;
  return `${start > 0 ? '… ' : ''}${text.slice(start, end).trim()}${end < text.length ? ' …' : ''}`;
}

/**
 * A matcher for every word of the query, each matching the start of a word ("old" finds "Old Port", not "hold"),
 * so a short query stays precise. Tells which text matched beyond the title.
 */
function matcher(query: string) {
  const words = wordsOf(query);
  const hits = (text: string[], w: string) => text.some((t) => t.startsWith(w));
  return {
    empty: words.length === 0,
    /** Null when it doesn't match; else the first non-title line that holds a word the title lacks. */
    test(title: string, other: (string | null | undefined)[]): { excerpt: string | null; score: number } | null {
      const t = wordsOf(title);
      const lines = other.filter((x): x is string => !!x).flatMap((x) => x.split('\n'));
      const folded = lines.map(wordsOf);
      if (!words.every((w) => hits(t, w) || folded.some((f) => hits(f, w)))) return null;
      const missing = words.find((w) => !hits(t, w));
      const line = missing ? lines[folded.findIndex((f) => hits(f, missing))] : undefined;
      const inTitle = words.filter((w) => hits(t, w)).length;
      return { excerpt: line && missing ? snippet(line, missing) : null, score: inTitle };
    },
  };
}

export function searchCollection(query: string, view: CollectionView, library: Location[] = []): CollectionResults {
  const m = matcher(query);
  if (m.empty) return [];
  const days = daysOf(view);
  const c = view.collection;
  const groups: Record<CollectionGroup, { hit: CollectionHit; score: number }[]> = {
    places: [],
    stays: [],
    connections: [],
    notes: [],
    library: [],
  };
  const add = (
    group: CollectionGroup,
    base: Omit<CollectionHit, 'day' | 'excerpt' | 'place'> & { place?: string | null },
    other: (string | null | undefined)[],
    showExcerpt = true,
  ) => {
    const match = m.test(base.title, other);
    if (!match) return;
    groups[group].push({
      hit: {
        ...base,
        place: base.place ?? null,
        day: group === 'library' ? null : (days.get(base.id) ?? null),
        excerpt: showExcerpt ? match.excerpt : null,
      },
      score: match.score,
    });
  };

  for (const l of c.locations)
    add('places', { kind: 'location', id: l.id, title: l.name, image: firstImage(l.images)?.image }, [
      l.location,
      l.category?.display_name,
      ...(l.tags ?? []),
      l.description,
    ]);
  for (const l of c.lodging)
    add('stays', { kind: 'lodging', id: l.id, title: l.name, image: firstImage(l.images)?.image }, [
      l.reservation_number,
      l.location,
      l.description,
    ]);
  for (const t of c.transportations)
    add('connections', { kind: 'transportation', id: t.id, title: t.name, image: firstImage(t.images)?.image }, [
      t.flight_number,
      t.from_location,
      t.to_location,
      t.start_code,
      t.end_code,
      t.description,
    ]);
  for (const n of c.notes) add('notes', { kind: 'note', id: n.id, title: n.name }, [n.content, ...(n.links ?? [])]);
  for (const l of c.checklists)
    add(
      'notes',
      { kind: 'checklist', id: l.id, title: l.name },
      l.items.map((i) => i.name),
    );

  const inCollection = new Set(c.locations.map((l) => l.id));
  for (const l of library)
    if (!inCollection.has(l.id))
      add(
        'library',
        { kind: 'library', id: l.id, title: l.name, image: firstImage(l.images)?.image, place: l.location ?? null },
        [l.location, l.category?.display_name, ...(l.tags ?? [])],
        false,
      );

  return (Object.keys(groups) as CollectionGroup[])
    .map((group) => {
      const hits = groups[group]
        .sort(
          (a, b) =>
            b.score - a.score ||
            (a.hit.day?.day.number ?? Infinity) - (b.hit.day?.day.number ?? Infinity) ||
            a.hit.title.localeCompare(b.hit.title),
        )
        .map((x) => x.hit);
      return { group, hits: group === 'library' ? hits.slice(0, LIBRARY_LIMIT) : hits };
    })
    .filter((g) => g.hits.length > 0);
}

/**
 * Before anything is typed: what is usually looked up on the road. Tonight's stay and the next connection while
 * the collection is on; before it starts, its first stay and connection.
 */
export function collectionSuggestions(view: CollectionView, now = new Date()): CollectionHit[] {
  const days = daysOf(view);
  const today = viewToday(view, now).date;
  const out: CollectionHit[] = [];
  const day = view.days.find((d) => d.date === today) ?? view.days.find((d) => d.date > today);
  const stay = day?.nightLodging ?? view.lodgings[0]?.lodging;
  if (stay)
    out.push({
      kind: 'lodging',
      id: stay.id,
      title: stay.name,
      day: days.get(stay.id) ?? null,
      excerpt: stay.reservation_number || null,
      place: null,
      image: firstImage(stay.images)?.image,
    });
  const next = view.days
    .flatMap((d) => d.entries)
    .filter((e) => e.kind === 'transportation' && (e.startUtc ?? '') >= now.toISOString())
    .sort((a, b) => (a.startUtc ?? '').localeCompare(b.startUtc ?? ''))[0];
  if (next?.kind === 'transportation')
    out.push({
      kind: 'transportation',
      id: next.transport.id,
      title: next.transport.name,
      day: days.get(next.transport.id) ?? null,
      excerpt: next.transport.flight_number || null,
      place: null,
      image: firstImage(next.transport.images)?.image,
    });
  return out;
}
