import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { DuplicateMatch } from '@/api/schemas';
import { useClient } from '@/auth/session';
import type { CollectionView } from '@/data/selectors';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { formatDistance } from '@/ui/format';

type Candidate = { name: string; latitude?: number | null; longitude?: number | null; location?: string | null };

/**
 * Before a new location is created: asks the server for a likely duplicate among the user's locations and, if there
 * is one, offers to open it (already in this collection) or use it (adds it to this collection) instead.
 * Resolves to `true` when the caller should go on and create the new location.
 */
export function useDuplicateGuard(edits: CollectionEdits, view: CollectionView | null | undefined) {
  const client = useClient();

  return async (candidate: Candidate, onDay?: string): Promise<boolean> => {
    let match: DuplicateMatch | undefined;
    try {
      match = (await client.edit.checkDuplicates(candidate))[0];
    } catch {
      // A failed check must never block creating a location.
      return true;
    }
    if (!match || !view) return true;
    const collectionId = view.collection.id;
    const open = (itemId: string) =>
      router.replace({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId } });
    const inThis = view.collection.locations.some((l) => l.id === match.id);
    const detail = [
      match.location,
      formatDistance(match.distance_meters != null ? match.distance_meters / 1000 : null),
      match.is_visited ? tr('common.visited') : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return new Promise((resolve) =>
      Alert.alert(
        inThis
          ? tr('duplicateGuard.nameAlreadyInTrip', { name: match.name })
          : tr('duplicateGuard.nameAlreadyExists', { name: match.name }),
        [detail, inThis ? null : tr('duplicateGuard.youCanAddExistingPlace')].filter(Boolean).join('\n\n'),
        [
          {
            text: inThis ? tr('common.open') : tr('duplicateGuard.useIt'),
            onPress: async () => {
              if (inThis) open(match.id);
              else {
                const linked = await edits.linkLocation(match.id, onDay);
                if (linked) open(linked.id);
              }
              resolve(false);
            },
          },
          { text: tr('duplicateGuard.createAnyway'), onPress: () => resolve(true) },
          { text: tr('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      ),
    );
  };
}
