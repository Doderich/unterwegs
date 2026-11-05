import type { Image } from '@/api/schemas';

/** The image that stands for a resource: its primary image, otherwise the first one. */
export function firstImage(images: Image[] | null | undefined): Image | null {
  if (!images?.length) return null;
  return images.find((i) => i.is_primary) ?? images[0];
}
