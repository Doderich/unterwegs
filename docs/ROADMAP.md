# Unterwegs – Roadmap

What is done, what comes next, and what could go wrong. What the app does today: [FEATURES.md](FEATURES.md). Why it is built the way it is: [adr/](adr/). Server facts: [SERVER.md](SERVER.md).

Work is ordered by need and dependencies, not by dates; the owner decides when development for a trip stops. One rule never bends: no change may risk reading offline, correct times, or PDFs opening offline.

## Decisions

|                                                     |                                                            |
| --------------------------------------------------- | ---------------------------------------------------------- |
| [0001](adr/0001-one-request-per-collection.md)      | A collection is read with one request                      |
| [0002](adr/0002-data-beyond-one-collection.md)      | Data outside a collection comes from its own endpoints     |
| [0003](adr/0003-one-api-key-per-device.md)          | One API key per device, whatever the sign-in method        |
| [0004](adr/0004-sso-through-the-website-session.md) | SSO signs in through the website, then makes the key there |
| [0005](adr/0005-online-only-edits.md)               | Edits need a connection                                    |
| [0006](adr/0006-times-in-their-own-time-zone.md)    | Every time is shown in its own time zone                   |
| [0007](adr/0007-offline-copy-on-the-device.md)      | The offline copy lives in SQLite and the documents folder  |
| [0008](adr/0008-native-controls-with-expo-ui.md)    | Native controls through @expo/ui                           |
| [0009](adr/0009-maplibre-with-openfreemap.md)       | Maps with MapLibre and OpenFreeMap                         |
| [0010](adr/0010-self-hosted-distribution.md)        | Distribution without app stores (superseded by 0014)       |
| [0011](adr/0011-pinned-server-version.md)           | The app is tested against one pinned AdventureLog version  |
| [0012](adr/0012-app-wide-text-size.md)              | App-wide text size through a local native module           |
| [0013](adr/0013-translations-with-i18next.md)       | Translations with i18next, German text as the key          |
| [0014](adr/0014-store-distribution.md)              | Distribution through the app stores                        |

## Current state

Android 1.4.0 is published with compressed ARM64/universal downloads and lightweight xprem installation/update-health reporting using its existing PostgreSQL database. No ClickHouse is added; searchable logs and metric history are outside scope. The server's synthetic-installation check verified metadata enrichment and crash/recovery flags. App release behavior still needs a phone check. TestFlight remains 1.3.0. Build identifiers, download link and signing details live in [RELEASING.md](RELEASING.md#current-release); reporting scope and limits live in [TELEMETRY.md](TELEMETRY.md).

