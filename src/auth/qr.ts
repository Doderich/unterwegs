import type { Credentials } from '@/api/client';

/**
 * Parses the QR code shown on the AdventureLog website (Settings → Mobile App, `POST /auth/mobile-qr/`):
 * `{"version":1,"server_url":"https://…","api_key":"al_…","code_words":[…]}`.
 */
export function parseLoginQr(data: string): Credentials | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return null;
  // HTTPS only: the key would otherwise travel in plain text.
  if (typeof v.server_url !== 'string' || !/^https:\/\/[^/?#\s]+/i.test(v.server_url)) return null;
  if (typeof v.api_key !== 'string' || !v.api_key.startsWith('al_')) return null;
  return { serverUrl: v.server_url, apiKey: v.api_key };
}

/** The host a sign-in code points to, shown for confirmation: `https://adventurelog.example.org` → `adventurelog.example.org`. */
export function qrHost(creds: Credentials): string {
  return creds.serverUrl.replace(/^https:\/\//i, '').split(/[/?#]/)[0];
}
