# Unterwegs – Roadmap

What is done, what comes next, and what could go wrong. What the app does today: [FEATURES.md](FEATURES.md). Why it is built the way it is: [adr/](adr/). Server facts: [SERVER.md](SERVER.md).

Work is ordered by need and dependencies, not by dates; the owner decides when development for a trip stops. One rule never bends: no change may risk reading offline, correct times, or PDFs opening offline.

## Decisions

|                                                     |                                                              |
| --------------------------------------------------- | ------------------------------------------------------------ |
| [0001](adr/0001-one-request-per-collection.md)      | A collection is read with one request                        |
| [0002](adr/0002-data-beyond-one-collection.md)      | Data outside a collection comes from its own endpoints       |
| [0003](adr/0003-one-api-key-per-device.md)          | One API key per device, whatever the sign-in method          |
| [0004](adr/0004-sso-through-the-website-session.md) | SSO signs in through the website, then makes the key there   |
| [0005](adr/0005-online-only-edits.md)               | Edits need a connection (partly superseded by 0016)          |
| [0006](adr/0006-times-in-their-own-time-zone.md)    | Every time is shown in its own time zone                     |
| [0007](adr/0007-offline-copy-on-the-device.md)      | The offline copy lives in SQLite and the documents folder    |
| [0008](adr/0008-native-controls-with-expo-ui.md)    | Native controls through @expo/ui                             |
| [0009](adr/0009-maplibre-with-openfreemap.md)       | Maps with MapLibre and OpenFreeMap                           |
| [0010](adr/0010-self-hosted-distribution.md)        | Distribution without app stores (superseded by 0014)         |
| [0011](adr/0011-pinned-server-version.md)           | The app is tested against one pinned AdventureLog version    |
| [0012](adr/0012-app-wide-text-size.md)              | App-wide text size through a local native module             |
| [0013](adr/0013-translations-with-i18next.md)       | Translations with i18next, German text as the key            |
| [0014](adr/0014-store-distribution.md)              | Distribution through the app stores                          |
| [0015](adr/0015-glances-from-the-offline-copy.md)   | Widgets, reminders and Live Activities from the offline copy |
| [0016](adr/0016-offline-edits-through-an-outbox.md) | Edits on the road work offline through an outbox             |

## Current state

