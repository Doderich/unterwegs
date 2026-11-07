import { readsAffectedBy } from '../affected';

it('refreshes every read a location appears in', () => {
  expect(readsAffectedBy({ location: 'loc' })).toEqual([
    ['locations'],
    ['location', 'loc'],
    ['collection'],
    ['world', 'pins'],
    ['world', 'stats'],
    ['calendar'],
  ]);
});

it('combines what several touches affect', () => {
  expect(readsAffectedBy('collections', { collection: 'c1' })).toEqual([
    ['collections'],
    ['invites'],
    ['collections-archived'],
    ['collection', 'c1'],
  ]);
});
