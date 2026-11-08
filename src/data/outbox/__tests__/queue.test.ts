import { ApiError } from '@/api/client';

import { fakeServer, fileKeeper, memoryStore, texts } from '../__fixtures__/fakes';
import { createOutbox } from '../queue';
import type { NewOp } from '../types';

const lodging: NewOp = {
  type: 'createObject',
  collectionId: 'c1',
  objectKind: 'lodging',
  tempId: 'temp-L',
  input: { name: 'Ryokan' },
};
const photo: NewOp = {
  type: 'uploadImage',
  collectionId: 'c1',
  ownerKind: 'lodging',
  objectId: 'temp-L',
  tempId: 'temp-img',
  file: { uri: 'file:///docs/outbox/a.jpg', name: 'a.jpg', type: 'image/jpeg' },
};

it('keeps edits saved before a restart ahead of new ones', async () => {
  const saved = [{ ...lodging, id: 'old', createdAt: 0, attempts: 0 }];
  const store = memoryStore({ 'unterwegs.outbox.v1': JSON.stringify(saved) });
  const outbox = createOutbox({ storage: async () => store, files: fileKeeper() });
  outbox.enqueue({ type: 'rate', collectionId: 'c1', locationId: 'loc', rating: 4 });
  await outbox.ready();
  expect(outbox.get().map((o) => o.type)).toEqual(['createObject', 'rate']);
  expect(JSON.parse(store.data['unterwegs.outbox.v1'])).toHaveLength(2);
});

it('sends in order and points later edits at the server id of something created offline', async () => {
  const { state, client } = fakeServer();
  const files = fileKeeper();
  const outbox = createOutbox({ storage: async () => memoryStore(), files });
  outbox.enqueue(lodging);
  outbox.enqueue(photo);
  const sentOps: string[] = [];
  const report = await outbox.flush(client, texts, (op, created) => sentOps.push(`${op.type}:${created?.id ?? ''}`));
  expect(state.calls).toEqual(['createLodging', 'uploadImage:L1']);
  // Each sent edit is handed over before it leaves the queue, with the server id of what it created.
  expect(sentOps).toEqual(['createObject:L1', 'uploadImage:img1']);
  expect(report).toMatchObject({ sent: 2, interrupted: false, dropped: [] });
  expect(outbox.get()).toEqual([]);
  expect(outbox.realIdFor('temp-L')).toBe('L1');
  // The kept photo goes into the offline cache and is removed.
  expect(files.settled).toEqual(['file:///docs/outbox/a.jpg']);
});

it('stops without a connection, keeps the edit, and sends it on the next try', async () => {
  const { state, client } = fakeServer();
  const outbox = createOutbox({ storage: async () => memoryStore(), files: fileKeeper() });
  outbox.enqueue(lodging);
  state.fail = new TypeError('Network request failed');
  const first = await outbox.flush(client, texts);
  expect(first.interrupted).toBe(true);
  expect(outbox.get()).toEqual([expect.objectContaining({ type: 'createObject', attempts: 1 })]);
  const second = await outbox.flush(client, texts);
  expect(second.sent).toBe(1);
  expect(outbox.get()).toEqual([]);
});

it('drops an edit the server refuses for good and carries on with the rest', async () => {
  const { state, client } = fakeServer();
  state.collection.locations.push({ id: 'loc', name: 'Temple', visits: [], images: [], attachments: [] } as never);
  const outbox = createOutbox({ storage: async () => memoryStore(), files: fileKeeper() });
  outbox.enqueue({ type: 'rate', collectionId: 'c1', locationId: 'loc', rating: 2 });
  outbox.enqueue(lodging);
  state.fail = new ApiError('forbidden', 403, '/api/locations/loc');
  const report = await outbox.flush(client, texts);
  expect(report.dropped).toHaveLength(1);
  expect(report.sent).toBe(1);
  expect(state.calls).toEqual(['rate:loc:2', 'createLodging']);
});

it('deleting something created offline cancels it, what depends on it, and its kept files', async () => {
  const files = fileKeeper();
  const outbox = createOutbox({ storage: async () => memoryStore(), files });
  outbox.enqueue(lodging);
  outbox.enqueue(photo);
  expect(
    outbox.enqueue({ type: 'deleteObject', collectionId: 'c1', objectKind: 'lodging', objectId: 'temp-L' }),
  ).toBeNull();
  expect(outbox.get()).toEqual([]);
  await Promise.resolve();
  expect(files.settled).toEqual(['file:///docs/outbox/a.jpg']);
});

it('sends an edit made while a flush is running in the same flush', async () => {
  const { state, client } = fakeServer();
  state.collection.locations.push({ id: 'loc', name: 'Temple', visits: [], images: [], attachments: [] } as never);
  const outbox = createOutbox({ storage: async () => memoryStore(), files: fileKeeper() });
  outbox.enqueue(lodging);
  const running = outbox.flush(client, texts);
  outbox.enqueue({ type: 'rate', collectionId: 'c1', locationId: 'loc', rating: 5 });
  await running;
  expect(state.calls).toEqual(['createLodging', 'rate:loc:5']);
});
