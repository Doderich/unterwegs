import { router } from 'expo-router';
import { Alert } from 'react-native';

import { tr } from '@/i18n';

/** The objects whose editor opens on top of their detail screen. */
export type EditedKind = 'lodging' | 'transportation' | 'location';

const DETAIL = {
  lodging: '/lodging/[collectionId]/[itemId]',
  transportation: '/transport/[collectionId]/[itemId]',
  location: '/location/[collectionId]/[itemId]',
} as const;

type Navigation = Pick<typeof router, 'back' | 'replace' | 'dismissTo' | 'dismiss'>;

/**
 * Where an editor goes once the object is saved: back to the share flow it was opened from, back to the detail
 * screen it was opened from (an edit), or on to the new object's detail screen (a create), where photos and files
 * can be added. `nav` is for tests.
 */
export function leaveAfterSave(
  kind: EditedKind,
  { collectionId, savedId, created, fromShare = false }: {
    collectionId: string;
    savedId: string;
    created: boolean;
    fromShare?: boolean;
  },
  nav: Navigation = router,
) {
  if (fromShare) nav.dismissTo({ pathname: '/share', params: { collectionId, objectId: savedId, kind } });
  else if (!created) nav.back();
  else nav.replace({ pathname: DETAIL[kind], params: { collectionId, itemId: savedId } });
}

/**
 * Asks before deleting an object from its editor. The editor is opened from the object's detail screen, so deleting
 * closes both (the detail would show nothing), then deletes.
 */
export function confirmDeleteFromEditor(
  { name, consequence, onDelete }: { name: string; consequence: string; onDelete: () => Promise<unknown> },
  nav: Navigation = router,
) {
  Alert.alert(tr('common.deleteNameConfirm', { name }), consequence, [
    { text: tr('common.cancel'), style: 'cancel' },
    {
      text: tr('common.delete'),
      style: 'destructive',
      onPress: async () => {
        nav.dismiss(2);
        await onDelete();
      },
    },
  ]);
}
