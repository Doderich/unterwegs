# Unterwegs – Features and differences to the website

State: 05.11.2026 · What's next: [ROADMAP.md](ROADMAP.md) · Server facts: [SERVER.md](SERVER.md)

Unterwegs is the phone app for one part of AdventureLog: **using a collection while travelling**. It reads everything about a collection and works offline. With a connection it can also plan and change a collection completely: create and edit locations, lodging and transportation, photos and files, the day plan, and the collection itself. Beyond the collection it shows statistics, a map of all locations, visited countries and regions and a calendar, and it manages sharing, categories and Immich photos.

Core UI has been exercised on Android/iOS emulators and physical phones against AdventureLog v0.13.1. Verification varies by feature; the current [testing matrix](ROADMAP.md#verification-as-of-05112026) separates live, simulator and mocked checks. Release identifiers live in [RELEASING.md](RELEASING.md#current-release).

## What the app does

### Sign-in and account

| Feature                          | Notes                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Sign in with SSO                 | System browser sheet with the server login page; private WebView fallback when that page is unavailable                           |
| Sign in with username / password | Including the authenticator-code step. Only shown when the server allows passwords (the owner's server enforces SSO)              |
| QR code                          | Scans the website's "Handy Anmeldung" code; shows the server and signs in after confirmation (HTTPS only)                         |
| API key                          | Paste a key created on the website                                                                                                |
| HTTPS help                       | "Kein HTTPS?" help: Tailscale, a domain with Caddy, or an own certificate (Android trusts user-installed ones)                    |
| Sign out                         | Optionally deletes the app's key on the server ("Abmelden und Schlüssel löschen"); asks whether to keep downloaded files and maps |

The app only ever stores one API key per device (secure storage); passwords and sessions are not kept.

### Account administration

Settings → "Konto verwalten": edit username, first/last name, public profile, measurement system, default currency and website date format. Making a profile private explicitly warns that the server removes shared-collection memberships and pending invites. API keys can be listed, created (the full key is shown once, never persisted in the query cache) and revoked; revoking this device's key signs it out. A full account ZIP can be exported. Non-staff users can delete their account after entering their username, password when required, and a final destructive confirmation.

Password/MFA, email management, backup restoration and (for staff) server administration open the corresponding server settings tab in the system browser. These browser links are current implementation gaps, not permanent product exclusions. Email/MFA endpoints rejected the app key in live checks; backup restoration uses a separate API-key-capable endpoint that still needs native UI. Staff endpoints need a separate API audit. Account writes need internet.

### Home and app navigation

The app opens on Home, with Collections, Places and World as its other app-level tabs. Home combines current and upcoming collections with scheduled location visits in date order, followed by recently saved places. A smaller photo card features the next relevant collection. Invitations lead to the collection list. Settings stays in the header. Collection terminology is consistent across German (Sammlung), English and Japanese.

Opening a collection pushes a separate workspace; only one tab bar is visible. On iOS, Plan combines day view and all-days overview, alongside Map, Stays, Notes and detached native Search. Android has Plan, Map, Stays and Notes with header search; Plan uses a native Material segmented control to switch between day view and all-days overview. Back returns to the previous app tab. Collection search only shows contents of the open collection. iOS uses the system search field at the bottom; global Search sits beside the app tab bar.

Places browses the location library with native iOS navigation search or an Android top search bar opening a dedicated search view, filters for collection-free/visited/unvisited places and a map link. A location can be created without a collection, edited, opened offline, given scheduled visits and added to a collection later while preserving other memberships. Its metadata is persisted; opening it downloads photos and attachments into the existing file cache. Collection screens continue to read from the collection endpoint. These standalone detail/edit screens cover basic fields and visits; collection location screens retain the richer trails/activity/media-editing tools.

### Reading a collection

| Screen                  | Content                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Collections**         | Own and shared collections, current first, then upcoming, then past. The Home feed owns the featured photo card; this tab lists all collections and their dates. Pull to refresh                                                                                                                                                   |
| **Heute**               | One day: a strip of day chips (the selected day filled, today marked with a dot) above the day; the programme in itinerary order with photo thumbnails and times first; "Heute Nacht" with which night of the stay it is (check-in, night n of m, check-out tomorrow); the day's notes. Swipe, tap a chip or pick from "Alle Tage" |
| **Tage**                | The whole itinerary, day by day, with the same rows and thumbnails as "Heute"                                                                                                                                                                                                                                                      |
| **Karte**               | Locations, lodgings and transportation start / end points by colour, dashed route lines, day filter, preview card, "In Karten öffnen"                                                                                                                                                                                              |
| **Unterkünfte**         | All lodgings with dates, nights, type, address and a price total                                                                                                                                                                                                                                                                   |
| **Notizen**             | All notes and checklists of the collection                                                                                                                                                                                                                                                                                         |
| Lodging detail          | Photo gallery and name, then arrival first: check-in / check-out in the lodging's time zone with the nights, address (opens the maps app), booking number (tap to copy), website; then rating, price, description, attachments                                                                                                     |
| Transportation detail   | Service and number as the title, a compact photo strip, then the journey: departure and arrival time, place with code, date and zone each in its own time zone, travel time, "+1 Tag" on later arrival; maps for both ends, flight / train number (copy), booking link, rating, price, attachments                                 |
| Location detail         | Photo gallery and name first, then planned days and visits, address and maps, trails (name and link), activities of the visits (sport, distance, duration, climb; GPX track kept offline), sunrise and sunset on the planned days, rating, description and link, tags, attachments                                                 |
| Note / checklist detail | Markdown text, links, ticking items                                                                                                                                                                                                                                                                                                |
| Attachments             | PDFs and files open in the system viewer or share sheet                                                                                                                                                                                                                                                                            |

### Editing

The collection header has “+” and “…” actions. “+” follows the current tab: the selected day on Heute, a day picker on Tage, a location on Karte, lodging/transportation on Unterkünfte, and notes/checklists on Notizen. Day-specific menus also open the editor for adding existing collection items. iOS 26+ native tabs are configured to minimize when scrolling down and expand when scrolling back up; device verification is pending.

| Area                        | What works                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checklists                  | Tick / untick, add, rename and delete items, create, rename and delete checklists                                                                                                                                                                                                                                                                                                               |
| Notes                       | Create (also directly on a day), edit name, Markdown text, links and date, delete                                                                                                                                                                                                                                                                                                               |
| Day plan ("Tag bearbeiten") | Edit day name and description; add locations, lodging, transportation, notes and checklists to the day (also from "Noch nicht eingeplant"); move up / down; move to another day; remove from the day (the object stays in the collection); fill an empty plan from the objects' dates                                                                                                           |
| Locations                   | Create from search, the current position or the map; edit name, category, address, link, description (also from Wikipedia), tags, price; rating; visits with date, time, zone and note; trails; activities with an optional GPX file; duplicate; delete. A new location is first checked against all your locations: a likely duplicate can be opened or taken over into the collection instead |
| Lodging, transportation     | Create, edit and delete, with check-in / check-out and departure / arrival typed in their own time zone; price, rating                                                                                                                                                                                                                                                                          |
| Photos and files            | Photos from camera or library, from Wikipedia (locations) or an image address, cover image, delete; attach files, rename and delete them; PDFs and photos shared from other apps into a collection                                                                                                                                                                                              |
| Collection                  | Create (also from a ZIP export), edit name, dates and description, duplicate, archive, delete; leave a shared one                                                                                                                                                                                                                                                                               |

Locations, lodging, transportation and notes have their own "Öffentlich" switch (making the collection public or private still sets it for everything in it). Someone else's public collection opens read-only.

Collection edits generally update optimistically, roll back on failure and reload the collection from the server. Collection-level actions, account and integration writes confirm through the server and refetch the affected queries. Without internet the edit controls are hidden or show "Bearbeiten geht nur mit Internet."

### World

In the World tab: statistics (locations and how many were visited, collections, countries / regions / cities visited), a map of all locations from every collection (visited ones green), visited countries, and all countries with search. A country lists its regions, also on a map coloured by visit; a region with cities opens them (list and map), and regions and cities are marked visited or not with a tap (online only). "Aus meinen Orten markieren" marks the regions and cities of all visited locations. Everything opens offline with the last loaded data.

### Sharing, categories, calendar (mostly online)

| Area        | What works                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export      | "Reiseplan als PDF" (the server's printable day-by-day plan, opened in the system viewer) and "Exportieren (ZIP)" (the collection with its files, into the share sheet) in the collection menu                                                                                                                                                                                                                                        |
| Share image | "Als Bild teilen" in the collection menu and on a location: the server's share card (square, story; landscape for locations) into the share sheet                                                                                                                                                                                                                                                                                     |
| Sharing     | "Teilen" in the collection menu (owner): invite people with a public profile, withdraw invites, remove collaborators, make the collection public (with a link to share). Collaborators can leave                                                                                                                                                                                                                                      |
| Invites     | Invites to you appear on the collections list: accept or decline                                                                                                                                                                                                                                                                                                                                                                      |
| Archive     | Archived collections are listed under "Archiv", open like any other and can be restored from their menu                                                                                                                                                                                                                                                                                                                               |
| Categories  | Create, rename (name and emoji) and delete location categories; usage count per category                                                                                                                                                                                                                                                                                                                                              |
| People      | "Leute" on the world screen: everyone with a public profile; a profile shows its statistics, public collections (open read-only) and public locations                                                                                                                                                                                                                                                                                 |
| Calendar    | All collections as an agenda: trips, transportation, lodging, visits and dated notes, each in its own time zone; opens the detail screens. "Exportieren" hands the server's `.ics` file to the phone's calendar (a one-time import, like the website's download)                                                                                                                                                                      |
| Search      | The native detached iOS search tab, or Android header magnifier opening a Material-style search view with native text entry, Back and Clear: collections, standalone/collection locations, lodging, transportation, notes, checklists (incl. items) and countries, ignoring case and accents, with photo thumbnails. Runs on the phone, so it works offline; online it first loads every collection (data only) so nothing is missing |
| Nearby      | "In der Nähe entdecken" on a location: sights, food or lodging within 5 km (the server's recommendations); add one as a location (quick-add with its photos and types) or as a lodging, open it in maps. Online only                                                                                                                                                                                                                  |
| Immich      | "Foto aus Immich hinzufügen" on a location: search the Immich library or open an album, tap a photo                                                                                                                                                                                                                                                                                                                                   |

### Managing integrations

Settings → "Integrationen verwalten" (also in account settings): connection status, native Immich and Wanderer connect/edit/disconnect forms, Immich's copy setting, Endurain sign-in with MFA when requested and disconnect, and Strava connect/disconnect. Strava approval appears inside the app and returns to the native settings; its real OAuth flow still needs checking with server credentials configured. Disconnecting asks for confirmation; the Immich warning explains that photos linked only from Immich may stop loading. Integration credentials are omitted from the persisted cache and existing keys are never prefilled.

Google Maps status and Strava server prerequisites are shown; their environment credentials have no management API. Integration setup needs internet and applies to the account on every device. Importing activities/trails remains separate work.

### App settings

Language (System / Deutsch / English), theme (System / Hell / Dunkel), text size (System, Klein … Riesig), bold text, more contrast, reduce motion, haptic feedback. Plus: offline storage used, "Offline-Daten löschen", sign out.

Settings → Maps chooses the preferred app for every “Open in Maps” action: platform default (Apple Maps on iOS, the `geo:` handler on Android), Apple Maps on iOS, Google Maps, Organic Maps or OsmAnd. The preference is saved on this device. Organic Maps and OsmAnd need to be installed; launch failures show a settings hint. Google/Apple HTTPS links can open the provider's website if the app is unavailable. OsmAnd's iOS coordinate link requires coordinates; address-only entries explain choosing another provider instead of opening a false location.

## Only in the app

- **Offline:** the collection data, all images and all PDFs are stored on the phone. The app shows when the data was last loaded ("Stand: …", "Offline · …") and never shows an error screen when cached data exists. Everything inside a collection can be edited offline (plan, places, stays, connections, visits, trails, activities, notes, checklists, photos, files, the collection's settings); edits wait on the phone and are sent when the connection is back. A field someone else changed meanwhile keeps their value, a note changed on both sides is kept as a copy (ADR 0016). Map tiles that were viewed once are cached too. From a collection's map, "Offline-Karten" downloads a collection overview or a detailed area around a location/lodging, with progress, downloaded size, pause/resume and deletion. Downloads include the light style, tiles, fonts and sprites; offline collection maps use that light style. Large areas automatically get a lower detail level; the planner targets 128 tiles to keep downloads practical, below OpenFreeMap's 3,000-tile allowance. A download pauses at 45 MiB with a prompt to choose a smaller area, leaving headroom below the 50 MB allowance. Download detailed areas separately when needed. Native packs can be evicted by the OS under storage pressure: check download status before travelling. Included in the released 1.3.0 native builds; a 1.2.0 OTA update cannot add this capability.
- **Sunrise and sunset offline:** computed on the phone instead of asking the server.
- **Search offline:** over the offline copy instead of the server's `/api/search`, which only finds your own objects (not those in collections shared with you) and can't tell which collection a location is in. Regions, cities and users aren't searched.
- **Time-zone suggestions:** selecting a lodging address or transportation endpoint suggests a coordinate-based zone offline; it stays editable. The compact lookup is approximate near borders and only suggests zones the server accepts.
- **Time zones done per object:** each time is shown in the zone of its own lodging or transportation (e.g. departure in Frankfurt time, arrival in Tokyo time), and "Heute" follows the zone of that night's lodging (falling back to the collection's zone), never the phone's.
- **Phone actions:** tap to copy booking numbers, addresses open in the maps app, booking links open in the installed airline / hotel apps, native share and PDF viewers.
- **Native controls and accessibility:** Material 3 on Android, SwiftUI on iOS, dark mode, app-wide text size and bold text independent of the system, high contrast, reduced motion, haptics. On wide Android screens (tablets, unfolded foldables) lists are centred at a readable width.
- **English and Japanese UI** next to German, chosen per device ("System" follows the phone's language). Dates use each language's own format (`17.12.` · `17 Dec` · `12/17(木)`).

## Differences in features both have

| Feature         | Website                                                   | App                                                                                                 |
| --------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sign-in         | Session in the browser                                    | One API key per device, created by any of the four sign-in methods                                  |
| Itinerary order | Drag and drop, "unscheduled" list                         | Up / down and "Auf anderen Tag" actions, "Noch nicht eingeplant" list                               |
| Collection list | All collections, including archived and public ones       | Own, shared and archived collections; other people's public collections open through their profiles |
| Map             | World map of all locations, regions and cities as markers | Map of one collection, of all locations, of a country's regions and a region's cities               |
| Conflicts       | —                                                         | Last write wins; the collection reloads after every edit                                            |

## Remaining website workflows

Compared endpoint by endpoint with the pinned server's schema ([api/](api/README.md)).

Native features still missing:

- Importing activities from Strava/Endurain and trails from Wanderer. Integration management is implemented separately.
- Native account backup restoration and staff administration; these currently open website settings.
- Native password/MFA and email management; allauth session support or server changes are needed for the endpoints that reject the app key.

Website-session workflows exposed through the app:

- MFA/password, email, backup restoration and staff server administration (browser links from account settings). Billing remains website-only. Google Maps and Strava client credentials are configured in the server environment, with no management API.

What still needs checking on real phones: [ROADMAP.md → Next](ROADMAP.md#next), step 1.

## Known reliability limits

The UI for web photos and nearby recommendations is implemented, but Wikipedia image lookup/import has returned server errors and Overpass has timed out or reported capacity problems. Account deletion, account-backup restoration, real integration credential changes and Strava OAuth have not been exercised end-to-end against disposable live accounts. See [ROADMAP.md](ROADMAP.md#next) before treating these as verified.
