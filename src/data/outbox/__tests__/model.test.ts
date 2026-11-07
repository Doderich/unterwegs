import { ApiError, SchemaError, createClient } from '@/api/client';
import type { Collection } from '@/api/schemas';

import { applyChecklistChange } from '../lookups';
import { applyPending, failureKind, mergeIntoPending, sendOp, withRealId } from '../model';
import type { OutboxOp } from '../types';

const base = { id: 'op', createdAt: 0, attempts: 0, collectionId: 'c1' };

function collection(patch: Partial<Collection> = {}): Collection {
  return {
    id: 'c1',
    name: 'Trip',
    notes: [{ id: 'n1', name: 'Packing', content: 'Socks', date: null, updated_at: '2026-11-01T10:00:00Z' }],
    checklists: [
      {
        id: 'l1',
        name: 'Before leaving',
        date: null,
        items: [
          { id: 'i1', name: 'Passports', is_checked: false },
          { id: 'i2', name: 'Chargers', is_checked: false },
        ],
      },
    ],
    locations: [{ id: 'loc', name: 'Temple', visits: [], images: [], attachments: [], trails: [] }],
    itinerary: [],
    itinerary_days: [],
    lodging: [],
    transportations: [],
    ...patch,
  } as unknown as Collection;
}

/** A client whose requests are recorded and answered with the request body. */
function recordingClient() {
  const requests: { method: string; url: string; body: Record<string, unknown> | null }[] = [];
  const client = createClient({ serverUrl: 'https://example.org', apiKey: 'al_test' }, async (input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    requests.push({ method: init?.method ?? 'GET', url: String(input), body });
    if (String(input).endsWith('/reorder'))
      return new Response(
        JSON.stringify(
          (body?.items as object[]).map((i) => ({ ...i, content_type: 'location', object_id: 'o', is_global: false })),
        ),
      );
    const items = Array.isArray(body?.items)
      ? (body.items as object[]).map((item, i) => ({ id: `item-${i}`, ...item }))
      : [];
    return new Response(JSON.stringify({ id: 'server-id', name: 'x', visits: [], ...body, items }));
  });
  return { client, requests };
}

const copyName = {
  copyName: (name: string) => `${name} (offline)`,
  noteCopied: (name: string) => `copied as ${name}`,
  fieldsKept: (name: string) => `kept on ${name}`,
};

describe('checklist changes replay by item, not by snapshot', () => {
  it('ticks an item found by name when the server re-created the ids', () => {
    const list = { id: 'l1', name: 'L', date: null, items: [{ id: 'new-id', name: 'Passports', is_checked: false }] };
    const next = applyChecklistChange(list, { kind: 'toggle', itemId: 'old-id', name: 'Passports', checked: true });
    expect(next.items[0].is_checked).toBe(true);
  });

  it('keeps someone else’s tick on another item', async () => {
    // The server already has "Chargers" ticked by someone else; our offline tick on "Passports" must not undo it.
    const fresh = collection();
    fresh.checklists[0].items[1].is_checked = true;
    const { client, requests } = recordingClient();
    const op: OutboxOp = {
      ...base,
      type: 'checklist',
      checklistId: 'l1',
      change: { kind: 'toggle', itemId: 'i1', name: 'Passports', checked: true },
    };
    await sendOp({ client, texts: copyName }, op, fresh);
    expect(requests[0].body).toEqual({
      collection: 'c1',
      name: 'Before leaving',
      items: [
        { name: 'Passports', is_checked: true },
        { name: 'Chargers', is_checked: true },
      ],
    });
  });
});

