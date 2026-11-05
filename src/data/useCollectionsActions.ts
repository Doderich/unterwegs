import { useQueryClient } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import { useMemo } from 'react';
import { Alert } from 'react-native';

import type { CollectionInput, UploadFile } from '@/api/client';
import { useClient } from '@/auth/session';
import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';

import { queryKeys } from './queries';
import { errorText, OfflineError } from './useCollectionEdits';

/**
 * Online-only actions on whole collections: create, import, duplicate, invites, sharing, leave, archive, delete.
 * Each refetches the collection list (and the collection) afterwards; failures show an alert and resolve to null.
 */
export function useCollectionsActions() {
  const client = useClient();
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const online = !(network.isInternetReachable === false || network.isConnected === false);

  return useMemo(() => {
    async function run<R>(request: () => Promise<R>, collectionId?: string): Promise<R | null> {
      try {
        if (!online) throw new OfflineError();
        return await request();
      } catch (e) {
        haptics.error();
        Alert.alert(tr('common.notSaved'), errorText(e));
        return null;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections });
        void queryClient.invalidateQueries({ queryKey: queryKeys.invites });
        void queryClient.invalidateQueries({ queryKey: queryKeys.archived });
        if (collectionId) void queryClient.invalidateQueries({ queryKey: queryKeys.collection(collectionId) });
      }
    }
    /** `send` resolves to null on success; turn that into `true` so callers can tell success from failure. */
    const ok = (p: Promise<unknown>) => p.then(() => true as const);

    return {
      online,
      createCollection: (input: CollectionInput) => run(() => client.edit.createCollection(input)),
      acceptInvite: (collectionId: string) => run(() => ok(client.edit.acceptInvite(collectionId)), collectionId),
      declineInvite: (collectionId: string) => run(() => ok(client.edit.declineInvite(collectionId))),
      leave: (collectionId: string) => run(() => ok(client.edit.leaveCollection(collectionId))),
      share: (collectionId: string, userUuid: string) =>
        run(() => ok(client.edit.shareCollection(collectionId, userUuid)), collectionId),
      unshare: (collectionId: string, userUuid: string) =>
        run(() => ok(client.edit.unshareCollection(collectionId, userUuid)), collectionId),
      revokeInvite: (collectionId: string, userUuid: string) =>
        run(() => ok(client.edit.revokeInvite(collectionId, userUuid)), collectionId),
      setArchived: (collectionId: string, archived: boolean) =>
        run(() => client.edit.updateCollection(collectionId, { is_archived: archived }), collectionId),
      /** Public: readable on the website without an account; cascades to the collection's items. */
      setPublic: (collectionId: string, isPublic: boolean) =>
        run(() => client.edit.updateCollection(collectionId, { is_public: isPublic }), collectionId),
      deleteCollection: (collectionId: string) => run(() => ok(client.edit.deleteCollection(collectionId))),
      importCollection: (file: UploadFile) => run(() => client.edit.importCollection(file)),
      /** Owner only. Names the copy "… (Kopie)"; when only the renaming fails it keeps "Copy of …". */
      duplicateCollection: (collectionId: string, name: string) =>
        run(async () => {
          const copy = await client.edit.duplicateCollection(collectionId);
          const renamed = tr('common.nameCopy', { name });
          return client.edit.updateCollection(copy.id, { name: renamed }).catch(() => copy);
        }),
    };
  }, [client, queryClient, online]);
}
