/**
 * @jest-environment node
 */
/**
 * Temporary end-to-end check against a real AdventureLog server (not committed). Runs only with E2E_SERVER and
 * E2E_KEY_FILE set: edits are queued without a connection, "someone else" changes the same things on the server,
 * then the real outbox syncs. A throwaway collection is created and deleted again.
 */
import { readFileSync } from 'fs';
import { request as httpsRequest } from 'https';

import { createClient, type ApiClient } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { createOutbox, type KeyValueStore } from '../data/outbox/queue';

const server = process.env.E2E_SERVER;
const keyFile = process.env.E2E_KEY_FILE;
const run = server && keyFile ? describe : describe.skip;

const texts = {
  copyName: (n: string) => `${n} (offline)`,
  noteCopied: (n: string) => `copied as ${n}`,
  fieldsKept: (n: string) => `kept on ${n}`,
};

function memoryStore(): KeyValueStore {
  const data: Record<string, string> = {};
  return { getItem: async (k) => data[k] ?? null, setItem: async (k, v) => void (data[k] = v) };
}

jest.setTimeout(120_000);

/** Node's own HTTPS (the preset replaces global fetch with a mock). Enough of fetch for the API client. */
const nodeFetch = ((url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
  new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: init.method ?? 'GET', headers: init.headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const status = res.statusCode ?? 0;
        resolve({
          status,
          ok: status >= 200 && status < 300,
          headers: { get: (h: string) => (res.headers[h.toLowerCase()] as string | undefined) ?? null },
          json: async () => JSON.parse(body),
          text: async () => body,
        });
      });
    });
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  })) as unknown as typeof fetch;

