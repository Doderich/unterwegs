import { tr } from '@/i18n';

import { ApiError, AuthError, SchemaError } from './client';
import { TESTED_SERVER_VERSION, UnsupportedServerError } from './compat';

/** Missing endpoint or method: a server version without this feature. */
export function isMissingEndpoint(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 501);
}

export function isUnreadable(e: unknown): boolean {
  return e instanceof SchemaError;
}

/** `ApiError` messages that are only a status line, not the server's own words. */
function isStatusLine(message: string): boolean {
  return /^HTTP \d{3}\b/.test(message);
}

/**
 * The text for a failed request, shared by reads and writes. `write`: a missing endpoint means the server doesn't
 * offer the action (another version), not that the item is gone. Offline is handled by the callers before this.
 */
export function requestErrorText(e: unknown, { write = false } = {}): string {
  const version = TESTED_SERVER_VERSION;
  if (e instanceof AuthError) return tr('common.youreNoLongerSignedIn');
  if (e instanceof UnsupportedServerError) return tr('errors.unsupportedServer', { reason: e.reason, version });
  if (e instanceof SchemaError) return tr('errors.serverAnswerUnreadable', { version });
  if (e instanceof ApiError) {
    if (write && isMissingEndpoint(e)) return tr('errors.notSupportedByServer', { status: e.status, version });
    if (e.status >= 500) return tr('errors.serverProblem', { status: e.status });
    if (!isStatusLine(e.message)) return e.message;
    return tr('errors.serverRefused', { status: e.status });
  }
  return tr('common.cantReachServerPleaseTry');
}

/**
 * For sign-in screens: the text when the server works but isn't one the app can read (unsupported version, odd
 * answer, server error); null for everything the screen explains itself (wrong key, no network).
 */
export function serverCompatText(e: unknown): string | null {
  if (e instanceof UnsupportedServerError || e instanceof SchemaError) return requestErrorText(e);
  if (e instanceof ApiError && e.status >= 500) return requestErrorText(e);
  return null;
}