describe('notes', () => {
  const input = { name: 'Packing', content: 'Socks, hats', date: null, links: [] };

  it('updates a note nobody else changed, keeping the collection', async () => {
    const { client, requests } = recordingClient();
    const op: OutboxOp = { ...base, type: 'updateNote', noteId: 'n1', baseUpdatedAt: '2026-11-01T10:00:00Z', input };
    await expect(sendOp({ client, texts: copyName }, op, collection())).resolves.toEqual({ status: 'sent' });
    expect(requests[0]).toMatchObject({ method: 'PATCH', url: 'https://example.org/api/notes/n1' });
    expect(requests[0].body?.collection).toBe('c1');
  });

  it('saves a copy instead of overwriting a note changed on the server meanwhile', async () => {
    const { client, requests } = recordingClient();
    const op: OutboxOp = { ...base, type: 'updateNote', noteId: 'n1', baseUpdatedAt: '2026-10-01T10:00:00Z', input };
    await expect(sendOp({ client, texts: copyName }, op, collection())).resolves.toEqual({
      status: 'conflict',
      notice: 'copied as Packing (offline)',
    });
    expect(requests[0]).toMatchObject({ method: 'POST', url: 'https://example.org/api/notes' });
    expect(requests[0].body).toMatchObject({ name: 'Packing (offline)', content: 'Socks, hats', collection: 'c1' });
  });

  it('does not create a note twice when a retry finds it already saved', async () => {
    const { client, requests } = recordingClient();
    const fresh = collection({
      notes: [{ id: 'n9', name: 'Packing', content: 'Socks, hats', date: null }],
    } as Partial<Collection>);
    const op: OutboxOp = { ...base, attempts: 1, type: 'createNote', tempId: 'temp-1', input };
    await expect(sendOp({ client, texts: copyName }, op, fresh)).resolves.toEqual({
      status: 'sent',
      created: { tempId: 'temp-1', id: 'n9' },
    });
    expect(requests).toHaveLength(0);
  });

  it('points later edits of an offline note at its server id, with nothing to conflict with', () => {
    const op: OutboxOp = { ...base, type: 'updateNote', noteId: 'temp-1', baseUpdatedAt: 'x', input };
    expect(withRealId(op, 'temp-1', 'n9')).toMatchObject({ noteId: 'n9', baseUpdatedAt: null });
  });
});

it('adds "visited today" only once', async () => {
  const { client, requests } = recordingClient();
  const fresh = collection();
  fresh.locations[0].visits = [
    { id: 'v', start_date: '2026-12-20T00:00:00Z', end_date: null, timezone: null, notes: null, activities: [] },
  ];
  const op: OutboxOp = {
    ...base,
    type: 'visitToday',
    tempId: 't',
    locationId: 'loc',
    date: '2026-12-20T00:00:00Z',
    timezone: 'Asia/Tokyo',
  };
  await expect(sendOp({ client, texts: copyName }, op, fresh)).resolves.toEqual({ status: 'skipped' });
  expect(requests).toHaveLength(0);
});

it('shows waiting edits on top of the saved collection', () => {
  const ops: OutboxOp[] = [
    { ...base, type: 'createChecklist', tempId: 'temp-l', name: 'Snacks', date: '2026-12-18' },
    { ...base, type: 'addToDay', date: '2026-12-18', contentType: 'checklist', objectId: 'temp-l' },
    { ...base, type: 'rate', locationId: 'loc', rating: 5 },
    { ...base, collectionId: 'other', type: 'rate', locationId: 'loc', rating: 1 },
  ];
  const shown = applyPending(collection(), ops);
  expect(shown.checklists.map((c) => c.name)).toContain('Snacks');
  expect(shown.itinerary).toHaveLength(1);
  expect(shown.locations[0].rating).toBe(5);
});

it('folds a second offline edit of the same note into the first', () => {
  const first: OutboxOp = {
    ...base,
    type: 'updateNote',
    noteId: 'n1',
    baseUpdatedAt: 'v1',
    input: { name: 'A', content: '1', date: null, links: [] },
  };
  const merged = mergeIntoPending(
    [first],
    {
      type: 'updateNote',
      collectionId: 'c1',
      noteId: 'n1',
      baseUpdatedAt: 'v1',
      input: { name: 'A', content: '2', date: null, links: [] },
    },
    null,
  );
  expect(merged?.ops).toHaveLength(1);
  expect(merged?.op).toMatchObject({ baseUpdatedAt: 'v1', input: { content: '2' } });
  // Never into the edit being sent right now.
  expect(
    mergeIntoPending([first], { type: 'rate', collectionId: 'c1', locationId: 'loc', rating: 3 }, first),
  ).toBeNull();
});

it('retries when there is no answer, drops what the server refuses', () => {
  expect(failureKind(new TypeError('Network request failed'))).toBe('retry');
  expect(failureKind(new ApiError('down', 503, '/api/notes'))).toBe('retry');
  expect(failureKind(new ApiError('forbidden', 403, '/api/notes'))).toBe('drop');
  expect(failureKind(new SchemaError('/api/notes', []))).toBe('done');
});

