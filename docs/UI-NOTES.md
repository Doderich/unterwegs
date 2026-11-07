# UI notes

How tricky UI parts work and how to check them on a device. The design system itself (colours, type, components, rules) is in [DESIGN.md](../DESIGN.md).

## Device entry points

Use `device_list` to identify the host/device, then `device_open` for its bound `agent-device` executable. Run `open <app-id>` before snapshots or input. All launches, deep links, taps, text, settings, screenshots and recordings use that executable; `device_screenshot` supplies visual inspection. Follow a command's recovery guidance once and stop if it fails again. Build/install/log tools remain separate. The scripts below take the returned executable and the configured app id, not a hard-coded device identifier.

## Android main-tab header continuity

Every Android main tab has a native stack with its own fixed title and toolbar actions. The root header stays hidden for the whole main navigator, including its initial configuration. This follows [Expo Router's native-tab hierarchy](https://docs.expo.dev/router/advanced/native-tabs/#use-stacks-inside-tabs). The Home stack lives in a route group to preserve the existing root URL. iOS retains its parent app header, while Places keeps the native search header.

A shared parent header had removed the disappearing-bar jump, but its title still followed global route state after the native tab changed. A recording caught the Home feed under the Places title for 9 frames (about 300 ms). Putting the complete header and content in the same native tab removes that independent update. Main toolbar actions receive the tab explicitly; they do not subscribe to global route segments. The installed Expo UI Compose Icon reloads its painter after native accessory reattachment, so retained Material symbol views remain in Android header actions. App-wide search opens from the in-list field, and Places retains its scoped field.

Navigation theme, tab scenes, native-stack content and the Android Host frame use the same Material surface as the list, including before Compose content mounts. Main screens no longer use a focus-dependent null-render gate; their native content is prepared with the tab. The shell restores the SQLite query cache and warms collections, locations, invites, archive and World stats/pins/countries together, without waiting for a first tab visit. Toolbar options are declared in the tab stack layout before the screen content mounts. Shared query options keep prefetch and screen reads on the same cache keys and freshness policy. Concurrent warm-ups deduplicate; fresh/restored data is reused, and an endpoint failure does not block the other entries. Credential-bearing queries and media downloads are outside this warm-up. A separate bounded look-ahead warms complete details for the two next likely collections, ordered with the collection library, through `GET /api/collections/{id}` and the exact options used by `useCollection`. Existing sign-out cache clearing and write invalidation remain in place.

### Device regression checks

Open a signed-in QA app on Home with English labels, light appearance, online state and fictional or public demo data. The script records the actual screen, changes tabs through fresh device snapshots and checks every encoded frame for the persistent Settings icon. It requires Python and ffmpeg. Recordings contain visible data; do not commit them. Output defaults to ignored `build/qa/`.

```bash
python3 scripts/check-navigation-chrome.py /path/from/device_open/agent-device
python3 scripts/check-navigation-chrome.py /path/from/device_open/agent-device --all-tabs
python3 scripts/check-navigation-chrome.py /path/from/device_open/agent-device --button-label Add
```

The Add check uses Home/Places only, since World intentionally has no creation action. Header/content timing needs an additional check; icon continuity alone cannot detect a stale title. For a 1080×2400 portrait Home/Places recording, choose one fully settled Home frame and one fully settled Places frame (both lists at the top), then run:

```bash
python3 scripts/check-header-content.py build/qa/navigation-chrome.mp4 HOME_FRAME PLACES_FRAME
```

The analyzer classifies title and top content independently against those two references, rejects indistinguishable references and fails on a confident mismatch. It saves the first failing frame. The before recording failed with 9 mismatches in 395 frames; the final recording passed with zero in 309 frames and zero missing Settings frames. The all-tab recording also had zero missing Settings frames in 316 frames. A content-margin pixel check found 61 default-grey frames before the background fix and none across the 316-frame all-tab recording afterward. Cache tests cover warm-up deduplication, restored reads, invalidation and partial failure. These are focused emulator checks, not verification of every navigation transition or iOS.

## iOS verification attempt (05.11.2026, incomplete)

An isolated SDK 58 Debug simulator build compiled for iOS 27. The native server-selection form, server discovery, keyboard entry and Advanced API-key disclosure were exercised in dark appearance. Authenticated screens were not verified: credential persistence did not complete after HTTP user verification succeeded. An attempted repair of the simulator QA signing entitlements then produced a QA install that failed to launch; the device tool's prescribed diagnostic retry failed with the same launch error, so device testing stopped.

The original installed app/session was not replaced. Temporary JavaScript diagnostics were removed and the normal generated staging configuration was restored. The local fixture was stopped when the owner requested the public demo or their existing instance. An authenticated pass against one of those servers is still required before claiming iOS navigation, search, collection first-render, map loading or appearance parity. Use the repository's normal development signing setup rather than manually re-signing an unsigned simulator app for authenticated testing.

## Collection first render and offline status

Stays, Notes and All days no longer wait for `useTabVisited` before mounting. They consume the already shared collection view immediately. Their true uncached state uses shared loading/error/offline rows, and does not return an empty screen. The expensive native map stays lazy; its tab scene and pre-mount view use the app background.

The collection day footer uses a hook returning a direct native `FieldGroup.Section` with one refresh `ListItem`. Wrapping a section-returning component directly inside Android FieldGroup makes it an implicit row, which previously created nested padding/cards. The iOS tab-bar spacer is excluded at the caller on Android, so a component returning null cannot leave a synthetic empty row. Timestamp and file-download status are supporting lines in the refresh row. Media downloads still follow the existing current/upcoming automatic policy; older collections can download explicitly through that row.

`MapCanvas` is shared by collection and point maps. It covers the unrendered native surface with the app background and an accessible spinner, removes it after the first fully rendered map, and provides a themed Retry state if loading fails. Overlay controls remain outside the map canvas. Map initialization and downloading a basemap are separate from cached collection metadata.

First-render tests provide cached collection data with tabs still unfocused and require Stays, Notes and All days to render. Replaying the committed screen implementations against these tests failed all three; the prepared implementations pass all three. An Android Plan/Stays/Notes recording after the fix contained 226 frames with no blank content frames and no missing collection-menu icon. Prefetch tests require only the two highest-priority non-archived details to be fetched, deduplicate concurrent warming and verify a later screen read uses the same cache. The Android collection toolbar can also be checked independently after data is loaded:

```bash
python3 scripts/check-navigation-chrome.py /path/from/device_open/agent-device --collection --button-label 'Collection menu'
```

## Android development-server recovery

A development client showing “Unable to load script” after sign-in/reload may be reopening a stale Metro address. This is distinct from an authentication error. Check Metro `/status` and Android logs first. For a local Android emulator using a non-default port, forward that port (`adb -s <serial> reverse tcp:8083 tcp:8083`) and use the bound `agent-device` executable to relaunch explicitly with the Expo development-client URL, not only a Metro reload hint:

```sh
/path/from/device_open/agent-device open com.example.unterwegs 'exp+unterwegs://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083' --metro-port 8083 --relaunch
```

Use the configured package/scheme and actual running port. Verified recovery: test API-key sign-in reaches Home and a full relaunch restores the signed-in session. This check does not establish browser SSO callback behavior.

## Forms and the keyboard

Full-screen forms use `FormHost` from `src/ui/FormHost`. On Android, a bounded Expo UI `Host` can keep its full height behind the keyboard, so its native `FieldGroup` does not scroll a lower focused input into the visible area. `FormHost.android.tsx` resizes the host with React Native's `KeyboardAvoidingView`, accounting for the stack header and leaving room for the native row's padding below the caret. iOS keeps the ordinary SwiftUI host and its native keyboard handling.

Inputs that autofocus in a lazy form use `useInitialInputFocus`. Once they have received focus, their `autoFocus` prop becomes false. Otherwise, scrolling them out of the native lazy list and back into it can request focus again and reopen the keyboard after dismissal.

### Device regression check

Use a signed-in Android debug build connected to Metro. Pass the device-bound executable returned by `device_open` and the configured application id:

```bash
python3 scripts/check-form-keyboard.py /path/from/device_open/agent-device com.example.unterwegs
```

The script opens an unsaved new-collection form, focuses its Link field, checks that the entire input rectangle ends above the keyboard, then checks that dismissing the keyboard does not reopen it. It does not save or create server data.

Verified on the connected Android phone: without keyboard avoidance the input ended at 1848px while the keyboard began at 1404px; with the fix it ended at 1380px. Also checked typing in the multiline notes field at the bottom of the lodging form and switching to its Link field with the keyboard already open.

### Input identity and first-letter focus (iOS)

A React render after `onChangeText` is expected: the form updates draft values and Save validation. Changing a text input's React `key` while typing replaces the native input and loses focus. Location name previously changed its key when the first letter made it nonempty; location/lodging addresses and transportation endpoints used the typed text in their keys.

Those fields now use a revision incremented only when a place-search selection supplies replacement text. This still refreshes their uncontrolled `defaultValue`, including repeated picks at the same coordinates, while ordinary typing retains the native input. The lodging title also refreshes when a search fills its empty name.

Open an unsaved form in a signed-in debug build, then run:

```bash
python3 scripts/check-form-input-focus.py /path/from/device_open/agent-device location-name
```

Other targets: `location-address`, `lodging-name`, `lodging-address`, `transport-from`, `transport-to`. The script replaces the target's draft text and asserts focus and text retention after one letter and continued typing, repeating five times. It never saves. Stop after a device-command failure and follow the tool's recovery instructions before rerunning.

Verified on the iOS simulator: restoring the old location-name key makes the script fail with `location-name lost focus after typing 'A'`; the fixed key passes. Repeated first-letter checks also pass for both address fields and both transportation endpoints. A place-search pick still replaces the name and address after manual typing. React DevTools flagged no render problems during the fixed typing check (14 commits, 40 ms total development render time, including clearing and typing six letters). This verifies native focus retention; it does not measure keyboard animation on a physical iPhone.

## Markdown editor

Notes and the descriptions of collections, days, locations, lodgings and transportation use `useMarkdownEditor` (`src/ui/MarkdownField.tsx`). The text is edited where it is shown: at rest the section shows the formatted text (the shared reading renderer) and a labelled "Text hinzufügen" / "Text bearbeiten" row. That row turns the same section into a native multiline field; a formatting bar sits above the keyboard. There is no separate editor screen or sheet.

- Bar: Bold, Italic and Link directly; Heading and List under "…" (an iOS menu; on Android "…" swaps the bar to them and back), then "Fertig". iOS uses SwiftUI's keyboard toolbar, which iOS positions itself (the floating bar sits directly on the keyboard; its distance can't be changed). Android docks the bar below the form's Compose host inside the keyboard-avoiding view, with the bottom inset when no soft keyboard is shown.
- Bold and italic wrap the selection, or insert a selected placeholder at the caret. Pressing the same control again on the wrapped selection removes that formatting. Heading and list work on complete selected lines. Link inserts Markdown and selects its URL for replacement.
- Typing changes the form's draft directly. "Fertig" or leaving the field returns to the formatted view; the form's own Save performs the server write, and the form's cancel discards the draft as before.
- Source text stays Markdown; rendering never rewrites it.
- Selection units: Android and `formatMarkdown` use UTF-16 offsets; the iOS field reports and sets its selection in Swift `Character`s, converted with `src/ui/graphemes.ts`. On iOS a selection set from JS is clamped to the text the field has at that moment and dropped once text set from JS arrives, so after a formatting command the selection is applied when the field reports the new text (timer fallback), and the caret-to-end on first focus waits until focus has settled.

