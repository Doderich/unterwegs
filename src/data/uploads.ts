import { useSyncExternalStore } from 'react';

import type { UploadFile } from '@/api/client';

/**
 * Uploads that are running or failed, per object. Kept outside the screens so an upload keeps going (and a failed
 * one stays retryable) when the user leaves the screen. A failed upload keeps its local file until it is retried
 * or discarded, so a photo is never lost to a bad connection.
 */
export type PendingUpload = {
  key: string;
  objectId: string;
  media: 'image' | 'file';
  file: UploadFile;
  status: 'uploading' | 'failed';
  /** Retries with the same file. */
  retry: () => void;
};

let pending: PendingUpload[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: PendingUpload[]) {
  pending = next;
  emit();
}

/**
 * Runs `upload` for a file and tracks it. `upload` resolves to null on failure (the caller already showed why).
 */
export function trackUpload(
  objectId: string,
  media: PendingUpload['media'],
  file: UploadFile,
  upload: (file: UploadFile) => Promise<unknown | null>,
): void {
  const key = `${objectId}-${file.uri}`;
  const start = () => {
    set([...pending.filter((p) => p.key !== key), { key, objectId, media, file, status: 'uploading', retry: start }]);
    void upload(file).then((result) => {
      set(
        result === null
          ? pending.map((p) => (p.key === key ? { ...p, status: 'failed' as const } : p))
          : pending.filter((p) => p.key !== key),
      );
    });
  };
  start();
}

export function discardUpload(key: string): void {
  set(pending.filter((p) => p.key !== key));
}

export function usePendingUploads(objectId: string): PendingUpload[] {
  const all = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
  );
  return all.filter((p) => p.objectId === objectId);
}