describe('stays, connections and days merge field by field', () => {
  const lodging = {
    id: 'stay',
    name: 'Ryokan',
    check_in: '2026-12-20T06:00:00Z',
    reservation_number: 'A1',
    images: [],
    attachments: [],
  };

  it('sends only what we changed, with the collection and name (collaborators lose it otherwise)', async () => {
    const { client, requests } = recordingClient();
    const fresh = collection({ lodging: [lodging] } as unknown as Partial<Collection>);
    const op: OutboxOp = {
      ...base,
      type: 'updateObject',
      objectKind: 'lodging',
      objectId: 'stay',
      patch: { reservation_number: 'B2' },
      base: { reservation_number: 'A1' },
    };
    await expect(sendOp({ client, texts: copyName }, op, fresh)).resolves.toEqual({ status: 'sent' });
    expect(requests[0]).toMatchObject({ method: 'PATCH', url: 'https://example.org/api/lodging/stay' });
    expect(requests[0].body).toEqual({ name: 'Ryokan', reservation_number: 'B2', collection: 'c1' });
  });

  it('keeps a field someone else changed meanwhile and still saves the others', async () => {
    const { client, requests } = recordingClient();
    // Someone moved the check-in on the website; we changed check-in and the booking number offline.
    const fresh = collection({
      lodging: [{ ...lodging, check_in: '2026-12-20T07:00:00Z' }],
    } as unknown as Partial<Collection>);
    const op: OutboxOp = {
      ...base,
      type: 'updateObject',
      objectKind: 'lodging',
      objectId: 'stay',
      patch: { check_in: '2026-12-20T08:00:00Z', reservation_number: 'B2' },
      base: { check_in: '2026-12-20T06:00:00Z', reservation_number: 'A1' },
    };
    await expect(sendOp({ client, texts: copyName }, op, fresh)).resolves.toEqual({
      status: 'conflict',
      notice: 'kept on Ryokan',
    });
    expect(requests[0].body).toEqual({ name: 'Ryokan', reservation_number: 'B2', collection: 'c1' });
  });

  it('keeps the type on a connection update', async () => {
    const { client, requests } = recordingClient();
    const fresh = collection({
      transportations: [{ id: 'train', name: 'Shinkansen', type: 'train', images: [], attachments: [] }],
    } as unknown as Partial<Collection>);
    const op: OutboxOp = {
      ...base,
      type: 'updateObject',
      objectKind: 'transportation',
      objectId: 'train',
      patch: { name: 'Nozomi 21' },
      base: { name: 'Shinkansen' },
    };
    await sendOp({ client, texts: copyName }, op, fresh);
    expect(requests[0].body).toEqual({ name: 'Nozomi 21', type: 'train', collection: 'c1' });
  });
});

describe('the day plan', () => {
  const plan = (ids: string[]) =>
    ids.map((id, order) => ({
      id,
      content_type: 'location',
      object_id: `o-${id}`,
      date: '2026-12-20',
      is_global: false,
      order,
    }));

  it('applies our order and keeps entries someone else added at the end', async () => {
    const { client, requests } = recordingClient();
    const fresh = collection({ itinerary: plan(['a', 'b', 'x']) } as unknown as Partial<Collection>);
    const op: OutboxOp = { ...base, type: 'reorderDay', date: '2026-12-20', order: ['b', 'a'] };
    await sendOp({ client, texts: copyName }, op, fresh);
    expect(requests[0].body).toEqual({
      items: [
        { id: 'b', date: '2026-12-20', order: 0 },
        { id: 'a', date: '2026-12-20', order: 1 },
        { id: 'x', date: '2026-12-20', order: 2 },
      ],
    });
  });

  it('taking an entry off a day it was only put on offline cancels both', () => {
    const added: OutboxOp = {
      ...base,
      id: 'op1',
      type: 'addToDay',
      date: '2026-12-20',
      contentType: 'note',
      objectId: 'n1',
    };
    const merged = mergeIntoPending(
      [added],
      { type: 'removeFromDay', collectionId: 'c1', itemId: 'pending-op1' },
      null,
    );
    expect(merged).toEqual({ ops: [], op: null });
  });

  it('deleting something created offline cancels it and everything waiting for it', () => {
    const ops: OutboxOp[] = [
      { ...base, id: '1', type: 'createObject', objectKind: 'lodging', tempId: 'temp-s', input: { name: 'Hotel' } },
      { ...base, id: '2', type: 'addToDay', date: '2026-12-20', contentType: 'lodging', objectId: 'temp-s' },
      { ...base, id: '3', type: 'rate', locationId: 'loc', rating: 4 },
    ];
    const merged = mergeIntoPending(
      ops,
      { type: 'deleteObject', collectionId: 'c1', objectKind: 'lodging', objectId: 'temp-s' },
      null,
    );
    expect(merged?.ops.map((o) => o.id)).toEqual(['3']);
    expect(merged?.op).toBeNull();
  });
});

