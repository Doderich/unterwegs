# Server-side login page

`unterwegs-login.html` lets the app sign in through the **system browser sheet** (passkeys and password autofill work there) instead of the WebView. Each AdventureLog server that wants this serves the file **same-origin** at `/unterwegs/login.html`; the app checks for the marker `unterwegs-login-v2` (iOS also accepts `-v1`) and otherwise falls back to the WebView.

Flow:

1. App: makes a fresh AES-256 key for this sign-in, then `openAuthSessionAsync(<provider url>?next=/unterwegs/login.html?state=<random>&name=<device>&seal=<key, base64url>, 'unterwegs://login')`.
2. allauth (`SOCIALACCOUNT_LOGIN_ON_GET`) → identity provider → back to `next` (a same-host path passes allauth's `is_safe_url`).
3. The page: `GET /auth/user-metadata` → `POST /auth/api-keys` (the SvelteKit proxy adds CSRF) → `DELETE /auth/browser/v1/auth/session` → `unterwegs://login?sealed=…&state=…`: the API key encrypted with AES-GCM (`iv | ciphertext | tag`, base64url, the state as additional data). Without `seal` (older app updates) it returns `key=…` as before. Errors: `error=signed-out|no-key|network`.
4. App: checks `state`, decrypts the key, verifies it against `/auth/user-metadata`, and keeps only the server URL/key in secure storage.

The page signs out its temporary website session before returning. This flow does not retain an allauth session for later email/MFA requests; API-key-capable account and integration endpoints continue to authenticate the same user. The pinned endpoint comparison is recorded in [SERVER.md](../docs/SERVER.md#auth-endpoints).

The callback is a custom-scheme URL. On iOS only the calling app receives it (ASWebAuthenticationSession). On Android another app can register `unterwegs://` and catch it, which is why the key travels encrypted: only the app instance that started the sign-in has the AES key. `state` stops forged callbacks. An Android app never accepts a plain key from the callback, so it uses the WebView on servers that still serve the v1 page. The `seal` passes through the identity provider and the server inside `next`, both of which can already see the key anyway.

The owner's server serves it from an nginx container behind the same reverse proxy as AdventureLog; the deployment lives in the owner's infrastructure repo, not here. After editing the page, redeploy it there.
