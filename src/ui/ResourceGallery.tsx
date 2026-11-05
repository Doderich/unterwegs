import { RNHostView } from '@expo/ui';

import type { Image } from '@/api/schemas';

import { PhotoPager } from './PhotoPager';

/** Detail-screen gallery as the first row of a FieldGroup section; the title follows below it. */
export function ResourceGallery(props: { images: Image[]; title: string; collectionId?: string; ratio?: number }) {
  if (props.images.length === 0) return null;
  return (
    <RNHostView matchContents={{ vertical: true }}>
      <PhotoPager {...props} inset={64} rounded />
    </RNHostView>
  );
}
