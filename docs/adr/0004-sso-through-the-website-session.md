# SSO signs in through the website, then makes the key there

AdventureLog's app client (headless allauth) has no social providers, and allauth won't redirect to a custom app scheme, so the app can't receive an SSO login directly. Instead the user signs in on the website (provider URL with `next` pointing at a small page the owner's server serves, `server/unterwegs-login.html`) in the system browser sheet, and that page creates the API key in the logged-in web session and returns it via `unterwegs://login`. Without that page the app falls back to an incognito WebView whose injected script creates the key. The browser sheet is preferred because passkeys work there; the cleaner allauth token login needs a newer AdventureLog (GitHub issue #1).

The retained credential is the API key, not the browser session. It authenticates the same user on DRF endpoints, including account and integration management. The pinned allauth email/MFA endpoints have a separate session/token flow and do not accept that key; endpoint-specific evidence lives in `docs/SERVER.md`.

## Store users (05.11.2026)

Other people's servers won't host the sign-in page, so for them SSO runs in the WebView, where passkeys don't work. Options considered (GitHub issue #1):

1. **Token login on a newer allauth** (≥ 65.21, `verify_token` for `openid_connect`): PKCE against the identity provider in the app, then `POST /auth/app/v1/auth/provider/token` and `createKeyFromSession`. Needs AdventureLog upstream to make a large allauth jump (still 0.63.6 on `development`) and a public PKCE client with the `unterwegs://` redirect at the identity provider.
2. **A native-app hand-off built into AdventureLog**: `server/unterwegs-login.html` (v2, sealed key) as part of the AdventureLog frontend, offered upstream as a pull request. Works with every provider allauth supports, on every server that updates.
3. **App-only workarounds**: point to the QR route (another device's browser can use passkeys) on the sign-in screen when the server has no sign-in page, and in the WebView as soon as a page asks for a passkey (`navigator.credentials` with `publicKey`).

Chosen: 3 now, since it ships as an update and needs no server; 2 as the lasting fix, offered upstream; 1 only if upstream upgrades allauth anyway.
