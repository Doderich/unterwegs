import { RNHostView, VStack } from '@expo/ui/swift-ui';
import { listRowInsets } from '@expo/ui/swift-ui/modifiers';

import type { Image } from '@/api/schemas';

import { PhotoPager } from './PhotoPager';

/**
 * Detail-screen gallery as the first row of a FieldGroup section, edge to edge in the inset-grouped card
 * (zero row insets), so the title below sits on the card's solid surface.
 */
export function ResourceGallery(props: { images: Image[]; title: string; collectionId?: string; ratio?: number }) {
  if (props.images.length === 0) return null;
  return (
    <VStack modifiers={[listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 })]}>
      <RNHostView matchContents={{ vertical: true }}>
        <PhotoPager {...props} inset={32} />
      </RNHostView>
    </VStack>
  );
}
