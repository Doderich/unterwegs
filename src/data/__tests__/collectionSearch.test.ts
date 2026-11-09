import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema, type Location } from '@/api/schemas';

import { collectionSuggestions, searchCollection, snippet } from '../collectionSearch';
import { buildCollectionView } from '../selectors';

const parsed = collectionSchema.parse(sample);
const collection = {
  ...parsed,
  notes: [
    ...parsed.notes,
    { ...parsed.notes[0], id: 'note-tickets', name: 'Tickets', content: 'Museum\nTeamLab code 4711' },
  ],
  lodging: parsed.lodging.map((l, i) => (i === 0 ? { ...l, reservation_number: 'BK-98231' } : l)),
};
const view = buildCollectionView(collection);
const library = [
  { ...parsed.locations[0], id: 'lib-1', name: 'Fushimi Inari', location: 'Kyoto' },
  { ...parsed.locations[1], id: parsed.locations[1].id },
] as Location[];

const groups = (query: string) =>
  Object.fromEntries(searchCollection(query, view, library).map((g) => [g.group, g.hits.map((h) => h.title)]));

it('groups places, stays, connections and notes, each with the day it is on', () => {
  const results = searchCollection('Meiji', view, library);
  expect(results.map((g) => g.group)).toEqual(['places']);
  const [hit] = results[0].hits;
  expect(hit.title).toBe('Meiji-Schrein');
  expect(hit.day?.day.number).toBeGreaterThan(0);
});

it('shows the line that matched inside a note or a stay', () => {
  const [notes] = searchCollection('4711', view);
  expect(notes.group).toBe('notes');
  expect(notes.hits[0]).toMatchObject({ title: 'Tickets', excerpt: 'TeamLab code 4711' });
  const [stays] = searchCollection('BK-98231', view);
  expect(stays.hits[0]).toMatchObject({ title: 'Oyado Cocochi', excerpt: 'BK-98231' });
});

it('finds connections by flight number', () => {
  expect(groups('LH000').connections).toHaveLength(2);
});

it('offers library places that are not in the collection yet, last', () => {
  const results = searchCollection('Fushimi', view, library);
  expect(results.at(-1)).toMatchObject({ group: 'library', hits: [{ title: 'Fushimi Inari', place: 'Kyoto' }] });
  // A library place that already is in the collection shows once, as a place of the collection.
  expect(groups(parsed.locations[1].name).library).toBeUndefined();
});

it('returns nothing for an empty query', () => {
  expect(searchCollection('  ', view, library)).toEqual([]);
});

it('suggests the next stay and connection before anything is typed', () => {
  const before = collectionSuggestions(view, new Date('2026-12-01T10:00:00Z'));
  expect(before.map((h) => h.kind)).toEqual(['lodging', 'transportation']);
  expect(before[1].title).toBe('Frankfurt am Main → 東京国際空港');
});

it('matches the start of words only, so a short query stays precise', () => {
  const notes = (q: string) =>
    searchCollection(q, view)
      .find((g) => g.group === 'notes')
      ?.hits.map((h) => h.title);
  expect(notes('team')).toEqual(['Tickets']);
  expect(notes('eamlab')).toBeUndefined();
});

it('cuts a long line to the words around the match', () => {
  const line =
    'Notre-Dame Basilica of Montreal is a minor basilica of the Catholic Church in the historic Old Montreal district of the city.';
  expect(snippet(line, 'old')).toBe('… Church in the historic Old Montreal district of the city.');
  expect(snippet('Short line', 'short')).toBe('Short line');
});
