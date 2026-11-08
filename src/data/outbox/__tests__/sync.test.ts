import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { queryKeys } from '../../queryKeys';
import { fakeServer, fileKeeper, memoryStore, texts } from '../__fixtures__/fakes';
import { createOutbox } from '../queue';
import { syncOutbox } from '../sync';

const lodging = {
  type: 'createObject',
  collectionId: 'c1',
  objectKind: 'lodging',
  tempId: 'temp-L',
  input: { name: 'Ryokan' },
} as const;

function setup() {
  const server = fakeServer();
  const outbox = createOutbox({ storage: async () => memoryStore(), files: fileKeeper() });
  // No garbage-collection timers: the test run ends as soon as the tests do.
  const cache = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  cache.setQueryData(queryKeys.collection('c1'), structuredClone(server.state.collection));
  return { ...server, outbox, cache };
}

it('does nothing while no edit waits', async () => {
  const { outbox, client, cache, state } = setup();
  expect(await syncOutbox(outbox, client, cache, texts)).toBeNull();
  expect(state.calls).toEqual([]);
});

it('folds a sent edit into the cached collection under the server id, then reads it again', async () => {
  const { outbox, client, cache } = setup();
  outbox.enqueue(lodging);
  const report = await syncOutbox(outbox, client, cache, texts);
  expect(report).toMatchObject({ sent: 1, dropped: [], interrupted: false });
  const cached = cache.getQueryData<Collection>(queryKeys.collection('c1'));
  expect(cached?.lodging.map((l) => l.id)).toEqual(['L1']);
  expect(cache.getQueryState(queryKeys.collection('c1'))?.isInvalidated).toBe(true);
  expect(outbox.get()).toEqual([]);
});

it('hands refused edits back for the caller to report and leaves the cached copy as the server had it', async () => {
  const { outbox, client, cache, state } = setup();
  outbox.enqueue(lodging);
  state.fail = new ApiError('forbidden', 403, '/api/lodging');
  const report = await syncOutbox(outbox, client, cache, texts);
  expect(report?.dropped).toHaveLength(1);
  expect(cache.getQueryData<Collection>(queryKeys.collection('c1'))?.lodging).toEqual([]);
});

it('keeps the edit and the cache untouched without a connection', async () => {
  const { outbox, client, cache, state } = setup();
  outbox.enqueue(lodging);
  state.fail = new TypeError('Network request failed');
  const report = await syncOutbox(outbox, client, cache, texts);
  expect(report?.interrupted).toBe(true);
  expect(outbox.get()).toHaveLength(1);
  expect(cache.getQueryData<Collection>(queryKeys.collection('c1'))?.lodging).toEqual([]);
});
