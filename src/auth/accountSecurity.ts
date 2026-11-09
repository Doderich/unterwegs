import { z } from 'zod';

import { normalizeServerUrl } from '@/api/client';
import { keyedFetch } from '@/api/http';
import { tr } from '@/i18n';

/*
 * Password, two-factor sign-in and email addresses live in allauth, which doesn't accept the app's API key
 * (docs/SERVER.md → Account). For these the app signs in once more with the account password through allauth's app
 * API (`/auth/app/v1`, the same flow as `passwordLogin`), keeps the session token only in memory while the security
 * screen is open, and ends it when leaving. Verified against django-allauth 0.63.6, the pinned server's version.
 * Accounts without a password (SSO only) can't do this and keep the website.
 */

export class SecurityError extends Error {
  constructor(
    message: string,
    /** The session ended or needs a fresh sign-in (allauth answers 401, e.g. after its 5-minute reauthentication window). */
    readonly expired = false,
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export type SecuritySession = { base: string; token: string };

export type UnlockResult = { status: 'ok'; session: SecuritySession } | { status: 'mfa'; pending: SecuritySession };

const emailSchema = z.object({ email: z.string(), primary: z.boolean().catch(false), verified: z.boolean().catch(false) });
export type EmailAddress = z.infer<typeof emailSchema>;

const authenticatorSchema = z.object({
  type: z.string(),
  unused_code_count: z.number().optional(),
  total_code_count: z.number().optional(),
  unused_codes: z.array(z.string()).optional(),
});

export type TwoFactorState = {
  totp: boolean;
  /** Unused recovery codes, when the account has any. */
  recoveryCodesLeft: number | null;
};

type Body = {
  status?: number;
  data?: unknown;
  meta?: { session_token?: string; secret?: string };
  errors?: { code?: string; message?: string; param?: string }[];
};

/** The first readable allauth error, e.g. "This password is too short." */
function firstError(body: Body | null): string | null {
  const e = body?.errors?.[0];
  return e?.message ?? null;
}

async function call(
  session: SecuritySession,
  method: string,
  path: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<Body> {
  let res: Response;
  try {
    res = await fetchImpl(`${session.base}/auth/app/v1${path}`, {
      method,
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'X-Session-Token': session.token,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new SecurityError(tr('common.cantReachServer'));
  }
  const data = (await res.json().catch(() => null)) as Body | null;
  if (res.status === 401 || res.status === 410) throw new SecurityError(tr('accountSecurity.sessionExpired'), true);
  if (res.status >= 400 && !(res.status === 404 && data?.meta?.secret)) {
    throw new SecurityError(firstError(data) ?? tr('accountSecurity.serverRefused', { status: res.status }));
  }
  return data ?? {};
}

/** Signs in with the account's password; with two-factor sign-in on, a code follows (`confirmUnlock`). */
export async function unlock(
  serverUrl: string,
  username: string,
  password: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<UnlockResult> {
  const base = normalizeServerUrl(serverUrl);
  let res: Response;
  try {
    res = await fetchImpl(`${base}/auth/app/v1/auth/login`, {
      method: 'POST',
      credentials: 'omit',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
  } catch {
    throw new SecurityError(tr('common.cantReachServer'));
  }
  const body = (await res.json().catch(() => null)) as
    | (Body & { data?: { flows?: { id: string; is_pending?: boolean }[] } })
    | null;
  const token = body?.meta?.session_token;
  if (res.status === 200 && token) return { status: 'ok', session: { base, token } };
  if (res.status === 401 && token && body?.data?.flows?.some((f) => f.id === 'mfa_authenticate' && f.is_pending)) {
    return { status: 'mfa', pending: { base, token } };
  }
  if (res.status === 400 && body?.errors?.[0]?.code === 'username_password_mismatch')
    throw new SecurityError(tr('accountSecurity.wrongPassword'));
  throw new SecurityError(firstError(body) ?? tr('serverLogin.signinFailedDoesAccountHave'));
}

export async function confirmUnlock(
  pending: SecuritySession,
  code: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<SecuritySession> {
  try {
    const body = await call(pending, 'POST', '/auth/2fa/authenticate', { code: code.replace(/\s/g, '') }, fetchImpl);
    return { base: pending.base, token: body.meta?.session_token ?? pending.token };
  } catch (e) {
    if (e instanceof SecurityError && !e.expired) throw new SecurityError(tr('serverLogin.wrongOrExpiredCode'));
    throw e;
  }
}

/** Ends the session; best effort, a session left behind expires on the server. */
export async function lock(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch): Promise<void> {
  await fetchImpl(`${session.base}/auth/app/v1/auth/session`, {
    method: 'DELETE',
    credentials: 'omit',
    headers: { 'X-Session-Token': session.token },
  }).catch(() => undefined);
}

export async function changePassword(
  session: SecuritySession,
  currentPassword: string,
  newPassword: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<void> {
  await call(
    session,
    'POST',
    '/account/password/change',
    { current_password: currentPassword, new_password: newPassword },
    fetchImpl,
  );
}

function emails(body: Body): EmailAddress[] {
  const parsed = z.array(emailSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export async function listEmails(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch) {
  return emails(await call(session, 'GET', '/account/email', undefined, fetchImpl));
}

export async function addEmail(session: SecuritySession, email: string, fetchImpl: typeof fetch = keyedFetch) {
  return emails(await call(session, 'POST', '/account/email', { email: email.trim() }, fetchImpl));
}

export async function removeEmail(session: SecuritySession, email: string, fetchImpl: typeof fetch = keyedFetch) {
  return emails(await call(session, 'DELETE', '/account/email', { email }, fetchImpl));
}

export async function makePrimaryEmail(
  session: SecuritySession,
  email: string,
  fetchImpl: typeof fetch = keyedFetch,
) {
  return emails(await call(session, 'PATCH', '/account/email', { email, primary: true }, fetchImpl));
}

/** Sends the verification mail again. */
export async function resendVerification(
  session: SecuritySession,
  email: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<void> {
  await call(session, 'PUT', '/account/email', { email }, fetchImpl);
}

export async function twoFactorState(
  session: SecuritySession,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<TwoFactorState> {
  const body = await call(session, 'GET', '/account/authenticators', undefined, fetchImpl);
  const list = z.array(authenticatorSchema).catch([]).parse(body.data);
  const codes = list.find((a) => a.type === 'recovery_codes');
  return { totp: list.some((a) => a.type === 'totp'), recoveryCodesLeft: codes?.unused_code_count ?? null };
}

/**
 * A new authenticator secret. The server keeps it in the session until `activateTotp` confirms a code from the
 * authenticator app, so both must use the same session.
 */
export async function startTotp(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch): Promise<string> {
  const body = await call(session, 'GET', '/account/authenticators/totp', undefined, fetchImpl);
  if (!body.meta?.secret) throw new SecurityError(tr('accountSecurity.alreadyOn'));
  return body.meta.secret;
}

export async function activateTotp(
  session: SecuritySession,
  code: string,
  fetchImpl: typeof fetch = keyedFetch,
): Promise<void> {
  await call(session, 'POST', '/account/authenticators/totp', { code: code.replace(/\s/g, '') }, fetchImpl);
}

export async function deactivateTotp(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch): Promise<void> {
  await call(session, 'DELETE', '/account/authenticators/totp', undefined, fetchImpl);
}

function codes(body: Body): string[] {
  return authenticatorSchema.safeParse(body.data).data?.unused_codes ?? [];
}

export async function recoveryCodes(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch) {
  return codes(await call(session, 'GET', '/account/authenticators/recovery-codes', undefined, fetchImpl));
}

/** Replaces all recovery codes; the old ones stop working. */
export async function newRecoveryCodes(session: SecuritySession, fetchImpl: typeof fetch = keyedFetch) {
  return codes(await call(session, 'POST', '/account/authenticators/recovery-codes', {}, fetchImpl));
}

/** The `otpauth://` link authenticator apps (and iOS Passwords) open to add the account. */
export function totpLink(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
}
