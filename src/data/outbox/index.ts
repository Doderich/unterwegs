import type { QueryClient } from '@tanstack/react-query';

import type { ApiClient, UploadFile } from '@/api/client';

import { tempId } from '../edits';
import { createOutbox, type FileKeeper } from './queue';
import { syncOutbox as syncWith } from './sync';
import type { ConflictTexts } from './types';

export { applyPending } from './model';
export { replaceId } from './kinds';
export { diffFields, editOf } from './fields';
export { findObject } from './lookups';
export { findChild, type ChildKind } from './children';
export type { FlushReport } from './queue';
export * from './types';

/**
 * The phone's files for uploads: a picked photo lives in a cache folder the system may empty, so it is copied into
 * the app's documents until the upload went through, then moved into the offline cache under its server URL.
 * Loaded lazily so code that never uploads doesn't load the file system.
 */
const deviceFiles: FileKeeper = {
  async keep(file: UploadFile) {
    try {
      const { Directory, File, Paths } = await import('expo-file-system');
      const folder = new Directory(Paths.document, 'outbox');
      if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
      const target = new File(folder, `${tempId()}-${file.name}`);
      new File(file.uri).copySync(target);
      return { ...file, uri: target.uri };
    } catch {
      // Not copied: the original usually still exists when the connection comes back.
      return file;
    }
  },
  async settle(url: string, localUri: string) {
    try {
      const [{ seedCache }, { File }] = await Promise.all([import('@/offline/fileCache'), import('expo-file-system')]);
      if (url) seedCache(url, localUri);
      if (localUri.includes('/outbox/')) new File(localUri).delete();
    } catch {
      // The next offline sync downloads it instead.
    }
  },
};

/** The app's one outbox, kept in SQLite next to the offline copy. */
const outbox = createOutbox({
  storage: async () => (await import('expo-sqlite/kv-store')).Storage,
  files: deviceFiles,
});

export const subscribeOutbox = outbox.subscribe;
export const getOutbox = outbox.get;
export const enqueue = outbox.enqueue;
export const keepForUpload = outbox.keep;
export const realIdFor = outbox.realIdFor;
export const onFlushRequested = outbox.onFlushRequested;
export const clearOutbox = outbox.clear;
/** Sends the app's waiting edits and updates the cached collections (`sync.ts`). */
export const syncOutbox = (client: ApiClient, cache: QueryClient, texts: ConflictTexts) =>
  syncWith(outbox, client, cache, texts);
