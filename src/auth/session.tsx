import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AuthError, createClient, type ApiClient, type Credentials } from '@/api/client';
import { checkServer, clearCompatIssues } from '@/api/compat';
import { isMissingEndpoint, isUnreadable } from '@/api/errors';

import { clearCredentials, loadCredentials, saveCredentials } from './keyStore';

type Session =
  | { status: 'loading'; client: null }
  /** `wipe`: the user chose to delete downloaded files and maps too (see `wipeLocalData`). */
  | { status: 'signedOut'; client: null; wipe: boolean }
  | { status: 'signedIn'; client: ApiClient; credentials: Credentials };

type SessionContextValue = {
  session: Session;
  signIn: (creds: Credentials) => Promise<void>;
  /**
   * `revoke`: also delete the key on the server (best effort, ignored when offline). `wipe`: also delete downloaded
   * files and map areas. Without it they stay, so signing in to the same server again needs no new download; a
   * rejected key or an unreadable keychain never deletes them.
   */
  signOut: (options?: { revoke?: boolean; wipe?: boolean }) => Promise<void>;
  /**
   * A request was refused as unauthenticated. Signs out only if the key itself is rejected: a newer or differently
   * configured server may refuse a single endpoint (403) while the key still works, and signing out would throw
   * away the offline cache. Offline or unsure: stays signed in.
   */
  onAuthError: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<Credentials | null | undefined>(undefined);
  const [wipe, setWipe] = useState(false);

  useEffect(() => {
    loadCredentials()
      .then(setCredentials)
      .catch(() => setCredentials(null));
  }, []);

  const signIn = useCallback(async (creds: Credentials) => {
    // Verify before storing so a typo doesn't leave the app half signed in.
    const client = createClient(creds);
    await client.getUser();
    // And that this server answers in a shape the app can read (UnsupportedServerError otherwise).
    await checkServer(client, isMissingEndpoint, isUnreadable);
    clearCompatIssues();
    await saveCredentials(creds);
    setWipe(false);
    setCredentials(await loadCredentials());
  }, []);

  const signOut = useCallback(async (options?: { revoke?: boolean; wipe?: boolean }) => {
    const current = await loadCredentials();
    if (options?.revoke && current) {
      await createClient(current)
        .revokeOwnKey()
        .catch(() => false);
    }
    await clearCredentials();
    clearCompatIssues();
    setWipe(!!options?.wipe);
    setCredentials(null);
  }, []);

  const checking = useRef(false);
  const onAuthError = useCallback(() => {
    if (checking.current) return;
    checking.current = true;
    void (async () => {
      try {
        const current = await loadCredentials();
        if (current) await createClient(current).getUser();
      } catch (e) {
        if (e instanceof AuthError) await signOut();
      } finally {
        checking.current = false;
      }
    })();
  }, [signOut]);

  const session = useMemo<Session>(() => {
    if (credentials === undefined) return { status: 'loading', client: null };
    if (credentials === null) return { status: 'signedOut', client: null, wipe };
    return { status: 'signedIn', client: createClient(credentials), credentials };
  }, [credentials, wipe]);

  const value = useMemo(() => ({ session, signIn, signOut, onAuthError }), [session, signIn, signOut, onAuthError]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** For screens behind the auth guard. */
export function useClient(): ApiClient {
  const { session } = useSession();
  if (session.status !== 'signedIn') throw new Error('useClient while signed out');
  return session.client;
}

export function useCredentials(): Credentials | null {
  const { session } = useSession();
  return session.status === 'signedIn' ? session.credentials : null;
}