### Checks

`src/__tests__/markdownEditing.test.ts` covers selection replacement, toggling, emoji offsets, multiline formatting, link URL selection and combined inline styles; `src/ui/__tests__/graphemes.test.ts` the iOS offset conversion. Native behavior needs the real device loop: open an unsaved form whose Markdown section is empty (e.g. "Neuer Ort") in a signed-in debug build, then pass the device-bound executable returned by `device_open`:

```bash
python3 scripts/check-markdown-editor.py /path/from/device_open/agent-device
```

The check exercises Bold at the end of the text and typing over the placeholder, "Fertig" back to the formatted view, and reopening with the draft kept. It changes only the local form draft and never presses the form's Save. Stop after a device-command failure and follow its recovery instructions before rerunning.

## Sheet rows (iOS)

Sheet options use `SheetRow`, not form-row insets. The iOS implementation puts padding and a rectangular touch region inside the native SwiftUI button label, with separate icon, text and trailing columns. Its text stack has a six-point headline/hint gap and expands vertically for wrapped text and Dynamic Type. Android re-exports the existing Material `ListItem` directly.

Use it for action menus and place-search results. Keep regular form rows as `ListItem`. The iOS text prompt also uses content height, explicit vertical spacing and a minimum 44-point Save control; Android retains its existing layout.

