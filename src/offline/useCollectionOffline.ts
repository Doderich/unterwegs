import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Collection } from '@/api/schemas';
import { useCredentials } from '@/auth/session';
import { collectionMediaUrls } from '@/data/selectors';
import { collectionPhase, todayIn } from '@/time/today';
import { daysBetween, deviceTimeZone } from '@/time/tz';

import { cachedCount, prefetchAll, type PrefetchProgress } from './fileCache';

/** Auto-download media for collections that are running or start within this many days. */
const AUTO_SYNC_DAYS_BEFORE = 45;

export type CollectionOfflineState = {
  total: number;
  cached: number;
  running: boolean;
  progress: PrefetchProgress | null;
  sync: () => Promise<void>;
};

function shouldAutoSync(collection: Collection | undefined): boolean {
  if (!collection?.start_date || !collection.end_date) return false;
  const today = todayIn(deviceTimeZone());
  const phase = collectionPhase(collection.start_date, collection.end_date, today);
  return (
    phase === 'current' || (phase === 'upcoming' && daysBetween(today, collection.start_date) <= AUTO_SYNC_DAYS_BEFORE)
  );
}

/**
 * Keeps all images + attachments of a collection on the device. Runs automatically for the current/next collection
 * when online; can be triggered manually.
 */
export function useCollectionOffline(collection: Collection | undefined): CollectionOfflineState {
  const urls = useMemo(() => {
    if (!collection) return [];
    const media = collectionMediaUrls(collection);
    return [...media.attachments, ...media.images];
  }, [collection]);
  return useMediaOffline(urls, shouldAutoSync(collection));
}

/** The same persistent file cache for a standalone location opened on this device. */
export function useMediaOffline(urls: string[], auto: boolean): CollectionOfflineState {
  const credentials = useCredentials();
  const network = useNetworkState();
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [running, setRunning] = useState(false);
  // Bumped after each sync so the on-disk count is re-read.
  const [diskVersion, setDiskVersion] = useState(0);
  const cached = useMemo(() => (diskVersion >= 0 ? cachedCount(urls) : 0), [urls, diskVersion]);
  const runningRef = useRef(false);

  const sync = useCallback(async () => {
    if (!credentials || runningRef.current || urls.length === 0) return;
    runningRef.current = true;
    setRunning(true);
    try {
      setProgress(await prefetchAll(urls, credentials, setProgress));
    } finally {
      runningRef.current = false;
      setRunning(false);
      setDiskVersion((v) => v + 1);
    }
  }, [credentials, urls]);

  const online = network.isInternetReachable !== false && network.isConnected !== false;

  // Once per screen visit (and again after coming back online), never in a loop on failing files.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!online) {
      autoRan.current = false;
      return;
    }
    if (auto && !autoRan.current && cachedCount(urls) < urls.length) {
      autoRan.current = true;
      void sync();
    }
  }, [online, auto, urls, sync]);

  return { total: urls.length, cached, running, progress, sync };
}