describe('visits, trails, activities, attachments and the collection', () => {
  const visit = {
    id: 'v1',
    start_date: '2026-12-20T00:00:00Z',
    end_date: '2026-12-20T00:00:00Z',
    timezone: 'Asia/Tokyo',
    notes: 'Morning',
    activities: [],
  };
  const withVisitOnPlace = () => {
    const c = collection();
    c.locations[0].visits = [visit];
    return c;
  };

  it('updates a visit field by field', async () => {
    const { client, requests } = recordingClient();
    const op: OutboxOp = {
      ...base,
      type: 'updateChild',
      childKind: 'visit',
      childId: 'v1',
      patch: { notes: 'Morning, with tea' },
      base: { notes: 'Morning' },
    };
    await expect(sendOp({ client, texts: copyName }, op, withVisitOnPlace())).resolves.toEqual({ status: 'sent' });
    expect(requests[0]).toMatchObject({ method: 'PATCH', url: 'https://example.org/api/visits/v1' });
    expect(requests[0].body).toEqual({ notes: 'Morning, with tea' });
  });

  it('lets an activity written on a visit created offline follow the visit to its server id', () => {
    const activity: OutboxOp = {
      ...base,
      type: 'createChild',
      childKind: 'activity',
      parentId: 'temp-visit',
      tempId: 'temp-act',
      input: { name: 'Hike', sport_type: 'hike' },
    };
    expect(withRealId(activity, 'temp-visit', 'v9')).toMatchObject({ parentId: 'v9' });
  });

  it('shows a waiting attachment and cancels it when deleted before it was sent', () => {
    const upload: OutboxOp = {
      ...base,
      type: 'createChild',
      childKind: 'attachment',
      parentId: 'loc',
      ownerKind: 'location',
      tempId: 'temp-file',
      input: { name: 'Tickets' },
      file: { uri: 'file:///docs/outbox/tickets.pdf', name: 'tickets.pdf', type: 'application/pdf' },
    };
    const shown = applyPending(collection(), [upload]);
    expect(shown.locations[0].attachments).toEqual([
      expect.objectContaining({ id: 'temp-file', name: 'Tickets', file: 'file:///docs/outbox/tickets.pdf' }),
    ]);
    expect(
      mergeIntoPending(
        [upload],
        { type: 'deleteChild', collectionId: 'c1', childKind: 'attachment', childId: 'temp-file' },
        null,
      ),
    ).toEqual({ ops: [], op: null });
  });

  it('makes a photo added offline the cover once it is uploaded', () => {
    const cover: OutboxOp = {
      ...base,
      type: 'saveCollection',
      patch: { primary_image_id: 'temp-img' },
      base: { primary_image_id: null },
    };
    expect(withRealId(cover, 'temp-img', 'img-1')).toMatchObject({ patch: { primary_image_id: 'img-1' } });
  });

  it('keeps the other collections of a place added to this one', async () => {
    const requests: { url: string; body: unknown }[] = [];
    const client = createClient({ serverUrl: 'https://example.org', apiKey: 'al_test' }, async (input, init) => {
      requests.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
      return new Response(
        JSON.stringify({
          id: 'lib',
          name: 'Fushimi Inari',
          collections: init?.body ? ['other', 'c1'] : ['other'],
          visits: [],
          images: [],
          attachments: [],
          trails: [],
        }),
      );
    });
    const op: OutboxOp = { ...base, type: 'linkLocation', locationId: 'lib', snapshot: { name: 'Fushimi Inari' } };
    await sendOp({ client, texts: copyName }, op, collection());
    expect(requests[1].body).toEqual({ name: 'Fushimi Inari', collections: ['other', 'c1'] });
  });
});
