import type { ApiClient } from '@/api/client';
import type { Collection } from '@/api/schemas';

import type { FileKeeper, KeyValueStore } from '../queue';

/** In-memory stand-ins for the outbox's storage, kept files and the server, shared by the outbox tests. */

export const texts = {
  copyName: (n: string) => `${n} (offline)`,
  noteCopied: (n: string) => `copied as ${n}`,
  fieldsKept: (n: string) => `kept on ${n}`,
};

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

export function fileKeeper(): FileKeeper & { settled: string[] } {
  const settled: string[] = [];
  return {
    settled,
    keep: async (file) => ({ ...file, uri: `file:///docs/outbox/${file.name}` }),
    settle: async (_url, localUri) => {
      settled.push(localUri);
    },
  };
}

/** A tiny server holding one collection; `fail` makes the next write throw. */
export function fakeServer() {
  const state = {
    collection: {
      id: 'c1',
      name: 'Trip',
      notes: [],
      checklists: [],
      locations: [],
      lodging: [],
      transportations: [],
      itinerary: [],
      itinerary_days: [],
    } as unknown as Collection,
    calls: [] as string[],
    fail: null as unknown,
  };
  const write = <T>(name: string, fn: () => T): Promise<T> => {
    state.calls.push(name);
    if (state.fail) {
      const e = state.fail;
      state.fail = null;
      return Promise.reject(e);
    }
    return Promise.resolve(fn());
  };
  const client = {
    getCollection: async () => structuredClone(state.collection),
    edit: {
      createLodging: (l: { name: string }) =>
        write('createLodging', () => {
          const saved = { id: 'L1', name: l.name, images: [], attachments: [] };
          state.collection.lodging.push(saved as never);
          return saved;
        }),
      uploadImage: (_kind: string, objectId: string) =>
        write(`uploadImage:${objectId}`, () => ({ id: 'img1', image: 'https://example.org/media/img1.jpg' })),
      rateLocation: (id: string, rating: number) => write(`rate:${id}:${rating}`, () => ({})),
    },
  } as unknown as ApiClient;
  return { state, client };
}
