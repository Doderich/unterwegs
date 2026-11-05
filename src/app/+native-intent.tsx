/**
 * The browser-sheet login returns via `unterwegs://login?key=…`. `openAuthSessionAsync` reads that
 * URL itself; strip the query so the key never ends up in navigation state.
 * Files shared into the app (share sheet, `expo-sharing`) arrive with the host `expo-sharing`.
 * The in-app sign-in page (`/login/web`) only opens from the login screen, never from an outside link: its
 * parameters choose the page and the server that receives the new key.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (/^(unterwegs(?:-staging)?:\/\/|\/)login\?/.test(path)) return '/login';
  if (/^(unterwegs(?:-staging)?:\/\/\/?|\/)login\/web(\/|\?|#|$)/i.test(path)) return '/login';
  if (/^[a-z][a-z0-9+.-]*:\/\/expo-sharing(\/|\?|$)/i.test(path)) return '/share';
  return path;
}
