import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { belongsToGroup, DEFAULT_PAIRS, type Unit, type UnitGroup } from './units';
import { isTimeZone } from './timeZones';

const PREFS_KEY = 'unterwegs.travel-tools.v1';
const ESSENTIALS_KEY = 'unterwegs.travel-essentials.v1';
const pair = z.object({ from: z.string(), to: z.string() });
const preferencesSchema = z.object({
  unitGroup: z.enum(['temperature', 'distance', 'weight', 'volume']).default('temperature'),
  unitPairs: z
    .object({ temperature: pair, distance: pair, weight: pair, volume: pair })
    .default(DEFAULT_PAIRS)
    .refine((pairs) =>
      Object.entries(pairs).every(
        ([group, p]) => belongsToGroup(group as UnitGroup, p.from) && belongsToGroup(group as UnitGroup, p.to),
      ),
    ),
  homeZone: z.string().refine(isTimeZone).optional(),
  awayZone: z.string().refine(isTimeZone).default('Asia/Tokyo'),
});
export const essentialsSchema = z.object({
  contacts: z.string().max(5000).default(''),
  insurance: z.string().max(5000).default(''),
  phrases: z.string().max(5000).default(''),
});
export type Essentials = z.infer<typeof essentialsSchema>;
function load<T>(key: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(Storage.getItemSync(key) ?? '{}'));
  } catch {
    return schema.parse({});
  }
}
let preferences = load(PREFS_KEY, preferencesSchema);
let essentials = load(ESSENTIALS_KEY, essentialsSchema);
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const emit = () => listeners.forEach((listener) => listener());
export function updateTravelPreferences(patch: Partial<z.infer<typeof preferencesSchema>>) {
  const next = preferencesSchema.parse({ ...preferences, ...patch });
  Storage.setItemSync(PREFS_KEY, JSON.stringify(next));
  preferences = next;
  emit();
}
export function saveUnitPair(group: UnitGroup, from: Unit, to: Unit) {
  updateTravelPreferences({ unitGroup: group, unitPairs: { ...preferences.unitPairs, [group]: { from, to } } });
}
export function saveEssentials(input: Essentials) {
  const next = essentialsSchema.parse(input);
  Storage.setItemSync(ESSENTIALS_KEY, JSON.stringify(next));
  essentials = next;
  emit();
}
export function clearEssentials() {
  saveEssentials(essentialsSchema.parse({}));
}
export function useTravelPreferences() {
  return useSyncExternalStore(subscribe, () => preferences);
}
export function useEssentials() {
  return useSyncExternalStore(subscribe, () => essentials);
}
