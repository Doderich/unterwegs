import { collectionSchema, collectionSummarySchema, countrySchema } from '@/api/schemas';

import { searchEverything } from '../search';

const sample = jest.requireActual('../../../docs/samples/collection-detail.json');
const japan = collectionSchema.parse(sample);
const other = collectionSummarySchema.parse({ id: 'c2', name: 'Ostsee im Herbst', description: 'Rügen und Usedom' });
const countries = [
  countrySchema.parse({ id: 1, name: 'Japan', country_code: 'JP', num_regions: 47, num_visits: 3 }),
  countrySchema.parse({ id: 2, name: 'Germany', country_code: 'DE', num_regions: 16, num_visits: 0 }),
];

const search = (q: string) =>
  searchEverything(q, { collections: [japan, other], details: [japan], countries }).map((h) => [h.kind, h.title]);

describe('searchEverything', () => {
  it('finds objects inside cached collections, names before other fields', () => {
    const hits = search('schrein');
    expect(hits[0]).toEqual(['location', 'Meiji-Schrein']);
  });

  it('ignores case and accents, and needs every word', () => {
    expect(search('RUGEN')).toEqual([['collection', 'Ostsee im Herbst']]);
    expect(search('tokio kyoto')).toEqual([['transportation', 'Tokio → Kyoto (Shinkansen)']]);
  });

  it('finds collections, lodging and countries, and links each hit to its collection', () => {
    const all = searchEverything('japan', { collections: [japan, other], details: [japan], countries });
    expect(all.map((h) => h.kind)).toEqual(expect.arrayContaining(['collection', 'country']));
    const lodging = searchEverything('miki', { collections: [japan], details: [japan], countries })[0];
    expect(lodging).toMatchObject({ kind: 'lodging', title: 'Hotel Miki', collectionId: japan.id });
    expect(lodging.subtitle).toContain('Japan Familienreise');
  });

  it('returns nothing for a blank query', () => {
    expect(search('  ')).toEqual([]);
  });
});

it('finds standalone locations and deduplicates locations also found in a collection', () => {
  const standalone = { ...japan.locations[0], id: 'standalone', name: 'Standalone garden', collections: [] };
  const hits = searchEverything('garden', { collections: [], details: [], countries: [], locations: [standalone] });
  expect(hits[0]).toMatchObject({ kind: 'location', id: 'standalone' });
  expect(hits[0].collectionId).toBeUndefined();
  const linked = japan.locations[0];
  const duplicates = searchEverything(linked.name, {
    collections: [japan],
    details: [japan],
    countries: [],
    locations: [linked],
  });
  expect(duplicates.filter((h) => h.id === linked.id)).toHaveLength(1);
});
