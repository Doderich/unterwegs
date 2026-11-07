import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';

import { patch, writeOnline } from '../onlineWrite';

jest.mock('@/settings/haptics', () => ({ haptics: { success: jest.fn(), error: jest.fn() } }));

const key = ['world', 'countries'];

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  queryClient.setQueryData(key, [1, 2]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  return { queryClient, alert, invalidate };
}

afterEach(() => jest.restoreAllMocks());

it('shows the change at once, keeps it on success and refreshes the given reads', async () => {
  const { queryClient, invalidate } = setup();
  let seenDuringRequest: unknown;
  const result = await writeOnline(queryClient, true, {
    request: async () => {
      seenDuringRequest = queryClient.getQueryData(key);
      return 'ok';
    },
    optimistic: [patch<number[]>(key, (d) => [...d, 3])],
    refetch: [key],
  });
  expect(result).toBe('ok');
  expect(seenDuringRequest).toEqual([1, 2, 3]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
});

it('rolls the change back and reports when the server refuses', async () => {
  const { queryClient, alert } = setup();
  const result = await writeOnline(queryClient, true, {
    request: () => Promise.reject(new ApiError('nope', 403, '/x')),
    optimistic: [patch<number[]>(key, (d) => [...d, 3])],
    forbidden: 'Not your collection',
  });
  expect(result).toBeNull();
  expect(queryClient.getQueryData(key)).toEqual([1, 2]);
  expect(alert).toHaveBeenCalledWith(expect.any(String), 'Not your collection');
});

it('refuses offline without sending or patching', async () => {
  const { queryClient, alert } = setup();
  const request = jest.fn();
  expect(await writeOnline(queryClient, false, { request, optimistic: [patch<number[]>(key, () => [])] })).toBeNull();
  expect(request).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(key)).toEqual([1, 2]);
  expect(alert).toHaveBeenCalled();
});