With an action menu or populated search sheet open on the iOS simulator, check the real accessibility rectangles:

```bash
python3 scripts/check-sheet-rows.py /path/from/device_open/agent-device sheet-action-
python3 scripts/check-sheet-rows.py /path/from/device_open/agent-device place-result-
```

The check is read-only and requires at least two visible rows. Every touch rectangle must be at least 44 points high and must not overlap the next. Also inspect normal and enlarged text visually to catch clipping and poor hint grouping.

## Booking.com links

Research checked **03.11.2026** against public first-party sources. No real reservation URLs or credentials were used.

### Finding

An HTTPS Booking.com link can be eligible to open its iOS app, but eligibility depends on its **path**, not merely the hostname. In particular, `/confirmation.html` and `/confirmation.de.html` do not match Booking.com's currently published universal-link rules. A direct handoff of those paths therefore cannot be expected to open the app as a universal link. This is an inference from the association files and Apple's matching rules, not a device test. A later website redirect or explicit app button could behave differently. [Booking.com secure AASA](https://secure.booking.com/.well-known/apple-app-site-association), [www AASA](https://www.booking.com/.well-known/apple-app-site-association), [Apple matching rules](https://developer.apple.com/videos/play/wwdc2019/717/).

### Verified association data

Both association files returned HTTP 200 JSON and identical content (SHA-256 `c6b363ef2f017e65b7378da28dc87ec72735f4facf231e6696351130e3726071`). All `applinks.details` entries were inspected: each file has **one entry**, covering the production app `8WZRM339HP.com.booking.BookingApp` and three other app IDs, with **73 legacy `paths`** and **162 modern `components`** rules. None of the component rules constrains the query or fragment. [secure AASA](https://secure.booking.com/.well-known/apple-app-site-association), [www AASA](https://www.booking.com/.well-known/apple-app-site-association).

| Example path             | Legacy `paths` match | Modern `components` match |
| ------------------------ | -------------------- | ------------------------- |
| `/confirmation.html`     | No                   | No                        |
| `/confirmation.de.html`  | No                   | No                        |
| `/mybooking.html`        | No                   | No                        |
| `/mybookings.html`       | No                   | `/mybookings.*`           |
| `/myreservations.html`   | No                   | `/myreservations.*`       |
| `/hotel/xx/example.html` | `/hotel/*`           | `/hotel/*`                |

The modern rules also include `/mybookings`, `/myreservations`, `/mytrips.*`, `/app_link/*` and `/deep-link`. These establish eligible paths, **not** a documented contract for passing an existing reservation into the app. iOS 13 and later use `components` when present and ignore legacy `paths`; unspecified query and fragment components are ignored for matching. Thus changing query parameters cannot make a confirmation path match these rules. [Booking.com AASA](https://secure.booking.com/.well-known/apple-app-site-association), [Apple WWDC19, matching and precedence](https://developer.apple.com/videos/play/wwdc2019/717/).

### Custom schemes and limits

Booking.com's Demand API explicitly returns `booking://hotel/<hotel-id>` deep links for accommodation search results. That opens accommodation content; it is not documentation for opening an existing reservation. Searches of Booking.com's public developer documentation and first-party pages found no documented `booking://` reservation/confirmation format or supported conversion from a secure confirmation URL. Absence from these searches does not prove the app has no internal route. [Booking.com search examples](https://developers.booking.com/demand/docs/accommodations/search-examples).

The AASA file alone cannot prove a successful launch: Apple's association requires matching app entitlements as well, and the installed app, cached association data and the user's link preferences affect handling. No Booking.com binary entitlements or physical-device behavior were checked. Android was not investigated. [Apple universal-link support](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app), [Apple troubleshooting](https://developer.apple.com/library/archive/qa/qa1916/).

### Implication for Unterwegs

Keep the original reservation HTTPS URL and hand it to the OS. Do not rewrite it to an undocumented custom scheme or replace its hostname. If a separate app entry is wanted, a booking-list link such as `https://www.booking.com/mybookings.html` is a candidate for device verification, with the understanding that it does not identify the particular reservation. An app-specific reservation button needs a documented Booking.com route or a verified, privacy-preserving device test before implementation.

### App implementation

Secure `confirmation[.<language>].html` and `mybooking[.<language>].html` links keep their original action and gain a separate “Booking.com-Buchungen öffnen” row, labelled as the general bookings list. This also applies to links inside Markdown descriptions and notes. The shortcut opens `https://www.booking.com/mybookings.html` through the existing OS handoff and browser fallback. It never forwards the original query or fragment, and never rewrites the confirmation URL. Whether Booking.com opens its app or website remains subject to the installed app and the phone's link preferences.

## Account and integration settings (1.3.0)

Settings and account management both link to native integration settings. Immich/Wanderer use editable server addresses and empty replacement-key fields; an empty update key keeps the server's stored credential. Endurain uses username/password and, if requested, a second form for its MFA code. Failed Endurain MFA consumes the server challenge, so the UI returns to a new connection attempt. All save/disconnect actions need a connection and show busy/error states. Disconnect asks for confirmation; Immich also warns about linked photos becoming unavailable.

The Strava approval screen is an incognito provider WebView. It validates provider/callback URLs and random state, intercepts the callback before website navigation, sends the code to the server with the app key, and verifies connection status. The app key is never added to the provider URL or WebView headers. A real provider round-trip remains untested while server client credentials are absent.

Account profile/API-key controls and confirmed deletion use native forms. Password/MFA, email, account restore and staff administration still open browser settings. Inspect the native rows and the security prompts without executing destructive actions against a real account. API tests use mocked requests for deletion and integration writes.

## Offline-map controls (1.3.0)

The collection map's filter panel links to "Offline-Karten" even without internet. Its form chooses the whole collection overview or a detailed area around a location/lodging. Download starts only after confirmation about internet/mobile data; saved rows show state, progress, bytes and detail level, with pause/resume/delete actions. The native build-version check keeps downloads disabled before 1.3.0. Area planning and limits live in `src/maps/regions.ts` / `offline.ts`; the map decision is [0009](adr/0009-maplibre-with-openfreemap.md).

Verified on the iOS simulator: integration list, Immich settings with no key prefilled, account form, and a complete detailed Tokyo map download followed by deletion. Still check Android, airplane-mode restart, saved-area pan/zoom, pause/resume, dark/light switching, large text and physical-phone storage behavior. The latest cross-feature status lives in [ROADMAP.md](ROADMAP.md#verification-as-of-04112026).


## iOS main-screen search (05.11.2026)

Home, Collections and World now each own a native stack/header and a stacked `Stack.SearchBar`. The outer app header is consistently hidden, matching the hierarchy already used for Places and Android. The app-level detached Search tab remains visible at the bottom right on iOS, as requested alongside the top fields; collection-workspace search is unchanged. Search results render in place through the existing `SearchScreen` with an externally supplied query, without registering another header or search controller. Query state belongs to each tab. Android keeps its existing in-list launchers.

iPhone 18 Pro / iOS 27 simulator, current development build, live server: World search field placement and header actions inspected in dark mode; entering “Montreal” showed seven results; native Clear restored World content. Cancel did not visibly dismiss during the automated attempt, and the subsequent tab-switch attempt was rejected by the device tool because the keyboard covered its target. Device automation stopped after the failed retry. Cancel, result navigation, the other tabs, light mode and large text need a manual device pass.


## Description readability (05.11.2026)

Shared description rows add line spacing/padding and a localized Read more / Show less disclosure for long source text. This applies to standalone places and collection locations, lodging and transportation; notes/editor previews are unchanged. Full rendering retains the stored Markdown and separate links. Excerpts use the existing Markdown summary and grapheme-safe boundaries, including scripts without spaces. No source data is modified.

iPhone 18 Pro / iOS 27 simulator with live data: the reported Ben & Jerry’s description was inspected in dark and light appearance; Read more revealed the full text and Show less restored the excerpt. Android and large-text/screen-reader interaction remain unverified on device. Typecheck, lint and all 331 tests pass; one existing lint warning remains in shareSigning.test.ts.


## Contextual bottom search (05.11.2026)

The detached main Search trigger now prevents native tab selection and focuses the current tab’s search controller through a focus-scoped registration. It no longer navigates to the separate generic search screen. Places retains its own query/filter and list; Home, Collections and World focus their own top search field. Both supported native tab press listeners and search-controller refs are used; no route round-trip or timer is needed. Cancel explicitly blurs the native field after clearing the query, fixing the keyboard remaining visible on iOS 27.

iPhone 18 Pro / iOS 27: bottom Search focused Places search while Places remained selected; typing filtered its list; Cancel restored the list and dismissed the keyboard. After switching to Home, bottom Search focused Home’s field with Home still selected; Cancel dismissed it. Typecheck, lint and all 331 tests pass (one existing lint warning). Collections and World use the same wrapper; they were not individually retested in this focused pass.


## iOS tab-label preference (05.11.2026)

Settings → Appearance contains an iOS-only Show tab labels switch. The existing SQLite settings schema defaults missing/invalid values to true; changes apply to both main and collection NativeTabs without changing routes or queries. Every icon-only trigger retains its full localized accessibility label. Android labels remain visible.

iPhone 18 Pro / iOS 27: switched labels off in Settings, inspected icon-only main and collection bars, and relaunched the app to verify the persisted choice. The simulator is left with labels off. Typecheck, lint and all 331 tests pass (one existing lint warning).

## Text fields and the iOS autofill bar (07.11.2026)

Every render that gives an `@expo/ui` view new props sends all of them to the native side again; iOS re-applies each one to SwiftUI (`finalizeUpdates` → `updateRawProps` in `expo-modules-core`), Android sets each received prop on the Compose view. `TextInput` builds a new `modifiers` array on each render, so a field that re-rendered on every keystroke re-applied its `textContentType` and made the iOS autofill bar flicker (seen on a phone, on the login screen). Fields re-rendered when their own props changed per keystroke: `defaultValue={state}` (46 places; `@expo/ui` reads it only on mount, forms reset fields through `key`) or callbacks closing over the typed text. Other views on the same screen did not re-render: the React Compiler already skips them while their inputs stay the same.

`stableNative` (`src/ui/stableNative.tsx`) renders a native view only when its own visible props change: handlers go through stable wrappers that call the latest one, `style`/`textStyle`/`modifiers` and listed props are compared by value, and mount-only props are ignored. `@/ui/TextInput` uses it (ignoring `defaultValue`); the iOS date/time rows (`selection` by value) and menu pickers (built from an options list) use it as a safeguard. Lint forbids importing `TextInput` from `@expo/ui`. The login screen keeps typed values in a ref and re-renders only when a field turns empty or filled. React Native's own `TextInput` (Android search header) compares props individually and is not affected.

iPhone 18 Pro simulator / iOS 27, dev build, temporary render log: login, 17 characters into username and password: 34 native field renders before, 0 after. Stay editor (name field, type and time-zone pickers, four date/time pickers), typing in the name: 1 render per character before (the name field only), 0 after. The simulator does not show the flicker itself in either version, so the phone is the check for that. Sign-in by Return worked after the change. Android, Unterwegs_QA emulator / Android 16, dev build, same log: 0 renders for 36 characters in the login fields and for typing in the stay name; with the comparison switched off, 1 render per character (the name field only). Sign-in worked and Sign in enabled only once both fields were filled. Typecheck, lint and all 374 tests pass (one existing lint warning).
