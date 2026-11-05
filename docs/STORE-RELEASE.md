# Store release

What has to be done before Unterwegs ships on Google Play and the App Store. Work is ordered by dependency, not by date. How builds are made today: [RELEASING.md](RELEASING.md). Device checks still open: [ROADMAP.md](ROADMAP.md#next).

## Decisions (05.11.2026)

| Topic           | Decision                                                                                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Channels        | Testing goes through TestFlight and a Google Play testing track. Once the store apps are live, they replace GitHub/Obtainium and TestFlight for everyone, the family included. Recorded in [0014](adr/0014-store-distribution.md).                                                                                    |
| Android signing | Play App Signing with a key that Google generates. The existing keystore becomes the **upload key**. An APK signed with the old key can't update the Play app, so each Android phone that has the Obtainium install needs one uninstall and a fresh install from Play; after that it signs in and syncs again online. |
| App id          | Keep the current package / bundle id (`UNTERWEGS_APP_ID`, `UNTERWEGS_IOS_BUNDLE_ID`) and the existing App Store Connect record.                                                                                                                                                                                       |
| Server versions | Stay as backwards compatible as possible. Below the oldest supported AdventureLog version, the app says "unsupported server". On versions newer than the tested one, it shows a notice that some features may not work.                                                                                               |
| Store name      | **Unterwegs - Travel Log** on both stores. Home-screen name stays Unterwegs.                                                                                                                                                                                                                                          |

## 1. Decisions and groundwork

- [x] ADR [0014](adr/0014-store-distribution.md) replaces 0010; PRODUCT.md, RELEASING.md and [0011](adr/0011-pinned-server-version.md) reference it.
- [ ] Make a public build without personal values: no `EXPO_PUBLIC_DEFAULT_SERVER_URL` (or only the public demo server). OTA updates and update-health reporting stay on the self-hosted xprem server for every install (decided 05.11.2026); the privacy policy in `site/` says so. Apple allows JavaScript OTA updates as long as they don't change what the app is for.
- [x] Server versions (policy in [0011](adr/0011-pinned-server-version.md)). AdventureLog exposes no version (no endpoint, not in the OpenAPI schema), so the app checks what it needs instead (`src/api/compat.ts`):
  - Sign-in: after the key works, `checkServer` reads the collection list and one collection; a missing endpoint, an unreadable answer or missing fields (`locations`, `lodging`, `transportations`, `notes`) end in "unsupported server" with the reason. "Oldest supported" means the oldest version that passes.
  - Every response: unknown fields are stripped; lists keep the entries they can read and leave out the rest; whole unreadable answers keep the saved data. Both show a notice on Home and in the trip's status rows ("may be a newer version than v0.13.1", with copyable details).
  - Errors name the cause (server error, feature missing on this server, unreadable answer) instead of "can't reach the server"; a trip that fails to load can be retried in place.
  - A 403 from a single endpoint no longer signs out: the key is checked first, and only a rejected key signs out.
  - A screen that crashes while rendering shows a retry screen and keeps the header (`src/ui/ErrorScreen.tsx`, Expo Router error boundaries).
- [ ] Phone check of the above against a second, newer AdventureLog (a disposable server), including an Android sign-in with the v2 login page.
- [x] Google Play title: **Unterwegs - Travel Log**, the same as iOS.
- [ ] Check that the name is available on both stores and how the listing may refer to AdventureLog (third-party name).
- [x] Plan the Android switch for family phones: [below](#android-switch-for-family-phones).
- [ ] Switch the family phones, then stop publishing GitHub APKs.

### Android switch for family phones

The Play app is signed with Google's key, the Obtainium app with the old one, so Android refuses to update one with the other. Each phone needs one uninstall. Uninstalling deletes the downloads and map areas; the travel data itself is on the server.

Before:

1. The Play app is in a testing track (internal or closed) with every family member's Google account as tester. The closed test that Play requires for new personal accounts (12 testers, 14 days) can be this switch.
2. No trip in the next days. Never switch during a trip.
3. Keep publishing OTA updates on the production channel meanwhile: Obtainium installs and Play installs have the same `version` and channel, so both get them.

On each phone, with Wi-Fi:

1. In Obtainium, remove Unterwegs from the tracked apps (otherwise it offers the GitHub APK again).
2. Uninstall Unterwegs.
3. Open the tester link, join, install Unterwegs from Play.
4. Sign in (QR code from the website or browser sign-in).
5. For each upcoming trip: open the Collection and download it for offline use, including map areas.
6. Check: airplane mode, restart the app, open a ticket PDF.

After the last phone:

1. Publish one last GitHub release whose notes point to Play, then stop `npm run android:publish` for Obtainium (keep the script for an emergency APK).
2. Update [RELEASING.md](RELEASING.md) and the install/help guide.

## 2. Security and privacy audit

The app holds API keys, travel plans, booking numbers, PDFs, photos and locations. An AI-assisted audit of the whole app (05.11.2026, at `5a4cbcb`) covered credentials and input from outside, data at rest and telemetry, and transport, updates, native configuration and dependencies. Repeat it after large changes and before the first store submission.

Fixed in **1.4.1** (native change: Android backup and permissions, so it needs new builds, not an OTA). Covered by `npm run check` (`src/__tests__/securityGuards.test.ts`); not yet checked on a phone.

- [x] High: signing out asks whether to keep downloads. Deleting removes downloaded files, exports, cached images and map areas besides the query cache (`src/offline/wipe.ts`); account deletion always deletes them. A rejected key or an unreadable keychain keeps them, so a trip never loses its offline files that way. Offline files sit in one folder per server host, so kept files only reappear for the same server; files from before 1.4.1 move there on first use.
- [x] High: the API key goes only to the signed-in server over HTTPS (`mediaRequest` in `src/api/client.ts`). `/media` and `/api` URLs on another host (a different `PUBLIC_URL`) load from the signed-in server; anything else loads without the key.
- [x] Medium: outside links can't open `/login/web` (`+native-intent.tsx`). The sign-in WebView loads HTTPS pages only and accepts a key only from the signed-in website.
- [x] Medium: Android backup is off (`android.allowBackup: false`). The iOS key uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; keys saved earlier are re-saved with it on start.
- [x] Medium: sign-in needs `https://`; a QR code shows its server and signs in only after confirmation.
- [x] Self-hosting without a domain: Android also trusts certificate authorities the user installed (`plugins/with-user-certificates.js`, network security config; release builds stay HTTPS-only, debug builds keep cleartext for Metro). iOS trusts them once full trust is on. The login screen links a help screen (`/login/https-help`). Trade-off: any CA the user installed can read the app's traffic; installing one needs a deliberate step and Android then warns permanently.
- [x] Medium: `npm run android:release` / `ios:release` unset `DISABLE_CODE_SIGNING`; `android:publish` requires `UNTERWEGS_UPLOAD_CERT_SHA256` and always checks the signer.
- [x] Medium: `SYSTEM_ALERT_WINDOW` and `READ/WRITE_EXTERNAL_STORAGE` are blocked (`android.blockedPermissions`).
- [x] Low: server link fields open only `http(s)` links (`src/ui/links.ts`).
- [x] Low: exports go to `Paths.cache/exports`, replaced by the next export and deleted on sign-out; leaving the share screen clears received files.

Still open:

- [ ] Phone check of 1.4.1: sign-out wipe (files, maps, images), QR confirmation, sign-in to a server with a self-made CA on Android (API, images, downloads and the WebView fallback) and that debug builds still reach Metro, an existing iOS sign-in surviving the keychain re-save, image picker and camera on Android without the storage permissions.
- [x] Redirects: API calls, sign-in requests and file downloads go through `keyedFetch` (`src/api/http.ts`), which follows redirects itself: credentials only go along on the same origin, and a request body never follows to another host. Downloads read through it instead of `File.downloadFileAsync`. JavaScript only, so it can go out as an OTA update.
- [ ] Redirects for images: `expo-image` still follows redirects with the key. Only matters for a server whose `/media` redirects to another host (for example object storage). Fix: load online images through `downloadToFile` into the image cache instead of passing headers to `expo-image`.
- [ ] Redirects for uploads: the native multipart upload (`src/api/upload.ts`) follows redirects too. Uploads are POSTs to the API, which doesn't redirect them on the pinned server.
- [x] iOS backups include the documents folder (offline files) and the SQLite cache. Accepted: it's the user's own backup, encrypted when they choose, and it keeps a trip's files after a phone restore. The API key is not in it (`THIS_DEVICE_ONLY`).
- [x] The browser-sheet callback uses the unverified `unterwegs://` scheme, so on Android another app could receive it. The key now travels encrypted for that one sign-in (login page v2, `server/README.md`); Android uses the WebView for servers with the v1 page. JavaScript in the app, so it ships as an OTA update; the owner's server needs the new page redeployed.
- [ ] Sessions made before 1.4.1 on an `http://` server keep working, but their images and files no longer get the key.
- [ ] `npm audit --omit=dev`: 10 moderate (`glob`, `minimatch`) in build-time Expo tooling, not reachable on the phone. Re-check after Expo patch releases.

Checked and fine: the key lives only in SecureStore and never in the persisted cache or URLs; no `console.*` in `src/`; errors carry only API paths; telemetry sends only the fixed `app_started` event to the self-hosted server; Markdown renders without HTML; Strava OAuth checks origin, path and `state`; the browser-sheet login checks `state` and strips the key from navigation; iOS ATS and Android release builds block cleartext to non-local hosts; no secrets are tracked in git and publish scripts take them from 1Password.

## 3. Both stores

- [ ] Reviewer access: a reviewer server and account filled with the fictional sample data (`scripts/anonymise-sample.ts`), with sign-in steps in the review notes (Play: "App access").
- [x] Privacy, support and account-deletion pages written in de/en/ja ([`site/`](../site/README.md)); no TODO comments left. Contact details are tokens (`__CONTROLLER_NAME__`, `__CONTROLLER_ADDRESS__`, `__CONTACT_EMAIL__`) that the `pages` workflow fills from repo variables `CONTROLLER_NAME`, `CONTROLLER_ADDRESS`, `CONTACT_EMAIL`. The pages say the developer provides only the client and runs no public AdventureLog server.
- [ ] Set the three repository variables, enable GitHub Pages (source: GitHub Actions) and check the published pages. URLs for the store forms: privacy `https://doderich.github.io/unterwegs/en/privacy.html`, support `.../en/support.html`, account deletion `.../en/delete-account.html` (also `de/`, `ja/`).
- [x] Retention and opt-out for update/crash records: 90 days after an installation was last seen (privacy policy, section 3). Settings → Privacy → "Send crash reports" turns off crash and start reports (`healthReports`, `src/telemetry/health.ts`); the update check itself stays on.
- [ ] Owner: delete xprem installation records not seen for 90 days. xprem has no automatic deletion, so this needs a scheduled job in the infrastructure stack (e.g. a daily SQL delete on the installations table).
- [ ] Target audience 13+ and content rating "Everyone" / 4+ in the store forms, as the privacy policy says.
- [ ] App Privacy (Apple) and Data safety (Play) forms matching the policy.
- [x] Account deletion: in-app deletion exists (`src/app/account/delete.tsx`, required by Apple); accounts without a password (SSO only) need only the username. The web page for Play is `site/*/delete-account.html` (URL above). Still to do: enter it in the Play Data safety form.
- [x] Open-source licences: Settings → Privacy → "Open-source licences", generated by `npm run licenses` from the packages in the JS bundle plus the native libraries in `scripts/licenses.mjs`. Map attribution: MapLibre's info button is on by default and lists the style's sources (OpenFreeMap, OpenMapTiles, OpenStreetMap). Check on a phone that it shows on both maps.
- [ ] Review notes: SSO goes through the user's own server, not a social login, so Sign in with Apple isn't required.
- [x] Support URL: `site/*/support.html` (GitHub Issues, email only for private matters). Open: store descriptions in German, English and Japanese.

## 4. Google Play

- [ ] Developer account with identity verification. Personal accounts created after November 2023 need a closed test with at least 12 testers for 14 days before production access; start this early.
- [ ] Android App Bundle (AAB) build and upload path next to `npm run android:publish`, which only builds APKs today.
- [ ] Current Play target API level and 16 KB page-size support for native libraries (MapLibre, React Native); check the pre-launch report.
- [x] Permissions: `SYSTEM_ALERT_WINDOW` and `READ/WRITE_EXTERNAL_STORAGE` are blocked (1.4.1).
- [ ] Photo access must go through the system photo picker to stay outside Play's photo/video permission policy; check the merged manifest for `READ_MEDIA_IMAGES`.
- [ ] Content rating (IARC), target audience, ads and other declarations.
- [ ] Listing: 512 px icon, 1024×500 feature graphic, phone screenshots (foldable optional).

## 5. App Store

- [ ] EU trader status (Digital Services Act): a trader's address and phone number are shown in the listing; a non-trader can't monetise. Required for EU distribution.
- [ ] Rename the production App Store Connect record to **Unterwegs - Travel Log**; submit a TestFlight build from it for review.
- [ ] Privacy manifest: check that the generated `PrivacyInfo.xcprivacy` covers all SDKs' required-reason APIs (App Store Connect warns on upload).
- [ ] Permission texts in `app.json` exist only in German; add English and Japanese.
- [ ] Age-rating questionnaire, content rights, pricing and availability.
- [ ] 6.9" iPhone screenshots. The app target is iPhone-only; iPad screenshots only if iPad support ([IPAD.md](IPAD.md)) ships.
- [x] Export compliance: `ios.config.usesNonExemptEncryption: false`.

## 6. Quality gates

- [ ] Real-phone pass from [ROADMAP.md → Next](ROADMAP.md#next) step 1 on the store binaries: clean-install cold start, offline restart, PDFs/photos, offline maps, sharing into the app, QR sign-in, large text, VoiceOver/TalkBack.
- [ ] A fresh install by someone outside the family, with no server preset and another AdventureLog setup: onboarding works without explanation.
- [ ] Hide or fix what fails on other servers: Wikipedia photo import (400/500), Overpass timeouts, leaving a shared collection (403).
- [ ] `npm run check` green, including the privacy test.
