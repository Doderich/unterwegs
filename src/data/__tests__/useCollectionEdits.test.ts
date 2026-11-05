import { QueryClient, useQueryClient } from '@tanstack/react-query';

import sample from '../../../docs/samples/collection-detail.json';
import { createClient } from '@/api/client';
import { collectionSchema } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { buildCollectionView } from '../selectors';
import { useCollectionEdits as createEdits } from '../useCollectionEdits';

// Exercise the action callbacks and real API client without mounting native UI.
jest.mock('react', () => ({ ...jest.requireActual('react'), useMemo: (fn: () => unknown) => fn() }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));
jest.mock('@/auth/session', () => ({ useClient: jest.fn() }));
jest.mock('@/offline/fileCache', () => ({ seedCache: jest.fn() }));
jest.mock('@/settings/haptics', () => ({ haptics: { error: jest.fn() } }));

it('preserves collection membership on collaborator edits to collection items', async () => {
  const collection = collectionSchema.parse(sample);
  const queryClient = new QueryClient();
  jest.mocked(useQueryClient).mockReturnValue(queryClient);
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const impl: typeof fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push({ url: String(input), body });
    // Pinned server interprets a missing collection as an attempt to remove it.
    if (body.collection !== collection.id)
      return new Response(JSON.stringify({ detail: 'You cannot remove the collection as you are not the owner.' }), {
        status: 403,
      });
    return new Response(JSON.stringify({ id: 'saved', ...body }));
  };
  jest.mocked(useClient).mockReturnValue(createClient({ serverUrl: 'https://example.org', apiKey: 'al_test' }, impl));
  const actions = createEdits(buildCollectionView(collection));
  await expect(
    actions.saveNote('note', { name: 'Note', content: 'Edited', date: null, links: [] }),
  ).resolves.not.toBeNull();
  await expect(actions.renameChecklist({ id: 'list', name: 'List', items: [] }, 'Edited')).resolves.not.toBeNull();
  await expect(actions.saveLodging('lodging', { name: 'Edited' })).resolves.not.toBeNull();
  await expect(actions.saveTransportation('train', { name: 'Edited', type: 'train' })).resolves.not.toBeNull();
  expect(requests.map(({ url }) => url)).toEqual([
    'https://example.org/api/notes/note',
    'https://example.org/api/checklists/list',
    'https://example.org/api/lodging/lodging',
    'https://example.org/api/transportations/train',
  ]);
  expect(requests.every(({ body }) => body.collection === collection.id)).toBe(true);
  queryClient.clear();
});
