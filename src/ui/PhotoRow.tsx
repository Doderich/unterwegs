import { RNHostView } from '@expo/ui';
import { useWindowDimensions, View } from 'react-native';

import { READABLE_WIDTH } from './Host.android';

import { PhotoCards, type PhotoRowProps } from './PhotoCard';

export type { PhotoRowProps } from './PhotoCard';

/**
 * Android: the card straight in the page's list, outside any section (`photoSection` splits sections around it),
 * because a Material section would put it inside a padded row. The list's own spacing keeps cards apart.
 */
export function PhotoRow({ cards, columns }: { cards: PhotoRowProps[]; columns?: number }) {
  // The host sizes itself to its content, so the card gets the list's width (16 dp padding each side).
  const { width } = useWindowDimensions();
  return (
    <RNHostView matchContents>
      <View style={{ width: Math.min(width, READABLE_WIDTH) - 32 }}>
        <PhotoCards cards={cards} columns={columns} />
      </View>
    </RNHostView>
  );
}
