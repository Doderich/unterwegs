import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema, type CollectionSummary } from '@/api/schemas';
import { setLanguage } from '@/i18n';

import { REMINDER_KINDS, type CachedCollection, type ReminderKind } from '../compute';
import { planGlances, type GlancesInput } from '../plan';

/* The anonymised Japan sample, 17.12.2026 to 08.01.2027 (see compute.test.ts). */

const collection = collectionSchema.parse(sample);
const train = collection.transportations.find((t) => t.name === 'Tokio → Kyoto (Shinkansen)')!;
const summary: CollectionSummary = {
  id: collection.id,
  name: collection.name,
  start_date: collection.start_date,
  end_date: collection.end_date,
  is_archived: collection.is_archived,
};
const allKinds = Object.fromEntries(REMINDER_KINDS.map((k) => [k, true])) as Record<ReminderKind, boolean>;

function input(over: Partial<GlancesInput> = {}): GlancesInput {
  return {
    summaries: [summary],
    cached: new Map<string, CachedCollection>([[collection.id, { collection, updatedAt: 0 }]]),
    now: new Date('2026-12-19T00:00:00Z'),
    settings: { reminders: true, reminderKinds: allKinds, travelActivity: true },
    pinned: null,
    missingFiles: () => 0,
    link: (path) => `unterwegs://${path}`,
    ...over,
  };
}

beforeAll(() => setLanguage('en'));
afterAll(() => setLanguage('de'));

it('focuses the widgets on the current collection and offers it in the picker', () => {
  const { widgets } = planGlances(input());
  expect(widgets.focusId).toBe(collection.id);
  expect(widgets.coverFor.map((e) => e.collection.id)).toEqual([collection.id]);
  expect(widgets.choices.map((c) => c.value)).toEqual(['auto', collection.id]);
});

it('clears reminders when they are turned off', () => {
  expect(planGlances(input()).reminders).not.toBeNull();
  expect(planGlances(input({ settings: { ...input().settings, reminders: false } })).reminders).toBeNull();
});

it('shows a pinned transportation over the automatic choice, also with the automatic one turned off', () => {
  const settings = { ...input().settings, travelActivity: false };
  const plan = planGlances(input({ pinned: train.id, settings }));
  expect(plan.travel).toMatchObject({ unpin: false, activity: { transportationId: train.id } });
});

it('forgets the pin once that transportation has arrived, and falls back to the automatic choice', () => {
  const plan = planGlances(input({ pinned: train.id, now: new Date('2026-12-21T04:00:00Z') }));
  expect(plan.travel.unpin).toBe(true);
  expect(plan.travel.activity?.transportationId).not.toBe(train.id);
});

it('forgets a pin whose transportation is no longer in any collection', () => {
  expect(planGlances(input({ pinned: 'gone' })).travel.unpin).toBe(true);
});

it('has no Live Activity without a pin when the automatic one is off', () => {
  const settings = { ...input().settings, travelActivity: false };
  expect(planGlances(input({ settings })).travel).toEqual({ activity: null, unpin: false });
});
