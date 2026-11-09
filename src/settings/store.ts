import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

const KEY = 'unterwegs.settings.v1';

export const settingsSchema = z.object({
  /** `system`: German if the phone is German, else English. */
  language: z.enum(['system', 'de', 'en', 'ja']).catch('system'),
  theme: z.enum(['system', 'light', 'dark']).catch('system'),
  /** `system` follows the phone's text size; the others override it for this app. */
  textSize: z.enum(['system', 'small', 'default', 'large', 'xlarge', 'xxlarge']).catch('system'),
  boldText: z.boolean().catch(false),
  showTabLabels: z.boolean().catch(true),
  /** Home shortcuts; utilities remain accessible through Settings and collections when hidden. */
  showTravelUtilities: z.boolean().catch(true),
  highContrast: z.boolean().catch(false),
  reduceMotion: z.boolean().catch(false),
  haptics: z.boolean().catch(true),
  /** Crash and start reports to the update server (`src/telemetry/health.ts`); update checks stay on. */
  healthReports: z.boolean().catch(true),
  mapApp: z.enum(['system', 'apple', 'google', 'organic', 'osmand']).catch('system'),
  /** Local reminders (docs/GLANCES.md). Off until the user turns them on, which asks for the permission. */
  reminders: z.boolean().catch(false),
  /** Which reminders, once `reminders` is on. */
  reminderKinds: z
    .object({
      collectionStart: z.boolean().catch(true),
      offlineReadiness: z.boolean().catch(true),
      departure: z.boolean().catch(true),
      checkIn: z.boolean().catch(true),
      checkOut: z.boolean().catch(false),
      visit: z.boolean().catch(false),
      endOfDay: z.boolean().catch(false),
    })
    .catch(() => ({
      collectionStart: true,
      offlineReadiness: true,
      departure: true,
      checkIn: true,
      checkOut: false,
      visit: false,
      endOfDay: false,
    })),
  /** iOS: the travel-day Live Activity on the Lock Screen and in the Dynamic Island. */
  travelActivity: z.boolean().catch(true),
});

export type Settings = z.infer<typeof settingsSchema>;
export type TextSize = Settings['textSize'];
export type MapApp = Settings['mapApp'];

function load(): Settings {
  try {
    const raw = Storage.getItemSync(KEY);
    return settingsSchema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return settingsSchema.parse({});
  }
}

let current: Settings = load();
const listeners = new Set<(s: Settings) => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  Storage.setItemSync(KEY, JSON.stringify(current));
  listeners.forEach((l) => l(current));
}

/** Called on every change (and not initially). */
export function subscribeSettings(listener: (s: Settings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}
