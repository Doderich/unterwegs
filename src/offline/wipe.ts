import { Image } from 'expo-image';

import { deleteAllRegions } from '@/maps/offline';
import { clearExports } from '@/ui/serverFile';

import { clearFileCache } from './fileCache';
import { clearKeyedImages } from './imageCache';

/**
 * Removes what the signed-in account left on the device besides the query cache: downloaded files and exports,
 * cached images and map areas. Runs once signed out (sign-out, account deletion, a revoked key), so the next account
 * or server starts clean. Each part is best effort; a failure never blocks signing in again.
 */
export async function wipeLocalData(): Promise<void> {
  try {
    clearFileCache();
    clearKeyedImages();
    clearExports();
  } catch {
    // Retried on the next start while signed out.
  }
  await Promise.allSettled([deleteAllRegions(), Image.clearDiskCache(), Image.clearMemoryCache()]);
}
