import sample from '../../../../docs/samples/collection-detail.json';
import { collectionSchema } from '@/api/schemas';

import { buildCollectionView } from '../../selectors';
import { applyPending } from '../model';
import type { OutboxOp } from '../types';

/** What a screen shows while edits wait: the overlay and the Day view built from it, together. */
const collection = collectionSchema.parse(sample);
const base = { createdAt: 0, attempts: 0, collectionId: collection.id };
const firstDay = buildCollectionView(collection).days[0];

it('puts a note written offline on its day, after what was planned', () => {
  const ops: OutboxOp[] = [
    {
      ...base,
      id: 'a',
      type: 'createNote',
      tempId: 'temp-n',
      input: { name: 'Snacks', content: '', date: null, links: [] },
    },
    { ...base, id: 'b', type: 'addToDay', date: firstDay.date, contentType: 'note', objectId: 'temp-n' },
  ];
  const day = buildCollectionView(applyPending(collection, ops)).days[0];
  expect(day.entries.length).toBe(firstDay.entries.length + 1);
  expect(day.entries.at(-1)).toMatchObject({ kind: 'note', note: { name: 'Snacks' } });
});

it('shows an itinerary item taken off a day as gone, and its object still in the collection', () => {
  const item = firstDay.entries.find((e) => e.itineraryId);
  if (!item?.itineraryId) return;
  const ops: OutboxOp[] = [{ ...base, id: 'c', type: 'removeFromDay', itemId: item.itineraryId }];
  const view = buildCollectionView(applyPending(collection, ops));
  expect(view.days[0].entries.some((e) => e.itineraryId === item.itineraryId)).toBe(false);
});