**Android startup regression (04.11.2026):** the published 1.3.0 APK crashes before JavaScript starts, reproduced on a clean emulator install. The native MapLibre initialization fix shipped in 1.3.1 and is retained in 1.4.0. Install the replacement APK over the existing app; an OTA update cannot repair 1.3.0. See [RELEASING.md](RELEASING.md#android-130-startup-crash). Confirming startup on affected phones takes priority over the checks below.

Implemented collection planning/editing, world screens, sharing, search, exports, activities and profiles are listed in [FEATURES.md](FEATURES.md). Version 1.3.0 adds downloadable maps, coordinate-based time-zone suggestions, account/API-key controls and native integration settings. Implementation does not mean every flow has passed a real-phone test.

## Next

iOS Home, Collections and World now have top native search fields and their own stack/header, with app-wide results rendered in place. The outer header stays hidden. The detached Search button remains at the bottom right on iOS and focuses the current tab’s own search field, preserving its scope and tab. Places/Home activation and Cancel were checked on the iPhone simulator. World field placement, live results and Clear passed a dark-mode iPhone simulator check; Cancel and the other tabs still need a manual pass (see [UI-NOTES.md](UI-NOTES.md#ios-main-screen-search-05112026)).

Collection Stays, Notes and All days now prepare directly from the shared collection data rather than returning null until first focus. The two next likely collections prefetch through the same persisted `GET /api/collections/{id}` cache. The day footer is one compact native status/refresh row, with no implicit wrapper or Android spacer card. Collection and point maps keep the app background over the native map until its first fully rendered frame, with retry on load failure. First-render regression tests cover cached, unfocused list tabs; iOS device verification remains pending.

Android main-tab navigation now gives each tab its own native stack/header, with the root header consistently hidden. Native recording reproduced a title/content mismatch for 9 frames (about 300 ms); the fixed Home/Places recording has zero mismatched frames and zero missing Settings frames. Navigation backgrounds match the Material list surface before data mounts. The shell warms main-tab lists, archive and World data after cache restoration through the existing persisted cache and shared query definitions; regression tests cover deduplication, restoration, invalidation and independent failure. Commands and scope are in [UI-NOTES.md](UI-NOTES.md#android-main-tab-header-continuity). iOS navigation has not been reverified in this pass.

Android Places now has one scoped search entry inside its native scrolling list, using the same surface palette; Home, Collections and World now use the same in-list field for app-wide search, replacing their header magnifier. Home keeps creation in the header menu, with a short empty state and no duplicate New place row. Main lists, search, the collection day view and standalone place details use shared skeletons for their first load, retain cached content during refresh and explain when data is unavailable offline. Android checks with delayed fictional fixtures cover Home/Places/search loading-to-content, live filtering and Clear, the single search/create entry points, cached content on restart and Places in dark mode with enlarged text. Screen readers expose one busy region for each skeleton; iOS device verification remains pending.

The sign-in flow now starts with server selection, keeps QR sign-in available immediately, discovers the selected server's methods after Continue, and puts API-key entry under Advanced. The introductory blurb is removed. Server changes clear entered credentials and MFA state; MFA has a Cancel action. Android staging checks cover empty/invalid addresses, server discovery, failed-connection recovery, QR entry, API-key disclosure and changing servers; the entry screen was checked in light/dark mode and enlarged text. Typecheck, lint and all 325 tests pass (one existing lint warning). The public-demo shortcut selects the official hosted server; Android checks confirm method discovery and the website login/signup page opens. No shared demo credentials are bundled, and authenticated demo API-key creation remains unverified. Live password/MFA authentication and iOS device verification remain pending.

OTA release preparation adds explicit staging/production channels, a separate staging install and guarded manual publishing with local release records. The owner created staging routing in xprem; both staging release-mode apps built and launched their published OTA on emulators/simulators, with production manifest IDs unchanged. Physical-phone verification remains. CI still only checks code; automatic staging publication and production promotion are future work. Build/device/OTA verification status lives in [RELEASING.md](RELEASING.md#staging-builds).

The UI redesign from [the design plan](DESIGN-PLAN.md) is implemented: shared photo treatments, the redesigned "Heute" and resource details, inline Markdown editing and the consistency pass; the patterns are recorded in [DESIGN.md](../DESIGN.md). It was checked on an iOS simulator and an Android emulator only (see the verification table); the large-text, screen-reader, contrast, offline-photo and tablet cases from the plan's matrix still need a pass on phones, as part of step 1. Japanese joins German and English as a UI language.

The collection header now has a tab-aware “+” beside “…”; Today uses the selected day and Days asks which day. iOS native tab minimization and broader bold-label coverage are configured and covered where possible by automated tests. A visual/gesture pass remains pending: the iOS simulator was held by another device session on 05.11.2026.

Map filters now use the full iOS header height, and place previews use padded sheet rows. A device-local map-app preference supports Apple/Google Maps, Organic Maps and OsmAnd across all map-opening actions. Layout and provider-link regression tests pass; installed-app launches and the rendered spacing still need a device pass (simulator busy in another session).

The Home/navigation extension is implemented: Home, Collections, Places and World at app level, a separate focused collection workspace, scheduled visits in the feed, standalone place creation/editing/visits and collection-scoped search. The server's library and standalone writes passed live checks on temporary data; iPhone verification covers app/collection navigation, native bottom search with scoped/global results, the combined Plan day/overview switch, Places native list search and clear, standalone creation, scheduling a visit onto Home and deletion of the temporary place. Android emulator checks now cover API-key sign-in/session restoration and the merged Plan day/all-days control; broader Android search and offline checks remain. Behavior and scope: [HOME-NAVIGATION.md](HOME-NAVIGATION.md).

1. **Verify the released build on real phones.** Bugs in offline reading, times and PDFs come first.
   - Install Android 1.4.0 through Obtainium (choose ARM64 where supported) / iOS 1.3.0 through TestFlight; verify startup and binary/version reporting, then sync → airplane mode → restart the app and phone → open collection screens, photos, PDFs and GPX attachments.
   - Download an overview and a detailed map → pause/resume → airplane mode → restart → pan/zoom inside the saved area → delete. Check both platforms and light/dark behavior.
   - Share a PDF/photo from another app into Unterwegs and upload a camera/library photo on each platform.
   - Check QR sign-in, key-revoking sign-out, Flip 5 fold/unfold, large text and an OTA update to a 1.3.0 build.
   - Walk the redesigned screens at the largest text size, with bold text, increased contrast, reduced motion and VoiceOver/TalkBack, offline with a photo that was never downloaded, and on the unfolded Flip 5; read a few screens in Japanese.
2. **Resolve server/provider reliability.** Wikipedia photo lookup has returned HTTP 500 and image import HTTP 400; Overpass capacity/timeouts block nearby recommendations. Diagnose these before treating web photos or nearby as verified. Google Maps is not configured on the server; adding a paid-provider key remains the owner's decision.
3. **Verify collaboration and less-used screens.** Two-account API checks passed invite/accept/decline/revoke/remove, collaborator edits and read-only public collections (05.11.2026). Collaborator edits now preserve the required collection ID. Leaving returns 403 due to the pinned server's collection permissions and needs a server fix; owner removal works. Verify the native collaboration interactions on devices. Check world/categories/calendar/Immich browsing on devices, calendar-file import, city/region marking, empty-plan generation and lodging/transportation ratings in the UI. A passed endpoint check alone does not establish the whole interaction.
4. **Complete native account parity.** Password/MFA, email, account backup restoration and staff administration currently open website settings. Backup restoration has an API-key-capable endpoint and is missing native UI. Email/MFA use separate allauth endpoints that rejected the API key in live checks; choose session support or a server change before implementing their native flows. Verify staff administration endpoints before making authentication claims.
5. **Activities/trails from integrations.** Strava, Endurain and Wanderer connections can now be managed in the app, but activity/trail import is still missing. Endurain/Wanderer setup and a real Strava OAuth round-trip need test integrations; Strava first needs server-side client credentials.
6. **Store release.** Google Play and the App Store replace GitHub/Obtainium and TestFlight once live; checklist, security audit and decisions in [STORE-RELEASE.md](STORE-RELEASE.md).
7. **Family rollout.** Confirm TestFlight processing and tester access (external testers may need beta review), onboard family phones to the store apps (Android: one uninstall of the Obtainium install, see [0014](adr/0014-store-distribution.md)), verify one update, and write a short install/help guide. Keep a second verified backup of the existing Android signing key; its 1Password copy and signing certificate were checked during release.

Self-hosted PMTiles remain an option when native map-pack size/detail limits are insufficient, rather than a prerequisite for offline downloads. Time-zone suggestions are implemented; near-boundary suggestions remain editable and should be checked when planning.

The preferred browser SSO flow works. The separate allauth token-login approach (GitHub issue #1) remains blocked on the pinned server version ([0011](adr/0011-pinned-server-version.md)). Billing and changing server environment credentials remain website/deployment tasks.

## Verification as of 05.11.2026

| Area                       | Evidence                                                                                                                                                                                                                           | Remaining limit                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Automated checks           | 37 suites, 305 tests pass; typecheck passes; lint has one pre-existing warning in `shareSigning.test.ts`                                                                                                                           | Device and external-provider behavior still need separate checks                                                             |
| Collaboration              | Two-account API checks cover invites, acceptance/decline/revocation, collaborator edits, owner removal and public read-only access; regression test covers collection preservation on four edit types                              | Leave returns server-side 403; native flows unverified (simulator busy in another session); fictional shared sample retained |
| Distribution               | Signed Android APK published; TestFlight archive/upload accepted; CI green                                                                                                                                                         | Apple processing/tester availability and upgrades on family phones not confirmed                                             |
| Essential collection flows | Simulator checks covered search, PDF/share image, location creation, duplicate detection, Wikipedia text, trails, visited-today, activity metrics and corrected Kyoto sun times                                                    | Broad real-phone regression pass remains                                                                                     |
| Collection copy and ZIP    | Live duplication and ZIP export/import preserved the test location count; temporary collections/locations were removed                                                                                                             | Native file-picker/share-sheet round-trip not fully checked                                                                  |
| Offline maps               | Detailed Tokyo pack downloaded on iOS simulator (23.5 MB, zoom 14) and was deleted                                                                                                                                                 | Offline restart/pan/zoom, pause/resume and Android downloads not yet established                                             |
| Account                    | Live metadata, no-change profile PATCH and temporary API-key create/revoke passed; account screen inspected on iOS                                                                                                                 | Account deletion deliberately not run; backup export/restore not verified end-to-end                                         |
| Integration management     | Live status/settings GETs accept the API key; status and Immich settings screens inspected on iOS; write/MFA/OAuth handling covered by mocked HTTP tests                                                                           | Existing live connections were not changed; real Endurain MFA and Strava OAuth untested                                      |
| UI redesign                | Heute, Tage, lodging and transportation details and search checked on the iOS 26 simulator (dark) and an Android 16 emulator (light), English, one sample trip; time-zone cases of the journey and stay summaries covered by tests | Large text, screen reader, contrast, offline photos, tablet width and Japanese not checked on a device                       |
| Web photos / nearby        | Wikipedia text and lookup sometimes work; earlier smoke pass covered image import                                                                                                                                                  | Later photo import failed (400), lookup intermittently failed (500); Overpass remains unreliable                             |

## Testing commands

- **`npm run check`**: typecheck, lint and Jest; also runs in CI. Covers time zones, selectors, edits, schemas against anonymised samples, translations, privacy, map-area planning and integration callback handling.
- **`npm run smoke`**: read-only live collection and supporting-data checks. Run before changing the pinned AdventureLog server.
- **`npm run smoke:write`**: selected collection/world parity operations in temporary collections, including copy/import/export, trails/activities, ratings and visited-region/city actions. It does not cover every `client.edit` operation, account deletion, collaboration or integration credential changes. Use a disposable account for its world-marking cases: the current city check unmarks its chosen city without first preserving an existing city visit. Review and harden this baseline restoration before using it on travel history that matters.
- **Device scripts**: `scripts/check-*.py`, described in [UI-NOTES.md](UI-NOTES.md), use the executable returned by `device_open`. They test focused UI behaviors, not the whole app.
- **Release builds on phones**: required for offline/reboot and OTA verification; development builds rely on Metro.

## During a trip

- JavaScript fixes go out over the air; native changes need a new Android release and TestFlight upload. TestFlight builds expire after 90 days.
- Keep the server pinned; collect problems as GitHub issues.

## Risks

| Risk                                                 | Mitigation                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| API changes after a server upgrade                   | Pinned version; schema export and smoke checks before upgrading ([0011](adr/0011-pinned-server-version.md))   |
| Wrong time-zone suggestion near a border             | Editable suggestion; verify the object's zone and test DST/date-line cases                                    |
| A failed edit leaves wrong data on screen            | Roll back optimistic collection edits and refetch; show errors for online actions                             |
| Accidental destructive account/collection action     | Explicit confirmation; username/password confirmation for account deletion; test against disposable accounts  |
| Downloaded maps missing or insufficiently detailed   | Check completion before departure; save detailed areas separately; test restart and storage-pressure behavior |
| Lost Android signing key or wrong 1Password identity | Keep a verified independent backup; set `OP_ACCOUNT`; compare the APK certificate with the previous release   |
| TestFlight expiry or unprocessed upload              | Confirm availability and upload before the 90-day expiry                                                      |
| Flip 5 layout/focus problems                         | Physical fold/unfold and large-text checks; cover screen remains unsupported                                  |