run('offline edits against the real server', () => {
  let client: ApiClient;
  let collectionId = '';
  const created: { locations: string[] } = { locations: [] };

  beforeAll(async () => {
    client = createClient({ serverUrl: server!, apiKey: readFileSync(keyFile!, 'utf8').trim() }, nodeFetch);
    const c = await client.edit.createCollection({
      name: 'Unterwegs Testsammlung (offline)',
      description: 'Automatischer Test, wird wieder gelöscht.',
      start_date: '2027-03-01',
      end_date: '2027-03-03',
    });
    collectionId = c.id;
  });

  afterAll(async () => {
    for (const id of created.locations) await client.edit.deleteLocation(id).catch(() => undefined);
    if (collectionId) await client.edit.deleteCollection(collectionId).catch(() => undefined);
  });

  it('replays offline edits on what the server has by then', async () => {
    // Online set-up: a lodging, a note and a checklist.
    const lodging = await client.edit.createLodging({
      name: 'Testhotel',
      check_in: '2027-03-01T06:00:00Z',
      check_out: '2027-03-03T01:00:00Z',
      timezone: 'Asia/Tokyo',
      reservation_number: 'A-1',
      collection: collectionId,
    } as never);
    const note = await client.edit.createNote({
      name: 'Packliste',
      content: 'Socken',
      date: null,
      links: [],
      collection: collectionId,
    });
    const checklist = await client.edit.createChecklist({
      name: 'Vor Abflug',
      items: [
        { name: 'Pässe', is_checked: false },
        { name: 'Ladekabel', is_checked: false },
      ],
      collection: collectionId,
    });
    const before: Collection = await client.getCollection(collectionId);
    const noteBefore = before.notes.find((n) => n.id === note.id)!;
    const listBefore = before.checklists.find((c) => c.id === checklist.id)!;
    const lodgingBefore = before.lodging.find((l) => l.id === lodging.id)!;

    // Offline: edits only go into the outbox.
    const outbox = createOutbox({
      storage: async () => memoryStore(),
      files: { keep: async (f) => f, settle: async () => undefined },
    });
    const passports = listBefore.items.find((i) => i.name === 'Pässe')!;
    outbox.enqueue({
      type: 'checklist',
      collectionId,
      checklistId: checklist.id,
      change: { kind: 'toggle', itemId: passports.id, name: 'Pässe', checked: true },
    });
    outbox.enqueue({
      type: 'updateNote',
      collectionId,
      noteId: note.id,
      baseUpdatedAt: noteBefore.updated_at ?? null,
      input: { name: 'Packliste', content: 'Socken, Mützen (offline)', date: null, links: [] },
    });
    outbox.enqueue({
      type: 'updateObject',
      collectionId,
      objectKind: 'lodging',
      objectId: lodging.id,
      patch: { reservation_number: 'OFF-2', check_in: '2027-03-01T08:00:00Z' },
      base: { reservation_number: lodgingBefore.reservation_number, check_in: lodgingBefore.check_in },
    });
    outbox.enqueue({
      type: 'createObject',
      collectionId,
      objectKind: 'location',
      tempId: 'temp-loc',
      input: { name: 'Offline-Tempel', latitude: 35.0, longitude: 135.77 },
    });
    outbox.enqueue({
      type: 'addToDay',
      collectionId,
      date: '2027-03-01',
      contentType: 'location',
      objectId: 'temp-loc',
    });
    outbox.enqueue({
      type: 'createChild',
      collectionId,
      childKind: 'visit',
      parentId: 'temp-loc',
      tempId: 'temp-visit',
      input: {
        start_date: '2027-03-01T00:00:00Z',
        end_date: '2027-03-01T00:00:00Z',
        timezone: 'Asia/Tokyo',
        notes: 'Am Morgen',
      },
    });
    outbox.enqueue({ type: 'rate', collectionId, locationId: 'temp-loc', rating: 4 });
    outbox.enqueue({ type: 'saveDay', collectionId, date: '2027-03-01', patch: { name: 'Ankunft' }, base: {} });

    // Meanwhile on the website: another item ticked, the note rewritten, the check-in moved.
    const ladekabel = listBefore.items.find((i) => i.name === 'Ladekabel')!;
    await client.edit.updateChecklist(checklist.id, {
      collection: collectionId,
      name: 'Vor Abflug',
      items: listBefore.items.map((i) => ({ name: i.name, is_checked: i.id === ladekabel.id })),
    });
    await new Promise((r) => setTimeout(r, 1100)); // a different updated_at
    await client.edit.updateNote(note.id, {
      name: 'Packliste',
      content: 'Socken, Schal (Website)',
      date: null,
      links: [],
      collection: collectionId,
    });
    await client.edit.updateLodging(lodging.id, {
      name: 'Testhotel',
      check_in: '2027-03-01T07:00:00Z',
      collection: collectionId,
    } as never);

    // Back online.
    const report = await outbox.flush(client, texts);
    const after = await client.getCollection(collectionId);
    const location = after.locations.find((l) => l.name === 'Offline-Tempel');
    if (location) created.locations.push(location.id);

    const summary = {
      report: {
        sent: report.sent,
        conflicts: report.conflicts,
        dropped: report.dropped.length,
        interrupted: report.interrupted,
      },
      checklist: after.checklists.find((c) => c.id === checklist.id)?.items.map((i) => `${i.name}:${!!i.is_checked}`),
      notes: after.notes.map((n) => `${n.name} = ${n.content}`),
      lodging: (({ reservation_number, check_in }) => ({ reservation_number, check_in }))(
        after.lodging.find((l) => l.id === lodging.id)!,
      ),
      location: location && {
        rating: location.rating,
        visits: location.visits.map((v) => `${v.start_date?.slice(0, 10)} ${v.notes}`),
        onDay1: after.itinerary.some((i) => i.object_id === location.id && i.date === '2027-03-01'),
      },
      day1: after.itinerary_days.find((d) => d.date === '2027-03-01')?.name,
      outboxLeft: outbox.get().length,
    };
    console.log(JSON.stringify(summary, null, 2));

    expect(report.interrupted).toBe(false);
    expect(report.dropped).toHaveLength(0);
    expect(summary.checklist).toEqual(['Pässe:true', 'Ladekabel:true']);
    expect(summary.notes).toEqual(
      expect.arrayContaining(['Packliste = Socken, Schal (Website)', 'Packliste (offline) = Socken, Mützen (offline)']),
    );
    expect(summary.lodging.reservation_number).toBe('OFF-2');
    expect(summary.lodging.check_in?.startsWith('2027-03-01T07:00')).toBe(true);
    expect(report.conflicts).toEqual(expect.arrayContaining(['copied as Packliste (offline)', 'kept on Testhotel']));
    expect(summary.location).toMatchObject({ rating: 4, onDay1: true });
    expect(summary.location?.visits).toEqual(['2027-03-01 Am Morgen']);
    expect(summary.day1).toBe('Ankunft');
    expect(summary.outboxLeft).toBe(0);
  });

  it('replays plan, settings, trail and delete edits', async () => {
    const a = await client.edit.createLocation({ name: 'Ort A', collection: collectionId } as never);
    const b = await client.edit.createLocation({ name: 'Ort B', collection: collectionId } as never);
    const c = await client.edit.createLocation({ name: 'Ort C', collection: collectionId } as never);
    created.locations.push(a.id, b.id, c.id);
    const day = '2027-03-02';
    const ia = await client.edit.addToItinerary({
      collection: collectionId,
      content_type: 'location',
      object_id: a.id,
      date: day,
      order: 0,
    });
    const ib = await client.edit.addToItinerary({
      collection: collectionId,
      content_type: 'location',
      object_id: b.id,
      date: day,
      order: 1,
    });
    const before = await client.getCollection(collectionId);

    const outbox = createOutbox({
      storage: async () => memoryStore(),
      files: { keep: async (f) => f, settle: async () => undefined },
    });
    // Offline: swap A and B, move A to day 3, rename the collection, add a trail, delete C.
    outbox.enqueue({ type: 'reorderDay', collectionId, date: day, order: [ib.id, ia.id] });
    outbox.enqueue({ type: 'moveToDay', collectionId, itemId: ia.id, date: '2027-03-03' });
    outbox.enqueue({
      type: 'saveCollection',
      collectionId,
      patch: { name: 'Unterwegs Testsammlung (umbenannt offline)' },
      base: { name: before.name },
    });
    outbox.enqueue({
      type: 'createChild',
      collectionId,
      childKind: 'trail',
      parentId: b.id,
      tempId: 'temp-trail',
      input: { name: 'Philosophenweg', link: 'https://example.org/trail' },
    });
    outbox.enqueue({ type: 'deleteObject', collectionId, objectKind: 'location', objectId: c.id });
    // Created and deleted again offline: never reaches the server.
    outbox.enqueue({
      type: 'createObject',
      collectionId,
      objectKind: 'lodging',
      tempId: 'temp-x',
      input: { name: 'Doch nicht' },
    });
    outbox.enqueue({ type: 'deleteObject', collectionId, objectKind: 'lodging', objectId: 'temp-x' });

    // Meanwhile on the website: another location put on day 2.
    const ic = await client.edit.addToItinerary({
      collection: collectionId,
      content_type: 'location',
      object_id: c.id,
      date: day,
      order: 2,
    });

    const report = await outbox.flush(client, texts);
    const after = await client.getCollection(collectionId);
    const dayItems = (d: string) =>
      after.itinerary
        .filter((i) => i.date === d)
        .sort((x, y) => x.order - y.order)
        .map((i) => after.locations.find((l) => l.id === i.object_id)?.name ?? i.object_id);
    const summary = {
      report: {
        sent: report.sent,
        conflicts: report.conflicts,
        dropped: report.dropped.length,
        interrupted: report.interrupted,
      },
      name: after.name,
      day2: dayItems(day),
      day3: dayItems('2027-03-03'),
      trails: after.locations.find((l) => l.id === b.id)?.trails.map((t) => t.name),
      locations: after.locations.map((l) => l.name).sort(),
      lodgings: after.lodging.map((l) => l.name),
      cItemGone: !after.itinerary.some((i) => i.id === ic.id),
    };
    console.log(JSON.stringify(summary, null, 2));
    expect(report.dropped).toHaveLength(0);
    expect(summary.name).toBe('Unterwegs Testsammlung (umbenannt offline)');
    expect(summary.day3).toEqual(['Ort A']);
    expect(summary.day2).toEqual(['Ort B']);
    expect(summary.trails).toEqual(['Philosophenweg']);
    expect(summary.locations).not.toContain('Ort C');
    expect(summary.lodgings).not.toContain('Doch nicht');
  });
});
