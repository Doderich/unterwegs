import { useEffect, useState } from 'react';

import { savedRegions, type SavedRegion } from './offline';

/** Native database state stays out of the persisted server query cache. */
export function useOfflineMaps(collectionId: string) {
  const [regions, setRegions] = useState<SavedRegion[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    let running = false;
    let last = '';
    const refresh = async () => {
      if (running || !collectionId) return;
      running = true;
      try {
        const next = await savedRegions(collectionId);
        // Polled every 1.5 s for download progress: only re-render the screens using it when something changed.
        const key = signature(next);
        if (mounted && key !== last) {
          last = key;
          setRegions(next);
        }
        if (mounted) setError(false);
      } catch {
        if (mounted) setError(true);
      } finally {
        running = false;
        if (mounted) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1500);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [collectionId]);
  return { regions, error, loading };
}

function signature(regions: SavedRegion[]): string {
  return JSON.stringify(regions.map((r) => [r.name, r.maxZoom, r.error ?? null, r.status]));
}
