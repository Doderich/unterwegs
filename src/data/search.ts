import type { Collection, CollectionSummary, Country, Location } from '@/api/schemas';

import { firstImage } from './images';
import { countryName } from './world';

export type SearchKind = 'collection' | 'location' | 'lodging' | 'transportation' | 'note' | 'checklist' | 'country';

export type SearchHit = {
  kind: SearchKind;
  /** Object id; the country code for countries. */
  id: string;
  /** The collection to open it in (all kinds except collections and countries). */
  collectionId?: string;
  title: string;
  subtitle: string;
  /** URL of the image that stands for it (`firstImage`), shown as the row's thumbnail. */
  image?: string;
};

const KIND_ORDER: SearchKind[] = [
  'collection',
  'location',
  'lodging',
  'transportation',
  'note',
  'checklist',
  'country',
];

/** Lowercase without accents, so "rugen" finds "Rügen". */
const fold = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Searches what the phone has: the collection list, the full collections in the offline copy and the countries.
 * Every word of the query must appear in the title or another field; title matches rank first, then by kind.
 */
export function searchEverything(
  query: string,
  data: { collections: CollectionSummary[]; details: Collection[]; countries: Country[]; locations?: Location[] },
): SearchHit[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: { hit: SearchHit; score: number }[] = [];
  const seen = new Set<string>();

  const consider = (hit: SearchHit, other: (string | null | undefined)[]) => {
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) return;
    const title = fold(hit.title);
    const rest = fold(other.join(' '));
    if (!words.every((w) => title.includes(w) || rest.includes(w))) return;
    seen.add(key);
    const inTitle = words.filter((w) => title.includes(w)).length;
    const startsWith = title.startsWith(words[0]) || title.includes(` ${words[0]}`) || title.includes(`-${words[0]}`);
    scored.push({ hit, score: inTitle * 2 + (startsWith ? 1 : 0) });
  };

  for (const c of data.collections)
    consider(
      {
        kind: 'collection',
        id: c.id,
        title: c.name,
        subtitle: c.description ?? '',
        image: firstImage(c.primary_image ? [c.primary_image] : c.location_images)?.image,
      },
      [c.description],
    );

  for (const c of data.details) {
    const inCollection = { collectionId: c.id, subtitle: c.name };
    for (const l of c.locations)
      consider({ kind: 'location', id: l.id, title: l.name, image: firstImage(l.images)?.image, ...inCollection }, [
        l.location,
        l.description,
        l.category?.display_name,
        ...(l.tags ?? []),
      ]);
    for (const l of c.lodging)
      consider({ kind: 'lodging', id: l.id, title: l.name, image: firstImage(l.images)?.image, ...inCollection }, [
        l.location,
        l.description,
        l.reservation_number,
      ]);
    for (const t of c.transportations)
      consider(
        { kind: 'transportation', id: t.id, title: t.name, image: firstImage(t.images)?.image, ...inCollection },
        [t.from_location, t.to_location, t.start_code, t.end_code, t.flight_number, t.description],
      );
    for (const n of c.notes)
      consider({ kind: 'note', id: n.id, title: n.name, ...inCollection }, [n.content, ...(n.links ?? [])]);
    for (const l of c.checklists)
      consider(
        { kind: 'checklist', id: l.id, title: l.name, ...inCollection },
        l.items.map((i) => i.name),
      );
  }

  for (const location of data.locations ?? [])
    consider(
      {
        kind: 'location',
        id: location.id,
        title: location.name,
        subtitle: location.location ?? '',
        image: firstImage(location.images)?.image,
      },
      [location.location, location.description, location.category?.display_name, ...(location.tags ?? [])],
    );

  for (const c of data.countries) {
    const name = countryName(c);
    consider({ kind: 'country', id: c.country_code, title: name, subtitle: c.subregion ?? '' }, [
      c.name,
      c.country_code,
    ]);
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER.indexOf(a.hit.kind) - KIND_ORDER.indexOf(b.hit.kind) ||
        a.hit.title.localeCompare(b.hit.title),
    )
    .map((s) => s.hit);
}
