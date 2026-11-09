import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema } from '@/api/schemas';
import { collectionMediaUrls } from '@/data/selectors';
import { collectionReadiness } from '../readiness';

jest.mock('../fileCache', () => ({ localUri: () => null }));

it('counts unique images, attachments and GPX files with the same totals used by reminders', () => {
  const collection = collectionSchema.parse(sample);
  const media = collectionMediaUrls(collection);
  const saved = new Set([...media.images.slice(0, 2), ...media.attachments.slice(0, 1)]);
  const readiness = collectionReadiness(collection, (url) => saved.has(url));
  expect(readiness.images).toEqual({ total: media.images.length, cached: 2 });
  expect(readiness.attachments).toEqual({ total: media.attachments.length, cached: 1 });
  expect(readiness.missing).toBe(media.images.length + media.attachments.length - saved.size);
  expect(collectionReadiness(collection, () => true).missing).toBe(0);
  expect(collectionReadiness(collection, () => false).missing).toBe(media.images.length + media.attachments.length);
});
