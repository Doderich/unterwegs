# Builds and updates

## Android 1.3.0 startup crash

The published **1.3.0-29896545** APK crashes during `MainApplication.onCreate`, including on a clean Android 16 emulator install (04.11.2026). `with-map-downloads` sets MapLibre's HTTP client before initializing MapLibre; the HTTP implementation's static User-Agent reads the missing application context and throws `ExceptionInInitializerError`. This happens before JavaScript or the OTA loader can recover it. An OTA rollback cannot fix this native startup failure; install a corrected APK over the existing app with the same signing key to preserve login and offline data. Do not uninstall or clear app storage on an affected phone.

The **1.3.1** source initializes `MapLibre.getInstance(this)` before configuring its HTTP client. The plugin also repairs previously generated Android projects on prebuild. The runtime version is bumped because this is a native change. The replacement APK is published below; corrected-APK launch verification remains pending.

Verification: the published APK reproduced the same native exception on two clean-install launches; the new startup-order regression test failed before the fix. All 27 suites / 220 tests, typecheck and lint pass after the fix (one existing lint warning). Android prebuild and `assembleRelease` succeeded; this local test APK uses the debug key and must not be distributed as the replacement release. Corrected-APK launch verification is pending: the device automation transport timed out again after its prescribed diagnostic retry. Do not treat successful compilation as a passed device smoke test.

Version **1.3.0** has been built and published/uploaded as recorded below. It includes native changes: `expo-application` supplies the native build-version check and `with-map-downloads` configures MapLibre's native request concurrency and User-Agent. An OTA update to a 1.2.0 build cannot enable offline-map downloads. The app keeps download controls disabled on older native builds.

