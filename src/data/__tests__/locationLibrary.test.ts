import { collectionSchema } from '@/api/schemas';
import { matchesLocationFilter } from '../locationLibrary';

const sample = jest.requireActual('../../../docs/samples/collection-detail.json');
const place = collectionSchema.parse(sample).locations[0];

it('keeps collection-free and linked places in their respective library filters', () => {
  expect(matchesLocationFilter({ ...place, collections: [] }, 'standalone')).toBe(true);
  expect(matchesLocationFilter({ ...place, collections: ['collection'] }, 'standalone')).toBe(false);
});

it('treats missing visited status as not visited when searching the saved filter', () => {
  expect(matchesLocationFilter({ ...place, is_visited: undefined }, 'saved')).toBe(true);
  expect(matchesLocationFilter({ ...place, is_visited: undefined }, 'visited')).toBe(false);
  expect(matchesLocationFilter({ ...place, is_visited: true }, 'saved')).toBe(false);
  expect(matchesLocationFilter({ ...place, is_visited: true }, 'visited')).toBe(true);
});

it('restores all places for an absent or unknown filter', () => {
  expect(matchesLocationFilter(place, undefined)).toBe(true);
  expect(matchesLocationFilter(place, 'old-filter')).toBe(true);
});
