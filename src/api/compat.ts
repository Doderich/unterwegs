import { z } from 'zod';

/**
 * Server compatibility (docs/adr/0011-pinned-server-version.md). AdventureLog exposes no version, so the app
 * tests what it needs: at sign-in (`checkServer`) and on every response, where a list keeps the entries it can read
 * instead of failing as a whole. What doesn't fit is recorded here and shown as a notice, never as a crash.
 */

/** The AdventureLog version the app is tested against (the owner's pinned server). */
export const TESTED_SERVER_VERSION = 'v0.13.1';

export type CompatIssue = {
  /** API path with ids replaced (`/api/collections/{id}`), or the list that dropped entries (`locations`). */
  where: string;
  /** `unreadable`: a whole response didn't fit; `skipped`: single entries of a list were left out. */
  kind: 'unreadable' | 'skipped';
  /** Entries left out (skipped) or failed responses (unreadable) since the app started. */
  count: number;
  /** First schema problem, for bug reports: `locations.3.name: expected string`. */
  detail: string;
  at: number;
};

let issues: CompatIssue[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** `/api/collections/0b5c…/x?page=2` → `/api/collections/{id}/x` */
export function issuePath(path: string): string {
  return path
    .split('?')[0]
    .split('/')
    .map((part) => (/^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part) ? '{id}' : part))
    .join('/');
}

function describe(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return '';
  const path = issue.path.map(String).join('.');
  return (path ? `${path}: ` : '') + issue.message;
}

export function reportIssue(where: string, kind: CompatIssue['kind'], detail: string, count = 1): void {
  const at = Date.now();
  const same = (i: CompatIssue) => i.where === where && i.kind === kind;
  issues = issues.some(same)
    ? issues.map((i) => (same(i) ? { ...i, count: i.count + count, at } : i))
    : [...issues, { where, kind, count, detail, at }];
  notify();
}

export function reportSchemaError(path: string, schemaIssues: z.core.$ZodIssue[]): void {
  reportIssue(issuePath(path), 'unreadable', describe(schemaIssues[0]));
}

export function compatIssues(): CompatIssue[] {
  return issues;
}

export function subscribeCompatIssues(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** After sign-out or a server change: the next server starts clean. */
export function clearCompatIssues(): void {
  issues = [];
  notify();
}

/** Plain text for "copy details" in bug reports; no ids, keys or user data. */
export function compatReport(): string {
  return [
    `Unterwegs, tested with AdventureLog ${TESTED_SERVER_VERSION}`,
    ...issues.map((i) => `${i.kind} ${i.where} ×${i.count}${i.detail ? ` (${i.detail})` : ''}`),
  ].join('\n');
}

/**
 * An array that keeps the entries it can read and leaves out the rest (reported as `skipped` under `where`), so one
 * odd location on a newer server doesn't make the whole trip unreadable. Anything that isn't an array fails as usual.
 */
export function lenientArray<T extends z.ZodType>(item: T, where: string) {
  return z.array(z.unknown()).transform((entries) => {
    const kept: z.output<T>[] = [];
    let first: z.core.$ZodIssue | undefined;
    for (const entry of entries) {
      const parsed = item.safeParse(entry);
      if (parsed.success) kept.push(parsed.data);
      else first ??= parsed.error.issues[0];
    }
    if (kept.length < entries.length) reportIssue(where, 'skipped', describe(first), entries.length - kept.length);
    return kept;
  });
}

export class UnsupportedServerError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'UnsupportedServerError';
  }
}

/** Fields of `GET /api/collections/{id}` the app can't work without; older versions named them differently. */
const REQUIRED_COLLECTION_FIELDS = ['locations', 'lodging', 'transportations', 'notes'];

export type ServerProbe = {
  listCollections: () => Promise<{ id: string }[]>;
  collectionFields: (id: string) => Promise<string[]>;
};

/**
 * At sign-in, after the key worked: can the app read this server? Throws `UnsupportedServerError` when an endpoint
 * the app is built on is missing or answers in another shape; network errors pass through unchanged.
 */
export async function checkServer(
  probe: ServerProbe,
  isMissing: (e: unknown) => boolean,
  isUnreadable: (e: unknown) => boolean,
): Promise<void> {
  let collections: { id: string }[];
  try {
    collections = await probe.listCollections();
  } catch (e) {
    if (isMissing(e) || isUnreadable(e)) throw new UnsupportedServerError('/api/collections');
    throw e;
  }
  const first = collections[0];
  // A new account has nothing to compare; the response check covers it later.
  if (!first) return;
  let fields: string[];
  try {
    fields = await probe.collectionFields(first.id);
  } catch (e) {
    if (isMissing(e) || isUnreadable(e)) throw new UnsupportedServerError('/api/collections/{id}');
    throw e;
  }
  const missing = REQUIRED_COLLECTION_FIELDS.filter((f) => !fields.includes(f));
  if (missing.length) throw new UnsupportedServerError(`/api/collections/{id}: ${missing.join(', ')}`);
}