How the app gets onto phones: dev builds for development, release builds for testing and installing, over-the-air updates for JavaScript changes. Remaining device and distribution checks: [ROADMAP.md → Next](ROADMAP.md#next). GitHub/Obtainium stays the Android channel until the store apps are live ([0014](adr/0014-store-distribution.md), [STORE-RELEASE.md](STORE-RELEASE.md)).

## Android replacement

Built locally on **04.11.2026** at `b087a1c` (application fix `7a11939`) with `npm run android:publish -- --no-publish`: **1.3.1-29896581**, `build/android/unterwegs-1.3.1-29896581.apk` (178,268,200 bytes). The release script verified the upload certificate; a separate comparison against the published 1.3.0 APK also matched. The higher versionCode permits an in-place upgrade that preserves app data. SHA-256: `6964e914e5bdd10c99d7e157fc1271a4dd6fd6d4414e6ae82aabf8f744e62c82`.

The signed APK, checksum and matching R8/JavaScript maps are retained under `build/android/`. The existing signed APK was published as the latest GitHub release on **04.11.2026**, after pushing its commits and rechecking its checksum and certificate; Obtainium can offer it as an update. Corrected-APK launch verification remains pending. This is an Android replacement only; no new iOS archive was built.

## Release in progress: 1.6.1

The permission-localization changes after the first 1.6.0 archive add native iOS resources (`assets/locales/` and Expo config). Release them with runtime **1.6.1** and new Android/iOS binaries, as required by the native-change rule. Earlier 1.6.0 builds do not receive 1.6.1 OTA updates. This release also includes the merged travel utilities, native account screens and everyday-screen simplification. Public builds have no server preset.

## Current release

Release record, **09.11.2026** (runtime **1.6.0**), iOS only:

| Platform | Version / build          | Result                                                                                                                                                                                                                                                                          |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | **1.6.0 (202611090754)** | Archive and App Store Connect upload succeeded. Processing and TestFlight tester availability are not independently confirmed. No preset. Apple again reported non-blocking missing vendor-framework dSYM warnings. Archive: `build/testflight/production-1.6.0-202611090754/`. |
| Android  | none yet                 | Android stays on 1.5.1 until a 1.6.0 APK is published.                                                                                                                                                                                                                          |

Built from `a504931` on `feat/ipad-layout` (not yet merged to `main`). This is a native release: `ios.supportsTablet` makes the app run on iPad (and on Apple silicon Macs as "Designed for iPad"), so 1.5.1 builds do not receive this JavaScript over the air. It adds the iPad layout (collection tabs in the header, search beside the toolbar), the day map, photo cards in every list (two columns on iPad), the multi-photo hero and the grouped collection search with library places. Preflight: typecheck, **69 suites / 509 tests** (2 skipped), lint (one existing warning). Checked on iPad and iPhone simulators and the Android emulator; the release binary has not had a separate installed-device pass.

### 1.5.1 release

Release record, **08.11.2026** (runtime **1.5.1**):

| Platform | Version / build          | Result                                                                                                                                                                                                                                                                          |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | **1.5.1-29902273**       | Latest GitHub release, available through Obtainium. ARM64 APK **33,231,686 bytes**, universal APK **78,471,260 bytes**. Published SHA-256 digests match the local APKs (`e0976698…` and `6b7dfc9b…`); both certificates match the upload key. No server preset (`--public`).    |
| iOS      | **1.5.1 (202611081059)** | Archive and App Store Connect upload succeeded. Processing and TestFlight tester availability are not independently confirmed. No preset. Apple again reported non-blocking missing vendor-framework dSYM warnings. Archive: `build/testflight/production-1.5.1-202611081059/`. |

The app JavaScript is `ddabbdd` (merge of PR #14). The iOS archive was uploaded from `a138377`; the only later commit types a unit test and is not in the binary. This is a native release: the share extension accepts a link (`text/plain` and a web URL), so 1.5.0 builds do not receive that, or this JavaScript, over the air. A new place can be filled from a shared post or from an account, page or channel when the page publishes Open Graph. Preflight: typecheck, **65 suites / 492 tests** (2 skipped), lint (one existing warning). Link fill was checked on the iOS simulator; the share sheet lists Unterwegs, and opening the app from that sheet was not confirmed. The release binaries have not had a separate installed-device pass. Checksums and matching R8/JavaScript maps are retained under `build/android/`.

Over-the-air update on **08.11.2026**, 11:21 UTC: `ddabbdd` published for both platforms to branch `production` with `--public` (ios `17941369065421`, android `17941369065422`, group `9166bc2a-58ef-4aea-9137-22d1d31c99cc`). It reaches 1.5.1 builds on the next start after download. The published bundles contain no server preset.

Over-the-air update on **08.11.2026**, 13:14 UTC: `c165d17` (merge of PR #16) published for both platforms to branch `production` with `--public` (ios `17941437105331`, android `17941437105222`, group `774e077b-8ddf-487c-9b5d-a122290e2856`). The Next widget's cover stays full color on a clear or tinted Home Screen. It reaches 1.5.1 builds on the next start after download; opening the app writes the new widget layout. The published bundles contain no server preset.

### 1.5.0 release

Release record, **08.11.2026** (runtime **1.5.0**):

| Platform | Version / build          | Result                                                                                                                                                                                                                                                                          |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | **1.5.0-29902077**       | GitHub release, available through Obtainium. ARM64 APK **33,207,842 bytes**, universal APK **78,447,416 bytes**. Published SHA-256 digests match the local APKs (`4eb51eea…` and `fba27f20…`); both certificates match the upload key. No server preset (`--public`).           |
| iOS      | **1.5.0 (202611080757)** | Archive and App Store Connect upload succeeded. Processing and TestFlight tester availability are not independently confirmed. No preset. Apple again reported non-blocking missing vendor-framework dSYM warnings. Archive: `build/testflight/production-1.5.0-202611080757/`. |

Both builds are `035f3f4` (merge of PR #12). This is a native release, so 1.4.1 builds do not receive it over the air. It adds widgets, reminders and the travel-day Live Activity, offline edits through the outbox, the design pass, and the shared object forms, day plan, map chrome and transportation titles. Preflight: typecheck, **64 suites / 484 tests**, lint (one existing warning). The JavaScript was checked on the iOS simulator inside the test collection; the release binaries have not had a separate installed-device pass. Checksums and matching R8/JavaScript maps are retained under `build/android/`.

Over-the-air update on **08.11.2026**, 08:07 UTC: `035f3f4` published for both platforms to branch `production` with `--public` (ios `17941252622541`, android `17941252622542`, group `e545ac09-6bc9-4ab1-b656-a1fb58d8b3d7`). It reaches 1.5.0 builds on the next start after download. The published bundles contain no server preset.

### 1.4.1 release

Release record, **07.11.2026** (runtime **1.4.1**):

| Platform | Version / build          | Result                                                                                                                                                                                 |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | **1.4.1-29898758**       | Latest GitHub release (06.11.2026), available through Obtainium. Its JavaScript bundle has no server preset (`--public`).                                                              |
| iOS      | **1.4.1 (202611060026)** | Submitted to App Review (first App Store submission). Apple asked for more information (guideline 2.1: review notes, screen recording, demo account); resubmission pending. No preset. |

Over-the-air update on **07.11.2026**: `730c170` (PR #8, native fields no longer re-render on every keystroke, which made the iOS autofill bar flicker) to branch `staging` at 16:09 UTC (ios `17940677638751`, android `17940677638742`, group `676555ef-1c26-46f7-99fd-4d699cdedff2`), then to `production` with `--public` at 16:11 UTC (ios `17940678773511`, android `17940678773412`, group `ce798e85-c2d4-4c70-b388-762f0503956b`). The production manifests at runtime 1.4.1 return the new update on both platforms; the published bundles contain no server preset. It reaches every 1.4.1 build, including the one in App Review, on the next start after download. The flicker fix itself still needs a check on a phone (see [UI-NOTES.md](UI-NOTES.md#text-fields-and-the-ios-autofill-bar-07112026)). The xprem token came from the shell (`EOO_TOKEN`) because the 1Password CLI approval timed out.

The xprem dashboard calls its API at the public name (`VITE_OTA_API_URL`), so it can only sign in when opened under that name at home or over the VPN (Pi-hole resolves it locally); under the `.local` name the API answers without CORS headers, and through Cloudflare the API is not public.

### 1.4.0 release

Release record, **05.11.2026**:

| Platform | Version / build          | Result                                                                                                                                                                                                                                      |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | **1.4.0-29897316**       | GitHub release (since deleted); ARM64 APK **31,717,437 bytes**, universal APK **76,870,661 bytes**. Published SHA-256 digests match the local APKs; both certificates match the previous 1.4.0 release. Available through GitHub/Obtainium. |
| iOS      | **1.4.0 (202611050041)** | Archive and App Store Connect upload succeeded; Apple reported that the uploaded package is processing. TestFlight tester availability is not independently confirmed.                                                                      |

Both builds contain `3325223` (Home feed, app tabs, Places and collection workspace), including the preceding upload, formatted-link and collaborator-edit fixes. The release adds standalone places and visits, fixed search scopes, native iOS search, Android search controls, the merged Plan day/all-days views on both platforms, map-app preferences and accessibility/layout fixes. No native dependency or configuration changed since the previous 1.4.0 build, so the runtime remains **1.4.0**.

Preflight: typecheck, all **37 suites / 305 tests**, and lint pass (one existing lint warning). Feature checks used iPhone and Android development builds; the release binaries have not had a separate installed-device regression pass. Android used the existing upload key and verified its certificate against the previous APK. Checksums and matching R8/JavaScript maps are retained under `build/android/1.4.0-29897316-symbols/` and beside the APKs. The iOS archive is `build/testflight/1.4.0-202611050041/Unterwegs.xcarchive`; its log is `build/testflight/release-3325223.log`. Apple again reported non-blocking missing vendor-framework dSYM warnings. Remaining device/provider limits: [ROADMAP.md](ROADMAP.md#verification-as-of-05112026).

### Previous release

Release record, **04.11.2026**:

| Platform | Version / build          | Result                                                                                                                                                                                                                             |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | **1.4.0-29896838**       | GitHub release (since deleted), ARM64 APK **31,568,537 bytes**, universal APK **76,721,761 bytes**; both signed with the configured upload certificate (checked by the release script); published asset sizes match the local APKs |
| iOS      | **1.4.0 (202611041633)** | Archive and App Store Connect upload accepted; processing and tester availability have not been independently confirmed                                                                                                            |

All feature work is on `main`; both builds target `c2be232`. Typecheck, lint and all 246 tests passed before each build. Compared with 1.4.0-29896638 this adds the faster collection opening (only the visible day and its neighbours render, secondary tabs render on first visit, the offline-map poll no longer re-renders), the iOS tab-bar spacer on Heute, the shared Markdown rendering, the Android appearance fix and the dev-only design preview (not visible in release builds). No native change, so the runtime stays 1.4.0 and later JavaScript changes can reach both builds as OTA updates. Matching maps and checksums are retained under `build/android/`. iOS is the first 1.4.0 archive (TestFlight was on 1.3.0); Apple again reported non-blocking missing dSYM warnings for vendor frameworks. Previous Android build: 1.4.0-29896638 at `9f777f1`.

Over-the-air update on **04.11.2026**, 17:01 UTC: `8f8bf51` (the in-place Markdown field in every form and the design-review decisions) published for both platforms to branch `production`, runtime 1.4.0 (ios update id `17938116602661`, android `17938116602632`). It reaches the two 1.4.0 builds above on the next start after download; 1.3.x builds don't receive it.

Over-the-air update on **04.11.2026**, 21:02 UTC: `f334bca` published for both platforms to branch `production`, runtime 1.4.0 (ios update id `17938261643031`, android `17938261643172`, publish group `792747e7-cb21-42a5-a8cc-ac8d8f17bfbd`). It brings the redesigned screens from the design plan (Heute with the day strip, location/lodging/transportation details, Tage, search thumbnails), Japanese as a third language, and translations through i18next with English keys and plural forms. Still no native change; typecheck, lint and all 264 tests passed in the publish script.

The existing xprem PostgreSQL installation registry is enabled. Public log ingest, model/OS/binary enrichment, crash flagging and later startup recovery passed a synthetic-installation smoke check; test records were removed. ClickHouse is not configured. Real-phone startup, offline restart and SDK reporting remain pending; no emulator was opened for this release. See [TELEMETRY.md](TELEMETRY.md).

Install/update the 1.4.0 native build (Android APK, iOS TestFlight) before the verification pass. Opening a collection resyncs the version-busted data cache; do this online before the offline/reboot test. The release does not imply that every device/provider flow has been checked; see the [verification matrix](ROADMAP.md#verification-as-of-04112026).

## Commands

| Task                                        | Android                                       | iOS                                       |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| Dev build (JavaScript from Metro)           | `npm run android`                             | `npm run ios -- --device`                 |
| Metro for an installed dev build            | `npm start`                                   | `npm start`                               |
| Release build on a connected phone          | `npm run android:release`                     | `npm run ios:release -- --device`         |
| Upload to TestFlight                        |                                               | `npm run ios:testflight`                  |
| Publish a signed APK as a GitHub release    | `npm run android:publish`                     |                                           |
| Upload an app bundle to Google Play         | `npm run android:bundle -- --upload`          |                                           |
| Publish an over-the-air update              | `npm run update:android -- --channel staging` | `npm run update:ios -- --channel staging` |
| Both platforms at once                      | `npm run update:publish -- --channel staging` |                                           |
| Regenerate `android/` + `ios/` from scratch | `npm run native:clean`                        |                                           |

- `-- --device` picks a connected device (prompt), or `-- --device <name or id>`. Without it, iOS builds for the simulator and Android uses the only connected device or emulator.
- Production dev and release builds share the app id, so each replaces the other on the phone, keeping the login and offline data. Staging builds use a separate app id and separate local data.

## One-time setup

Personal values live in `.env.local` (gitignored; template `.env.example`). Without it the app builds as `com.example.unterwegs`, with no server preset and no updates.

| Variable                                            | What                                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNTERWEGS_APP_ID`                                  | iOS bundle id and Android package. Changing it makes a separate app                                                                                              |
| `UNTERWEGS_APPLE_TEAM_ID`                           | Paid Apple Developer team that signs iOS builds                                                                                                                  |
| `UNTERWEGS_IOS_BUNDLE_ID`                           | iOS bundle id when it differs from `UNTERWEGS_APP_ID`: a bundle id stays with the Apple team that first registered it. The App Group is `group.<bundle id>`      |
| `EXPO_PUBLIC_DEFAULT_SERVER_URL`                    | Server preset on the login screen                                                                                                                                |
| `UNTERWEGS_UPDATE_CHANNEL`                          | Explicit build channel: `production` or `staging`. Required when updates are enabled.                                                                            |
| `UNTERWEGS_UPDATES_URL`, `UNTERWEGS_UPDATES_APP_ID` | Update server and the app's id from the xprem dashboard                                                                                                          |
| `UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF`             | 1Password reference to the Google Play service account's JSON key, for `npm run android:bundle -- --upload` ([Google Play](#google-play-app-bundle))             |
| `EOO_TOKEN_OP_REF`, `OP_ACCOUNT`                    | 1Password reference (`op://…`, quoted if it has spaces) to the xprem API token, and the account it's in when `op` knows several; or set `EOO_TOKEN` in the shell |

Also needed: Xcode signed in (Settings → Accounts) with the team's Account Holder Apple ID (on an individual membership nobody else may sign: users added in App Store Connect get App Store Connect only), `certs/certificate.pem` (tracked; a new one comes from the xprem dashboard → App Info), the 1Password CLI signed in (`op`) when using `EOO_TOKEN_OP_REF`, and `ANDROID_HOME` in the shell profile for Android builds.

## Dev builds

`npm run android` / `npm run ios` build the debug app with the dev client and start Metro; afterwards `npm start` is enough until native code changes. They skip code signing (`DISABLE_CODE_SIGNING=1`): dev builds load their JavaScript from Metro and never run the update flow (the `Updates` API is unavailable there).

## Release builds

Before a native release, run `npm run licenses` and commit `src/legal/licenses.json` if it changed: the in-app licence list comes from the packages in the bundle. When native dependencies change, check the hand-kept native list in `scripts/licenses.mjs` against `ios/Podfile.lock`.

`npm run android:release` / `ios:release` first sync `android/` / `ios/` with the current config (`expo prebuild`, so `.env.local` values and the certificate are in), then build the release app and install it. A release build carries its own JavaScript: it works without Metro and without network. Use it for the airplane-mode test and to test updates.

- `expo run` keeps Metro and the log stream running after the install; stop it with Ctrl-C, the app doesn't need it.
- `npm run android:release` signs with the debug key; only `npm run android:publish` and `android:bundle` use the upload key (below).
- iOS release builds installed this way run for a year (development profile of the paid team).
- `expo run:ios` never lets Xcode create signing assets. On a new team, a new bundle id or a new phone, build once with `xcodebuild` so automatic signing registers the bundle ids, the App Group and the phone and creates the profiles; then `npm run ios:release` works:

  ```sh
  npx expo prebuild --platform ios
  xcodebuild -workspace ios/Unterwegs.xcworkspace -scheme Unterwegs -configuration Release \
    -destination id=<device udid> -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
  ```

  `xcrun devicectl list devices` shows the udid.

- Keep `./plugins/with-share-signing` before `expo-sharing` in the plugin list. Listed first, its Xcode edit runs after the extension target exists: it sets the team and App Groups signing, and names the extension Unterwegs in the share sheet.
- After native changes that `expo prebuild` can't merge (removed plugins, SDK upgrade), run `npm run native:clean` first. It deletes `android/local.properties`; Gradle then finds the SDK through `ANDROID_HOME`.

## TestFlight (iOS)

`npm run ios:testflight -- --channel production` (`scripts/ios-testflight.sh`) syncs `ios/` (`expo prebuild`), archives the release build and uploads it to App Store Connect with the Apple ID signed in to Xcode. Phones install it from the TestFlight app.

- Build number: a numeric UTC timestamp (`UNTERWEGS_BUILD_NUMBER`), so every upload is higher than the last; the share extension gets the same version and build number. Channel names stay out of Apple version/build numbers. Archives are channel-labelled: `build/testflight/<channel>-<version>-<build>/Unterwegs-<channel>.xcarchive` (gitignored).
- `ios.config.usesNonExemptEncryption: false` (`app.json`) answers the export-compliance question: the app only uses HTTPS.
- iPad and Mac (from 1.6.0): the same build installs on an iPad. On an Apple silicon Mac the TestFlight app offers it as "Designed for iPad" only after App Store Connect → the app → Pricing and Availability → **iPhone and iPad Apps on Apple Silicon Macs** is ticked; that setting also applies to the App Store listing.
- A TestFlight build expires after 90 days: upload again before then, even without changes. Over-the-air updates reach it like any release build of the same `version`.
- Signing and upload go through the Account Holder's Apple ID in Xcode (see One-time setup). Users added in App Store Connect (Admin, App Manager) can create the app record and manage testers.

App Store Connect uses two separately named app records so the channel is visible before opening a build:

- **Unterwegs Production**: the existing production bundle id (`UNTERWEGS_IOS_BUNDLE_ID`, else `UNTERWEGS_APP_ID`). Rename the existing record; keep its bundle id, history and testers.
- **Unterwegs Staging**: the same iOS bundle id with `.staging` appended. Create a separate iOS app record with that registered bundle id and its own SKU and TestFlight group. Keep it for TestFlight testing.

The owner chose to do this Apple-side setup manually (05.11.2026); these names are the intended record names, not a claim that the records have already been changed. Names must be available in App Store Connect. Changing a local archive/display name does not rename an App Store Connect record: uploads are assigned by bundle id. The production home-screen name remains Unterwegs.

```sh
npm run ios:testflight -- --channel production
npm run ios:testflight -- --channel staging
# Build a signed staging archive locally, without uploading:
npm run ios:testflight -- --channel staging --no-upload
```

`--public` builds without a server preset on the login screen, whatever `.env.local` sets: the App Store build ([STORE-RELEASE.md](STORE-RELEASE.md)). The Android scripts take the same option (`npm run android:bundle -- --upload --public`, `npm run android:publish -- --public`). Over-the-air updates replace the whole JavaScript bundle, preset included, so publish production updates for a public runtime with `--public` as well (`scripts/publish-update.sh`, the `update:*` scripts pass it through); otherwise the next update puts the preset back into the store app.

The command defaults to production when `--channel` is omitted; an explicit channel overrides `.env.local`. It prints the expected App Store Connect name and bundle id before building. Both channels use the existing Xcode signing identity. The staging app and App Group need provisioning just like production; automatic signing may create those assets. Set up the matching Apple app record before its first upload, then TestFlight → an internal group with the testers. Internal testers need no review.

## Android releases (GitHub + Obtainium)

`npm run android:publish` (`scripts/android-publish.sh`) refuses uncommitted or unpushed changes, runs `npm run check`, syncs `android/` (`expo prebuild`), builds the release APK signed with the upload key from 1Password, checks the signing certificate against `UNTERWEGS_UPLOAD_CERT_SHA256` (required), and publishes it as a GitHub release of the private repo in `UNTERWEGS_RELEASE_REPO`. The APKs embed the server and update URLs, so they never go to the public source repo. `-- --no-publish` stops after the signed APK in `build/android/`.

Starting with the 1.4.0 source, the script builds complete **ARM64** (`-arm64-v8a.apk`) and **universal** (`-universal.apk`) downloads, both with the same package, versionCode and release key. The universal variant also supports older ARM and x86 devices. Native libraries are compressed to reduce download size; Android may extract them during installation, so the installed size is different. The release-only Gradle property `UNTERWEGS_SPLIT_APKS=true` enables this packaging; development builds keep their ordinary single-APK behavior. Other ABI outputs are generated by Gradle but are not published. Checksums and the exact R8/JavaScript maps are retained locally beside the APKs.

For an ARM64 phone, set Obtainium's **Filter APKs by Regular Expression** to `.*-arm64-v8a\.apk$`; use `.*-universal\.apk$` for the fallback. This selects exactly one asset even when automatic architecture detection retains several compatible files. Continue installing over the existing app; no uninstall is needed when moving from universal to ARM64 in a later release.

- Version: `versionCode` is the minutes since 1970 (`UNTERWEGS_VERSION_CODE`), so every release is higher than the last. The versionName, the release tag and what Obtainium shows are all `<version>-<versionCode>`, e.g. `1.2.0-29912345`. The runtime version stays `version`, so over-the-air updates reach every release of the same `version`.
- Signing: `plugins/with-release-signing` adds a release signing config fed by Gradle properties, which the script passes as `ORG_GRADLE_PROJECT_*` environment variables. Without them release builds stay on the debug key.
- An APK signed with another key can't update the installed app. Phones that run a debug-signed build need one uninstall (sign in and sync again) before the first release.

### Existing signing key

For an update, use the existing keystore. `UNTERWEGS_KEYSTORE_OP_REF` points to the **file attachment**; `UNTERWEGS_KEYSTORE_PASSWORD_OP_REF` points to its password field. A field called `key` may hold the password, while the file is called `keystore`; `certificate sha256` is the public certificate fingerprint, not the signing key or password. Use the actual field names in `.env.local`, for example:

```dotenv
UNTERWEGS_KEYSTORE_OP_REF="op://example-vault/Android signing/keystore"
UNTERWEGS_KEYSTORE_PASSWORD_OP_REF="op://example-vault/Android signing/key"
```

When a known vault appears missing, check whether `OP_SERVICE_ACCOUNT_TOKEN` is overriding the personal-account login. With `OP_ACCOUNT` configured, `android:publish` explicitly selects it and clears that inherited token only for its `op` subprocesses. Without `OP_ACCOUNT`, the CLI's existing default/service-account authentication is used. Never create a replacement key to work around an authentication/reference error. The 1.3.0 release verified the downloaded keystore and compared the final APK certificate directly with the previous published APK.

### Creating the initial upload key

Only for a project that has never shipped a signed release: create a 1Password item with a long generated password, set `UNTERWEGS_KEYSTORE_PASSWORD_OP_REF` to that field and `UNTERWEGS_KEYSTORE_OP_REF` to `op://<vault>/<item>/keystore` (no dot in the name: 1Password reads `a.b` as section `a`, field `b`), run `./scripts/android-keystore.sh`, and put the printed `UNTERWEGS_UPLOAD_CERT_SHA256` into `.env.local`. Keep a second copy of the keystore outside 1Password (the item's file plus its password): losing the key means every phone has to uninstall and reinstall. The script refuses to overwrite an existing key.

### Installing on each Android phone

Install [Obtainium](https://github.com/ImranR98/Obtainium), add the repository URL as a GitHub source, and enter a fine-grained GitHub token with read-only "Contents" access to the release repo (`UNTERWEGS_RELEASE_REPO`) only; it is private because the APK carries the server and update URLs. Obtainium then offers each new release as an update.

## Google Play (app bundle)

`npm run android:bundle` (`scripts/android-bundle.sh`) builds the Android App Bundle Play needs. It shares the checks and signing with `android:publish` (`scripts/android-signing.sh`): committed state, `npm run check`, the upload key from 1Password, the certificate check against `UNTERWEGS_UPLOAD_CERT_SHA256` (for a bundle via `keytool -printcert -jarfile`). Output: `build/android/unterwegs-<version>-<code>.aab` plus checksum, and the R8 and JavaScript maps under `build/android/<version>-<code>-symbols/`. Play re-signs the app with its own app signing key ([0014](adr/0014-store-distribution.md)). No Expo account or EAS is involved.

- `npm run android:bundle`: build, sign and verify only. The **first** bundle of a new Play app goes up by hand (Play Console → Test and release → Testing → Internal testing → Create new release); this also enrols the app in Play App Signing. The API can't upload before that.
- `npm run android:bundle -- --upload [--track internal|alpha|beta|production] [--status draft|completed]`: build, then upload through the Play Developer API (`scripts/play-upload.mjs`, no dependencies) in one edit: bundle, R8 mapping, track release named `<version>-<code>`, commit. Default: `internal`, `draft`. Play refuses anything but `draft` until the app has been published once; roll a draft out in the Play Console. A failed upload deletes its edit.

One-time setup for `--upload`:

1. Google Cloud console: a project, the **Google Play Android Developer API** enabled, a service account with no project roles, and a JSON key for it.
2. Play Console → Users and permissions → Invite new users: the service account's email, with the app's release permissions ("Release to testing tracks", and "Release to production" once that's wanted).
3. Put the JSON key into 1Password (a file attachment or a field) and its reference into `UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF` in `.env.local`. The script reads it into a temporary file that is removed on exit.
4. `npm run android:bundle -- --check` confirms the access without building or uploading: it opens a Play edit, lists the tracks and deletes the edit again. A permission error right after the invitation usually clears after a while.

## Over-the-air updates

`expo-updates` against a self-hosted [xprem](https://github.com/mercuretechnologies/xprem) server (formerly expo-open-ota, Expo Updates protocol), configured in `app.config.ts`:

- The app checks on every start without waiting: it opens with what it has, and a downloaded update runs from the **next** start. To see one: open the app, close it fully, open it again. Settings shows "Unterwegs 1.0.0 · Update vom …" while an update runs.
- Offline, or when the server is unreachable, the check fails quietly. Builds made before the update server went public carry its LAN hostname and only get updates at home or over the VPN.
- Updates are code-signed by the server; release builds embed `certs/certificate.pem`.
- Family builds: channel `production` → OTA branch `production`. Staging builds: channel `staging` → OTA branch `staging`. Git branch names do not control these mappings.
- **Runtime version = app `version`** (`app.json`). Updates only reach builds with the same runtime version, so **bump `version` with every native change** (new native module, config plugin, Expo SDK) and ship that as a new build. JavaScript and asset changes go out as updates.

### Release rules

Feature branches go through a PR into `main`; GitHub Actions checks pushes and PRs. The intended next phase is automatic staging publication after successful checks on `main`, followed by an explicit production release action. **That CI publishing/promotion is not implemented yet.** Publishing currently remains a local command from home or the VPN.

Both OTA branches keep their channel mapping. TestFlight/Obtainium are distribution methods; neither determines an OTA channel. The existing family TestFlight app uses production. Do not remap production to test an update.

Native changes need a version bump and new native builds. Keep staging's dependencies, plugins and app version aligned with the production runtime being tested. Its display name, icons, app ids, URL scheme, App Group and update channel differ deliberately. A new native dependency cannot be validated by publishing an update onto an older staging build.

### Staging builds

The owner created the staging branch/channel in xprem on 05.11.2026. Expected mapping: `staging` → `staging`; production remains `production` → `production`. The public manifest route was checked for both platforms at runtime 1.4.0: staging returns `noUpdateAvailable`, while production still returns its existing updates. A publishing token cannot read channel management routes (HTTP 403, dashboard session required).

```sh
npm run android:staging
npm run ios:staging
```

These commands load `.env.local`, override `UNTERWEGS_UPDATE_CHANNEL=staging`, and generate native configuration through Expo. Android produces a local debug-key-signed release APK at `build/staging/android/unterwegs-staging.apk`. iOS produces an unsigned release-mode simulator app under `build/staging/ios/Build/Products/Release-iphonesimulator/`; it cannot be installed on a physical iPhone. These commands do not upload to GitHub or TestFlight.

Staging is named **Unterwegs Staging**, uses amber icons, app ids suffixed with `.staging` (including the separate iOS override), and scheme `unterwegs-staging`. Its login and offline files are separate from production. The deployed browser-sheet login page only returns to the production scheme, so staging deliberately uses the existing WebView SSO fallback; API-key sign-in remains available. No server login-page change is required.

Switching variants may cause Expo to regenerate native folders and reinstall pods. Native folders are generated; retain custom behavior in config/plugins. The Android publishing script selects production; the TestFlight script defaults to production and accepts an explicit staging channel; local `android:release`/`ios:release` use the channel from the environment. Keep `UNTERWEGS_UPDATE_CHANNEL=production` in `.env.local` for ordinary development.

Verification on 05.11.2026: both native builds succeeded and opened at sign-in on an Android emulator and iOS simulator. The APK and iOS app embed channel `staging`, runtime `1.4.0`, isolated app ids and the staging URL scheme. Typecheck and all 321 tests pass; lint has the existing `shareSigning.test.ts` warning. These checks do not establish physical-phone behavior. Build logs are retained locally under `build/staging/`.

OTA isolation rehearsal passed on 05.11.2026 for commit `be428eb`: the guarded publisher released both platforms to staging, runtime `1.4.0`, group `bcff3c3e-f44e-4249-9055-663130ccbdb1`. After download and restart, the iOS simulator's expo-updates database records a successful launch of `6e9bfac5-e012-6686-02f1-ed5474dfa171` with no failed launches. Android's startup telemetry reports `app_started` with running update `6b29261c-a876-4875-3430-4e19446db364`; the sign-in screen rendered. Both production manifest IDs were unchanged before/after. The local publish record is under `build/updates/20261105T083317Z-staging-be428eb07501-all-ObPj1j/`; verification evidence is summarized in `build/ota-setup/verification.json`. GitHub CI also passed for this commit.

For later native releases, repeat this check: install both variants, inspect embedded channels/runtime, publish a harmless committed staging update, restart staging to apply it, and verify production keeps its existing update. A successful build alone does not establish delivery. Physical-phone, offline and authenticated-flow checks remain separate; the iOS artifact above is simulator-only.

### Manual OTA publishing

The publisher accepts only these arguments; arbitrary eoas options cannot override the destination:

```sh
npm run update:publish -- --channel staging
npm run update:android -- --channel staging
npm run update:ios -- --channel staging

# Validate source, remote and environment without checks, credentials or publishing:
npm run update:publish -- --channel staging --dry-run

# Explicit production release of the full commit SHA at current origin/main:
npm run update:publish -- --channel production --confirm-commit "$(git rev-parse HEAD)"
```

`--channel` is required. Both targets require a clean working tree and a commit present on `origin` after a fresh fetch/prune. Staging accepts pushed feature commits for manual testing; future automatic publishing will use `main`. Production requires exactly the current `origin/main` commit and confirmation of its full SHA. Older-runtime backports need a separately designed release path; the script does not bypass the main rule for them.

The script validates required build configuration/certificate, runs `npm run check`, verifies that the checkout has not changed, then reads the publishing token. It exports `.env.local` itself because eoas disables Expo dotenv loading. An explicitly empty server preset is valid; an unset preset is rejected. The configured 1Password account takes precedence over an unrelated inherited service-account token.

Each attempt retains `release.json`, raw publisher output and the export under `build/updates/<UTC>-<channel>-<commit>-<platform>-<unique>/` (gitignored). Records include the full commit, channel/branch, runtime, platform, timestamps and server update UUIDs/group when returned by eoas 3.2.7's `--emitMetadata`. A failed or partial publish is recorded as `failed`. A successful server response without complete IDs is `published-needs-reconciliation` and exits unsuccessfully: inspect xprem before retrying, because users may already receive an update. Keep these local records private and back them up if needed.

Rollbacks and rollouts remain in the xprem dashboard. Version 3.2.7 supports republishing previous updates/groups and rollback; cross-branch artifact promotion still needs verification before implementing the production CI action. JavaScript exports contain variant-specific Expo config, so do not assume staging and production artifacts are interchangeable.

## Update server

xprem runs as one container with PostgreSQL (control plane, dashboard) and local file storage. The app needs `<UNTERWEGS_UPDATES_URL>/manifest` and the asset URLs over HTTPS wherever it should get updates; the dashboard only needs to be reachable by the owner. Publicly only the manifest and asset paths are reachable; the dashboard and the publish API stay on the LAN, so `npm run update:*` needs home or the VPN. The deployment lives in the owner's infrastructure repo.
