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
  highContrast: z.boolean().catch(false),
  reduceMotion: z.boolean().catch(false),
  haptics: z.boolean().catch(true),
  mapApp: z.enum(['system', 'apple', 'google', 'organic', 'osmand']).catch('system'),
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
