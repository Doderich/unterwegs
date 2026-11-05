import {
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
  type OfflinePackError,
} from '@maplibre/maplibre-react-native';
import { requireOptionalNativeModule } from 'expo';

import { MAP_STYLE, type RegionPlan } from './regions';

export type SavedRegion = {
  pack: OfflinePack;
  status: OfflinePackStatus;
  name: string;
  maxZoom: number;
  error?: string;
};
const errors = new Map<string, string>();
let creating = false;
const observed = new Set<string>();
const SIZE_LIMIT = 45 * 1024 * 1024; // headroom below the provider's 50 MB allowance for in-flight requests
const progress = (pack: OfflinePack, status: OfflinePackStatus) => {
  // Guard changes to the provider style as well as our conservative preflight count.
  if (
    (status.completedTileCount >= 2900 || status.completedResourceSize >= SIZE_LIMIT) &&
    status.state !== 'complete'
  ) {
    errors.set(pack.id, 'area-limit');
    void pack.pause().catch(() => {});
  }
};
const onError = (pack: OfflinePack, error: OfflinePackError) => {
  errors.set(pack.id, error.message);
  void pack.pause().catch(() => {});
};
async function observe(pack: OfflinePack) {
  if (observed.has(pack.id)) return;
  await OfflineManager.addListener(pack.id, progress, onError);
  observed.add(pack.id);
}

export async function savedRegions(collectionId: string): Promise<SavedRegion[]> {
  const packs = (await OfflineManager.getPacks()).filter((p) => p.metadata.unterwegsCollection === collectionId);
  return Promise.all(
    packs.map(async (pack) => {
      const status = await pack.status();
      if (status.state === 'active') await observe(pack);
      return {
        pack,
        status,
        name: String(pack.metadata.name ?? ''),
        maxZoom: Number(pack.metadata.maxZoom ?? 14),
        error:
          errors.get(pack.id) ??
          (status.state !== 'complete' &&
          (status.completedResourceSize >= SIZE_LIMIT || status.completedTileCount >= 2900)
            ? 'area-limit'
            : undefined),
      };
    }),
  );
}

/** The 1.3 native plugin installs the concurrency cap and User-Agent. Older builds must not start downloads. */
export function downloadsSupported(): boolean {
  const application = requireOptionalNativeModule<{ nativeApplicationVersion: string }>('ExpoApplication');
  const version = application?.nativeApplicationVersion?.split('.').map(Number);
  return !!version && (version[0] > 1 || (version[0] === 1 && version[1] >= 3));
}

export async function downloadRegion(collectionId: string, name: string, plan: RegionPlan): Promise<void> {
  if (creating || !downloadsSupported()) throw new Error('Map download unavailable');
  creating = true;
  try {
    const active = await OfflineManager.getPacks();
    for (const pack of active) {
      if ((await pack.status()).state === 'active') throw new Error('Another map is downloading');
    }
    const pack = await OfflineManager.createPack(
      {
        mapStyle: MAP_STYLE.light,
        bounds: plan.bounds,
        minZoom: 0,
        maxZoom: plan.maxZoom,
        metadata: { unterwegsCollection: collectionId, name, maxZoom: plan.maxZoom, savedAt: new Date().toISOString() },
      },
      progress,
      onError,
    );
    observed.add(pack.id);
  } finally {
    creating = false;
  }
}

export async function resumeRegion(region: SavedRegion): Promise<void> {
  if (!downloadsSupported()) throw new Error('Map download unavailable');
  // One active download across all collections.
  for (const pack of await OfflineManager.getPacks()) {
    if (pack.id !== region.pack.id && (await pack.status()).state === 'active') await pack.pause();
  }
  await observe(region.pack);
  errors.delete(region.pack.id);
  await region.pack.resume();
}

export async function deleteRegion(id: string): Promise<void> {
  OfflineManager.removeListener(id);
  await OfflineManager.deletePack(id);
  errors.delete(id);
  observed.delete(id);
}

/** Deletes every downloaded map area (sign-out): pack names and areas show where the user travels. */
export async function deleteAllRegions(): Promise<void> {
  for (const pack of await OfflineManager.getPacks()) await deleteRegion(pack.id);
}
