# Widgets, reminders and Live Activities

Shipped in 1.5.0 (`src/glances/`) and checked by the owner on real phones (08.11.2026); what is still missing is under [Not built yet](#not-built-yet). The decision and its reasons are in [0015](adr/0015-glances-from-the-offline-copy.md). A **glance** is anything that shows collection data outside the open app: a home-screen or lock-screen widget, a local notification (a reminder), or an iOS Live Activity. Every glance is computed on the phone from the offline copy and works offline. There is no remote push.

## Which collection a glance follows

The **focus collection**:

1. the current collection (its phase is current), or
2. the next upcoming collection, otherwise.

Both use `collectionPhase` and the same order as the Home feed (`src/data/homeFeed.ts`). If two collections are current, the one Home features wins. A configurable widget (iOS 17+) can pin one collection instead. The focus collection's detail is already prefetched as one of the two next likely collections, so glances add no request. Archived collections never become the focus collection.

"Today" and "tonight" follow `viewToday` (`src/data/selectors.ts`): the zone of tonight's lodging, falling back to the collection time zone. Every time a glance shows is formatted in the zone of the object it belongs to, and gets a zone suffix when that zone differs from today's zone ("08:42 Frankfurt").

## When glances are recomputed

`src/glances/compute.ts` holds pure functions of the cached data and `now`: `focusCollection`, `widgetGlances` / `widgetTimeline`, `computeReminders` and `travelActivity`. They are tested against the anonymised sample (`src/glances/__tests__`). `useGlances` (mounted in the root layout) runs them:

- after a collection's detail is written to the persisted cache (a fetch, a refetch after an edit, or cache restoration at start),
- when the app comes to the foreground,
- after a relevant setting changes (language, reminder and Live Activity settings),
- at sign-out, with an empty result.

It then:

- writes the widget snapshot (Android) or a timeline (iOS, with entries at each change point such as check-in, departure or midnight in today's zone),
- reconciles reminders (`src/glances/notifications.ts`): it cancels those whose source, time or text changed or disappeared and schedules new ones. Each reminder's identifier is `glance:kind:objectId:instant`, and only identifiers with that prefix are touched,
- starts, updates or ends the travel-day Live Activity (`src/glances/surfaces.ios.ts`).

The platform files `surfaces.ios.ts` and `surfaces.android.ts` import the widget layouts, which registers them. `surfaces.ts` is the no-op for web and tests.

A later option is a background task (`expo-background-task`) that refetches the focus collection now and then. That is a separate step, because it adds network use outside the app.

## Widgets

| Widget        | Sizes                                         | Shows                                                                                                                                                 | Tap opens                      |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Next**      | Small, medium; lock-screen rectangular/inline | Before the collection: cover photo, name, "in 12 days". During it: the next one or two items of the day (visit, check-in, departure) with their times | The focus collection, on today |
| **Today**     | Medium, large                                 | Today's day plan: up to 5 itinerary entries, the visited state, and tonight's lodging at the bottom                                                   | The day view                   |
| **Tonight**   | Small, medium                                 | Tonight's lodging: name, address, check-in time                                                                                                       | The lodging, offline           |
| **Departure** | Small, medium; lock-screen rectangular        | The next transportation: type icon, origin → destination, departure and arrival times, each in its own zone                                           | The transportation             |
| **Countdown** | Lock-screen circular/inline                   | "12 d" before the collection, "Day 4/10" during it                                                                                                    | The focus collection           |

Later candidates: two clocks (home zone and today's zone), checklist tick-off (iOS 17+ interactive; checklist edits can now wait offline in the outbox of [0016](adr/0016-offline-edits-through-an-outbox.md), which a widget tick could use), world statistics, "on this day" photos from past collections, a mini-map of today's locations rendered into `widgetsDirectory`.

Rules:

- **Photos:** only the focus collection's cover, as a small JPEG written to `widgetsDirectory`, never a server URL (the widget has no API key and maybe no network).
- **Empty states:** "No upcoming collection" with a tap to open the app. When signed out, the widget shows nothing personal.
- **Freshness:** if the last sync of the focus collection is older than 24 h and the collection is current, the widget shows "As of {time}".
- **Appearance:** light and dark follow the system (`environment.colorScheme`), with the teal accent and system fonts from [DESIGN.md](../DESIGN.md). Widgets follow the system text size, not the app's text-size setting ([0012](adr/0012-app-wide-text-size.md)), because the widget runtime doesn't share it.
- **Language:** the app's language setting, applied at compute time. A language change recomputes.
- **Platform scope:** Android gets Next, Today, Tonight and Departure as resizable home-screen widgets. Android has no lock-screen widgets or timelines, so its snapshot updates at each recompute only.

## Reminders (local notifications)

| Reminder          | Default | When                                                                                                   | Text (example)                                   | Actions            |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------ |
| Collection starts | On      | 18:00 the day before the start, in the collection time zone                                            | "Kyoto starts tomorrow."                         | Open               |
| Offline readiness | On      | 2 days before the start, only if images, attachments or map areas of the collection are not downloaded | "3 PDFs and 14 photos aren't on this phone yet." | Download now       |
| Departure         | On      | 3 h before each transportation (1 h for local transport types)                                         | "Train to Osaka at 08:42 (Kyoto)"                | Open, Open in Maps |
| Check-in          | On      | 2 h before each lodging's check-in                                                                     | "Check-in at Hotel Sakura from 15:00"            | Open, Open in Maps |
| Check-out         | Off     | 08:00 on the check-out day, in the lodging's zone                                                      | "Check-out today by 11:00"                       | Open               |
| Scheduled visit   | Off     | 30 min before each timed visit                                                                         | "Fushimi Inari at 09:00"                         | Open               |
| End of day        | Off     | 21:00 in today's zone, if today has unvisited locations                                                | "Mark today's visits as visited?"                | Open the day       |

Rules:

- **Permission:** asked only when the user first turns a reminder on in Settings, or from a one-time card on a current or upcoming collection. Never at launch. Android 13+ needs `POST_NOTIFICATIONS`, plus a channel created before the request.
- **Settings:** Settings → Reminders holds a master switch and one switch per reminder kind. Settings stores are device-local (`src/settings/store.ts`), like the map-app preference.
- **Android channels:** one channel per kind (Departure, Check-in and check-out, Collection, Visits), so the system settings can silence each one.
- **Lock-screen privacy:** reminder text never contains booking numbers, prices or attachment names. iOS uses a summary placeholder when previews are hidden.
- **Limits:**
  - iOS keeps only 64 pending notifications, so the app schedules the soonest 50 and tops up on each recompute.
  - Android exact alarms are optional. Without them, delivery is "best effort", and a few minutes' drift is acceptable for these offsets.
  - Reminders whose instant has passed are never scheduled.
- **Opening a reminder:** a tap opens the object through its deep link, on the offline copy. "Download now" starts the existing collection download (`useCollectionOffline`). If the action needs a connection the phone doesn't have, the collection opens with the usual offline note.
- **Collaborators:** reminders and widgets cover collections the user owns or collaborates on. Public collections opened only by link are never included.

## Live Activities (iOS)

**Travel day.** This covers the hours around a transportation.

- **Before departure:** a countdown to departure with origin → destination and the departure time in its own zone.
- **After departure:** the arrival time in its zone.
- **After arrival:** "Arrived", and the activity ends 30 min later.
- **Expanded view:** both times, the transportation type and number (flight or train number from the name), and tonight's lodging.
- **Compact and minimal views:** the type icon and the countdown.

Countdowns use the system's timer text (`Text timerInterval`), so the activity stays right without updates, which the app can't send while closed. Its stale date is the arrival + 30 min; once stale, it shows "Arrived". The app can only start one while it is in the foreground, so it starts it whenever it is opened inside the window (12 h before departure until arrival + 30 min) and Settings → Reminders → "Travel day on the Lock Screen" is on (default on), or the user pinned a transportation with "Show on Lock Screen". The Departure reminder brings the app to the foreground three hours ahead, which starts it.

A different transportation ends the running activity and starts a new one. Leaving the window, turning the setting off, or signing out ends it.

**Later:** day progress ("Location 3 of 6, next: …"), progress for a running offline-map download, a check-in window on arrival day. Each must fit within the system's limit of about 8 h active (plus 4 h on the lock screen).

**Android** has no equivalent in this proposal. An ongoing notification for a travel day ("Live Updates" style) is an option after the module's Android custom-notification API is checked.

## Remote push (not in scope)

These need a relay that polls AdventureLog for each user and sends through APNs/FCM: invites, changes by a collaborator, a silent refresh before a collection starts, server-driven Live Activity updates. A relay would see collection content and need each user's API key, or a server change. It needs its own ADR before any work starts. The store privacy labels and the privacy policy in `site/` would change too.

## Build and release

- The plugins are configured in `app.json`:
  - `expo-widgets`: four widgets (`NextWidget`, `TodayWidget`, `StayWidget`, `DepartureWidget`) and `enableAndroid: true`. The App Group defaults to `group.<bundle id>`, so staging and production get separate groups. The extension target is `<bundle id>.ExpoWidgetsTarget`; both identifiers and the App Group must exist in the Apple developer account (Xcode's automatic signing registers them on the first signed build).
  - `expo-notifications`: `enableRemoteNotifications: false` (no APNs entitlement), the monochrome icon and the teal colour.
- Widget layouts live in `src/glances/widgets/*.ios.tsx` (SwiftUI) and `*.android.tsx` (Jetpack Compose). They run in the widget runtime: no imports at runtime, nothing from module scope, no hooks. They get everything as props (`src/glances/types.ts`).
- This is a native change, so `version` gets bumped and new builds follow [RELEASING.md](RELEASING.md). Glance content and timing can change over the air afterwards, as long as props stay compatible with the widget bundles in the binary.
- New UI text goes through `tr()` in de/en/ja, including every string passed to a widget or reminder.
- Store forms: no new data collected (everything stays on the device). The privacy policy gets a sentence about widgets and reminders.

## Verification

- Unit tests (`src/glances/__tests__/compute.test.ts`, passing): the focus collection choice, zones (Frankfurt/Tokyo times), what is still ahead today, the timeline, reminder timing per kind, a moved transportation getting a new id, the 50-reminder cap, the travel-day window, and that no widget or reminder contains a reservation number. A DST-change case is still missing.
- Done 07.11.2026:
  - **Builds:** iOS simulator (with the `ExpoWidgetsTarget` extension) and Android debug both build.
  - **Android emulator, signed in with fictional data:** turning on reminders asked for the notification permission and scheduled 22 reminders. Android gives each inexact alarm up to a one-hour delivery window. The Next widget, added from the launcher, showed the cover photo, "Day 3 of 20", the collection name and today's remaining locations.
  - **iOS simulator:** the app starts, with no keychain error in an ad-hoc signed build. Signed-in checks were not possible: the provided test key was rejected by the server (401).
- Still open:
  - iOS widgets, the collection picker, reminders and the Live Activity with data;
  - a reminder firing with the app closed, and its buttons;
  - the other Android widgets, dark mode, large text, TalkBack/VoiceOver;
  - a signed build on a phone, which also registers the App Group.
- Widget gallery names and descriptions follow the phone's language. `app.json` holds the English text (the fallback for other languages, as in the app); `plugins/with-widget-languages.js` adds German and Japanese from `plugins/widget-languages.json` as `Localizable.strings` in the iOS widget extension and `values-de` / `values-ja` resources on Android. Prebuild fails when a widget string has no German or Japanese text. The widget contents themselves follow the app's language setting, since the app writes them.
- Device checks on both platforms: add each widget, airplane mode, restart the phone, and confirm the widgets still show; let a reminder fire with the app closed; change a lodging time online and confirm the reminder moves; sign out and confirm widgets empty and reminders are gone; light/dark mode, large system text, VoiceOver/TalkBack; German, English and Japanese.
- iOS: start a travel-day Live Activity, lock the phone, check the Dynamic Island and the lock screen, and let it end on arrival.

## Also built

- **Cover photo** in the Next widget (medium size on iOS, a strip on Android). `src/glances/cover.ts` copies the cached cover, or the first location photo, as a 600 px JPEG into `widgetsDirectory`. Without a cached photo there is none: widgets have no API key. On a clear or tinted Home Screen the photo stays full color (`widgetAccentedRenderingMode`); otherwise iOS paints the opaque JPEG as a solid white block.
- **Reminder action buttons.** "Open in Maps" on reminders with a place (departure point, lodging, location; it follows Settings → Maps), and "Download now" on offline readiness. "Download now" opens the collection, which downloads its files by itself within 45 days of the start.
- **"Show on Lock Screen" button** on a transportation (iOS), shown until 30 min after arrival. It pins that transportation (`src/glances/pinnedTravel.ts`): it shows from now on, wins over the automatic choice, and shows even with the automatic Live Activity turned off. It unpins itself after arrival.
- **Collection picker** for Next and Today on iOS 17+ (long-press → Edit Widget). It offers "Automatic" plus every current or upcoming collection on the device; the props carry each of them (`Pickable` in `src/glances/types.ts`).
- **Android widget taps** open the app, like `widgetURL` on iOS. `expo-widgets` 58 can't do this: on Android, only a `Button` with a `target` is tappable, and its tap reaches the app only as an event while the app is running. `patches/expo-widgets+58.0.27.patch` (applied by `patch-package` on `postinstall`) makes the widget root open the string `url` prop as a deep link through Glance's `actionStartActivity`, limited to this app's package. Re-check the patch on every Expo SDK upgrade, and drop it once the module can open the app itself.
- **Row links:** each row of the Next and Today widgets opens its own location, lodging or transportation. iOS uses SwiftUI `Link` (medium and large sizes; the small size has only the widget's link). On Android, the same patch makes a `Row` or `Column` with a string `url` prop open it. Checked on the Android emulator: a Today row opened its location.
- **Buttons inside widgets** that work with the app closed (iOS 17+ and Android). The button's `onPress` runs in the widget runtime and returns new props:
  - **Departure:** "Next" steps through the next five transportations. The tap target follows the item shown.
  - **Today:** "Tomorrow" / "Today" switches to tomorrow's plan, when tomorrow is a day of the collection.
  - The app resets both on its next update.
  - Checked on the Android emulator. iOS is untested.
- **Privacy policy:** sections 5 and 6 of `site/*/privacy.html` cover notifications and the shared widget folder.

## Not built yet

- **Gallery previews before the first launch** (`ios.initialLayout`).

## Open questions

- Whether the Android custom-notification API in `expo-widgets` is enough for a travel-day ongoing notification.
- Whether one widget per kind or one configurable "Unterwegs" widget with a mode picker reads better in the widget gallery.
