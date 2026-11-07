import type { Fields } from './types';

/** Values compared the way the server returns them (missing and null are the same). */
export const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The fields of `input` that differ from `current`, with the values they had: what an edit really changes. */
export function diffFields(current: Fields, input: Fields): { patch: Fields; base: Fields } {
  const patch: Fields = {};
  const base: Fields = {};
  for (const [key, value] of Object.entries(input)) {
    if (same(current[key], value)) continue;
    patch[key] = value;
    base[key] = current[key] ?? null;
  }
  return { patch, base };
}

/**
 * Three-way merge per field: a field goes to the server only when nobody else changed it since the edit began
 * (server value still equals `base`). A field both sides changed keeps the other person's value and is reported.
 */
export function mergeFields(server: Fields, patch: Fields, base: Fields): { send: Fields; kept: string[] } {
  const send: Fields = {};
  const kept: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in base) || same(server[key], base[key])) send[key] = value;
    else if (!same(server[key], value)) kept.push(key);
  }
  return { send, kept };
}

/** Two edits of the same fields as one: the newer values, the older `base` (where the first edit started). */
export const foldFields = (older: { patch: Fields; base: Fields }, newer: { patch: Fields; base: Fields }) => ({
  patch: { ...older.patch, ...newer.patch },
  base: { ...newer.base, ...older.base },
});
