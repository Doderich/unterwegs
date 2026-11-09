import { RNHostView, VStack } from '@expo/ui/swift-ui';
import { listRowBackground, listRowInsets, listRowSeparator } from '@expo/ui/swift-ui/modifiers';

import { PHOTO_CARD_GAP, PhotoCards, type PhotoRowProps } from './PhotoCard';

/**
 * iOS: the cards replace the list row's own background and separator, with half the gap above and below, so
 * consecutive photo rows stand apart instead of running into one block. One card, or two side by side on iPad.
 */
export function PhotoRow({ cards, columns }: { cards: PhotoRowProps[]; columns?: number }) {
  return (
    <VStack
      modifiers={[
        listRowInsets({ top: PHOTO_CARD_GAP / 2, leading: 0, bottom: PHOTO_CARD_GAP / 2, trailing: 0 }),
        listRowBackground('clear'),
        listRowSeparator('hidden'),
      ]}>
      <RNHostView matchContents={{ vertical: true }}>
        <PhotoCards cards={cards} columns={columns} />
      </RNHostView>
    </VStack>
  );
}
