export const INTEGRATION_KINDS = ['immich', 'wanderer', 'endurain'] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];
export function isIntegrationKind(value: string): value is IntegrationKind {
  return INTEGRATION_KINDS.some((kind) => kind === value);
}

export function integrationServerUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** The pinned server's OAuth endpoint returns to its own callback. Never expose the app key to the provider. */
export function stravaAuthorizationUrl(raw: string, server: string, state: string): string {
  const url = new URL(raw);
  const callback = new URL(url.searchParams.get('redirect_uri') ?? '');
  const base = new URL(server);
  if (
    url.origin !== 'https://www.strava.com' ||
    url.pathname !== '/oauth/authorize' ||
    callback.origin !== base.origin ||
    callback.pathname.replace(/\/+$/, '') !== '/api/integrations/strava/callback'
  )
    throw new Error('Unexpected OAuth endpoint');
  url.searchParams.set('state', state);
  return url.toString();
}

export function stravaCallback(raw: string, server: string, state: string): { code: string } | { error: true } | null {
  try {
    const url = new URL(raw);
    if (
      url.origin !== new URL(server).origin ||
      url.pathname.replace(/\/+$/, '') !== '/api/integrations/strava/callback'
    )
      return null;
    const code = url.searchParams.get('code');
    return url.searchParams.get('state') === state && code && !url.searchParams.has('error')
      ? { code }
      : { error: true };
  } catch {
    return null;
  }
}