1.6.0 is the current release (09.11.2026): iOS uploaded to App Store Connect for TestFlight, Android through GitHub/Obtainium. It runs on iPad (and on an Apple silicon Mac as an iPad app) with the layout in [IPAD.md](IPAD.md), and adds the day map, photo cards in every list and the grouped collection search. It is a native release, so 1.5.1 builds don't get it over the air. 1.5.0 added widgets, reminders and the travel-day Live Activity ([GLANCES.md](GLANCES.md), [0015](adr/0015-glances-from-the-offline-copy.md)), offline edits through the outbox ([0016](adr/0016-offline-edits-through-an-outbox.md)) and the design pass; 1.5.1 fills a new place from a shared link and had two over-the-air updates (the latest keeps the Next widget's cover in full color). Build identifiers, download link and signing details live in [RELEASING.md](RELEASING.md#current-release); reporting scope and limits in [TELEMETRY.md](TELEMETRY.md). What the app does: [FEATURES.md](FEATURES.md); per-screen checks and device scripts: [UI-NOTES.md](UI-NOTES.md) and [HOME-NAVIGATION.md](HOME-NAVIGATION.md).

**Phone check (owner, 08.11.2026):** on real phones, offline reading, PDFs and maps after a restart, QR sign-in, an over-the-air update, large text and screen readers, the Flip 5 fold/unfold, collaboration, and the widgets and offline outbox without signal all work.

**Store groundwork (owner, 08.11.2026):** the public build without personal values, reviewer access, the published privacy/support/account-deletion pages (checked live in de/en/ja), the store privacy forms and the 90-day cleanup of xprem installation records are done. What remains is in [STORE-RELEASE.md](STORE-RELEASE.md).

## Next

1. **Recheck server/provider reliability.** Wikipedia photo lookup returned HTTP 500 and image import HTTP 400 (04.11.2026); neither has been rechecked against the server since. Google Maps is now configured on the server, so nearby asks Google first and only falls back to Overpass when Google finds nothing ([SERVER.md](SERVER.md)). The Overpass mirrors answered on 08.11.2026, but a small query took about 27 s, close to the server's 30 s per mirror, and they reject requests without a User-Agent (406). Run `npm run smoke` and try web photos and nearby in the app before treating them as verified. The app now works around both: a photo the server can't import is downloaded by the phone and uploaded, and a failed nearby search can be retried or opened in the maps app ([STORE-RELEASE.md](STORE-RELEASE.md#6-quality-gates)).
2. **Collaboration and less-used screens.** Leaving a shared collection returns 403 due to the pinned server's collection permissions (still so on upstream `main`) and needs a server fix; the app says to ask the owner, and owner removal works. Check world/categories/calendar/Immich browsing, calendar-file import, city/region marking, empty-plan generation and lodging/transportation ratings in the UI.
3. **Check native account parity live.** Backup restoration and, for accounts with a password, password/two-factor/email management are now in the app; both are source-verified and covered by mocked tests but have not run against a server. Check them with a disposable account on a test server (a restore wipes the account). SSO-only accounts still use the website for security and email; staff administration stays on the website (Django admin has no API).
4. **Activities/trails from integrations.** Strava, Endurain and Wanderer connections can be managed in the app, but activity/trail import is still missing. Endurain/Wanderer setup and a real Strava OAuth round-trip need test integrations; Strava first needs server-side client credentials.
5. **Store release.** Google Play and the App Store replace GitHub/Obtainium and TestFlight once live; the remaining steps (App Review resubmission, name check, a newer-server check, the upload redirect fix; image redirects are fixed) are in [STORE-RELEASE.md](STORE-RELEASE.md).
6. **Family rollout.** Confirm TestFlight processing and tester access, onboard family phones to the store apps (Android: one uninstall of the Obtainium install, see [0014](adr/0014-store-distribution.md)), verify one update, and write a short install/help guide. Keep a second verified backup of the existing Android signing key.
7. **iPad and Mac, next steps** ([IPAD.md](IPAD.md#order-of-work)): big pictures for looking forward and back (looking back first, and on the phone too: the owner wants past trips to be a nice and exciting thing to open on every device), Mac comforts (right-click menus, hover, shortcuts), the order within a day on the map, then the check on 11- and 13-inch iPads and the Mac. iPad screenshots for the store are in [STORE-RELEASE.md](STORE-RELEASE.md).
8. **More glances** (wanted by the owner; candidates in [GLANCES.md](GLANCES.md)). Each can be switched off and on again on its own ([GLANCES.md](GLANCES.md#every-glance-can-be-switched-off)). Widgets: two clocks (home zone and today's zone), ticking off checklist items from the widget through the outbox, world statistics, "on this day" photos, a mini-map of today's locations, gallery previews before the first launch. Live Activity: day progress, offline-map download progress, a check-in window on arrival day. Android: an ongoing travel-day notification. A background task (`expo-background-task`) that refreshes the focus collection now and then. Remote push (invites, collaborator changes) needs its own ADR and a relay.

9. **Travel utilities, device checks and release** ([TRAVEL-UTILITIES.md](TRAVEL-UTILITIES.md)). Currency conversion (manual and cached Frankfurter daily rates), lodging address cards and collection offline readiness are implemented, with de/en/ja text and privacy-page source updates. All work with stock AdventureLog. Automated coverage includes exact monetary rounding, offline rate persistence, provider validation, overlapping lodgings and shared reminder/readiness counts; iOS and Android production bundles compile. Initial device inspection was blocked by `DEVICE_IN_USE`; a later iOS check verified Home access, manual conversion and local history/rate persistence after relaunch, and fixed a Hermes formatting API incompatibility. Currency history keeps the latest 100 explicitly saved conversions with rate snapshots and a clear action. Android, large text, screen readers, dark mode, offline restart and download failures still need verification before release. Deploy privacy-page changes with the release. Home/destination clocks, unit conversion and an editable local essentials card are now implemented in the working tree (09.11.2026); device verification and release remain tracked in TRAVEL-UTILITIES.md. Bill splitting and recorded-cost summaries remain candidates after use. An optional companion remains a future option for shared structured data; no server extension is required. Source findings: [server compatibility research](research/travel-utilities-server-compatibility.md).

Self-hosted PMTiles remain an option when native map-pack size/detail limits are insufficient, rather than a prerequisite for offline downloads. Time-zone suggestions are implemented; near-boundary suggestions remain editable and should be checked when planning.

The preferred browser SSO flow works. The separate allauth token-login approach (GitHub issue #1) remains blocked on the pinned server version ([0011](adr/0011-pinned-server-version.md)). Billing and changing server environment credentials remain website/deployment tasks.

## Verification as of 05.11.2026

The owner's phone check on 08.11.2026 (above) closes the device limits in this table for offline reading and maps, sign-in, accessibility, collaboration and the redesign; the provider row still stands.

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
