import type { Collection } from '@/api/schemas';
import { collectionMediaUrls } from '@/data/selectors';
import { localUri } from './fileCache';

/** Shared by the readiness screen and local reminders; a map pack is never proof of complete coverage. */
export function collectionReadiness(collection: Collection, available: (url: string) => unknown = localUri) {
  const media = collectionMediaUrls(collection);
  const count = (urls: string[]) => ({ total: urls.length, cached: urls.filter((url) => available(url)).length });
  const images = count(media.images);
  const attachments = count(media.attachments);
  return { images, attachments, missing: images.total + attachments.total - images.cached - attachments.cached };
}
