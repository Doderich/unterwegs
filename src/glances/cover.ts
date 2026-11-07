import { Directory, File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { widgetsDirectory } from 'expo-widgets';

import type { Collection } from '@/api/schemas';
import { localUri } from '@/offline/fileCache';

/*
 * The Next widget's cover photo. Widgets have neither the API key nor maybe a network, so the photo comes from the
 * offline file cache only: a small JPEG copy in the App Group folder (`widgetsDirectory`). Without a cached photo
 * the widget shows none. Signing out removes the copies.
 */

const PREFIX = 'cover-';

function folder(): Directory | null {
  try {
    return widgetsDirectory ? new Directory(widgetsDirectory) : null;
  } catch {
    return null;
  }
}

/** The collection's cover, else the first photo of one of its locations: the same order as the hero. */
function coverUrl(collection: Collection): string | null {
  return collection.primary_image?.image ?? collection.locations.find((l) => l.images.length)?.images[0].image ?? null;
}

/** `file://` URI of the widget copy, '' when there is no cached photo. Reuses the copy while the photo is the same. */
export async function widgetCover(collection: Collection | null): Promise<string> {
  const dir = folder();
  if (!dir || !collection) return '';
  const url = coverUrl(collection);
  const source = url ? localUri(url) : null;
  if (!url || !source) return '';
  const name = `${PREFIX}${hash(url)}.jpg`;
  try {
    const target = new File(dir, name);
    if (!target.exists) {
      const image = await ImageManipulator.manipulate(source).resize({ width: 600 }).renderAsync();
      const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      new File(saved.uri).move(target);
    }
    for (const entry of dir.list())
      if (entry instanceof File && entry.name.startsWith(PREFIX) && entry.name !== name) entry.delete();
    return target.uri;
  } catch {
    return '';
  }
}

/** Sign-out: no photo of the account stays in the shared folder. */
export function clearWidgetCovers() {
  const dir = folder();
  if (!dir) return;
  try {
    for (const entry of dir.list()) if (entry instanceof File && entry.name.startsWith(PREFIX)) entry.delete();
  } catch {
    // Nothing there.
  }
}

/** Short stable name for a URL (FNV-1a). */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
