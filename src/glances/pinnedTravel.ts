import { Storage } from 'expo-sqlite/kv-store';

/*
 * The transportation the user put on the Lock Screen with "Show on Lock Screen" (iOS). It wins over the automatic
 * choice until it has arrived; then `travelActivity` drops it by itself. Device-local, like the settings.
 */

const KEY = 'unterwegs.glances.pinned-travel';

export function pinnedTravel(): string | null {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

export function pinTravel(transportationId: string | null) {
  try {
    if (transportationId) Storage.setItemSync(KEY, transportationId);
    else Storage.removeItemSync(KEY);
  } catch {
    // Storage unavailable: the automatic choice still works.
  }
  refreshListeners.forEach((l) => l());
}

const refreshListeners = new Set<() => void>();

/** `useGlances` recomputes when a screen pins or unpins a transportation. */
export function onGlancesRefresh(listener: () => void): () => void {
  refreshListeners.add(listener);
  return () => refreshListeners.delete(listener);
}
