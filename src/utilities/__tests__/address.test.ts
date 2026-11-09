import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema } from '@/api/schemas';
import { buildCollectionView } from '@/data/selectors';
import { addressLodgings, nightLodgings } from '../address';

it('keeps overlapping bookings and uses each lodging own check-in/out dates', () => {
  const collection = collectionSchema.parse(sample);
  const lodging = {
    ...collection.lodging[0],
    check_in: '2026-12-20T06:00:00Z',
    check_out: '2026-12-22T01:00:00Z',
    timezone: 'Asia/Tokyo',
  };
  const view = buildCollectionView({ ...collection, lodging: [lodging, { ...lodging, id: 'other-lodging' }] });
  expect(nightLodgings(view, '2026-12-19')).toEqual([]);
  expect(nightLodgings(view, '2026-12-20').map((l) => l.id)).toEqual([lodging.id, 'other-lodging']);
  expect(nightLodgings(view, '2026-12-21')).toHaveLength(2);
  expect(nightLodgings(view, '2026-12-22')).toEqual([]);
});

it('only offers address actions for that night with a non-empty lodging address', () => {
  const collection = collectionSchema.parse(sample);
  const lodging = {
    ...collection.lodging[0],
    check_in: '2026-12-20T06:00:00Z',
    check_out: '2026-12-22T01:00:00Z',
    timezone: 'Asia/Tokyo',
    location: '1 Example Street',
  };
  const view = buildCollectionView({
    ...collection,
    lodging: [
      lodging,
      { ...lodging, id: 'missing-address', location: null },
      { ...lodging, id: 'blank-address', location: '   ' },
      { ...lodging, id: 'another-address', location: '2 Example Street' },
    ],
  });
  expect(addressLodgings(view, '2026-12-20').map((l) => l.id)).toEqual([lodging.id, 'another-address']);
  expect(addressLodgings(view, '2026-12-19')).toEqual([]);
  expect(addressLodgings(view, '2026-12-22')).toEqual([]);
});
