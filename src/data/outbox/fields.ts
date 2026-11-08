import type { Fields } from './types';

const sameList = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((item, i) => item === b[i]);

const numeric = (value: unknown): value is number | string =>
  typeof value === 'number' || (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)));

/**
 * Values compared the way a form and the server can disagree without a real change: missing and null are the same,
 * so are an empty list and none, and so are "120.00" and 120. A boolean is never a number. Objects match by content.
 */
export const same = (a: unknown, b: unknown) => {
  const left = a ?? null;
  const right = b ?? null;
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right))
    return sameList(Array.isArray(left) ? left : [], Array.isArray(right) ? right : []);
  if (typeof left === 'boolean' || typeof right === 'boolean') return false;
  if (numeric(left) && numeric(right)) return Number(left) === Number(right);
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object')
    return JSON.stringify(left) === JSON.stringify(right);
  return false;
};

/** Fields of `next` that differ from `original`. One comparison for a Pending edit and for an online partial. */
export function changedFields<T extends Record<string, unknown>>(
  original: Record<string, unknown>,
  next: T,
): Partial<T> {
  return diffFields(original, next).patch as Partial<T>;
}

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
 * What an edit changes: the fields of `input` that differ from what the user saw (`shown`: the server's version with
 * the waiting edits laid over it), each with the server's last-read value as its `base` for the field rule at send
 * time. Comparing with what was shown, not with the server, keeps an edit that undoes a waiting one (A → B offline,
 * then back to A): it must still be queued, or the waiting B would be sent.
 */
export function editOf(shown: Fields, server: Fields, input: Fields): { patch: Fields; base: Fields } {
  const { patch } = diffFields(shown, input);
  const base: Fields = {};
  for (const key of Object.keys(patch)) base[key] = server[key] ?? null;
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
