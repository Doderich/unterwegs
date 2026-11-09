---
name: Unterwegs
description: The family's trip in your pocket, native on Android and iOS, offline first.
colors:
  teal: '#2F7672'
  teal-night: '#5FB3AE'
  teal-deep: '#1D5C59'
  teal-bright: '#8FD3CD'
  teal-seed: '#428E8B'
  apricot: '#FDBA74'
  apricot-ink: '#B45309'
  apricot-ink-deep: '#92400E'
  apricot-soft: '#FED7AA'
  teal-wash: '#E4F1EF'
  teal-wash-night: '#15302E'
  location-blue: '#2563EB'
  lodging-terracotta: '#C2410C'
  transit-violet: '#7C3AED'
  visited-green: '#059669'
  alarm-red: '#D70015'
  alarm-red-night: '#FF6961'
  alarm-red-deep: '#A50011'
  alarm-red-soft: '#FF9F99'
  grouped-mist: '#F2F2F7'
  card-white: '#FFFFFF'
  ink: '#000000'
  pebble: '#3C3C4399'
  pebble-deep: '#3A3A3C'
  hairline: '#C6C6C8'
  hairline-strong: '#8E8E93'
  night: '#000000'
  night-card: '#1C1C1E'
  moon-grey: '#EBEBF599'
  moon-grey-bright: '#D1D1D6'
  night-hairline: '#38383A'
  night-hairline-strong: '#636366'
typography:
  figure:
    fontFamily: 'SF Pro (iOS), Roboto (Android): system font'
    fontSize: '28px'
    fontWeight: 600
  title:
    fontFamily: 'SF Pro (iOS), Roboto (Android): system font'
    fontSize: '22px'
    fontWeight: 600
  body:
    fontFamily: 'SF Pro (iOS), Roboto (Android): system font'
    fontSize: '17px'
    fontWeight: 400
  label:
    fontFamily: 'SF Pro (iOS), Roboto (Android): system font'
    fontSize: '13px'
    fontWeight: 400
rounded:
  image: '12px'
  floating: '16px'
  frame: '24px'
  hero: '28px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  xxl: '24px'
components:
  hero-card:
    backgroundColor: '{colors.teal}'
    textColor: '{colors.card-white}'
    rounded: '{rounded.hero}'
    padding: '24px'
    height: '46% of the window, 320–560px'
  hero-badge:
    backgroundColor: 'rgba(255,255,255,0.22)'
    textColor: '{colors.card-white}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '4px 12px'
  hero-stat-chip:
    backgroundColor: 'rgba(255,255,255,0.18)'
    textColor: '{colors.card-white}'
    rounded: '{rounded.pill}'
    padding: '4px 12px'
  list-row:
    backgroundColor: '{colors.card-white}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  list-row-night:
    backgroundColor: '{colors.night-card}'
    textColor: '{colors.card-white}'
    typography: '{typography.body}'
  photo-row:
    backgroundColor: '{colors.hairline}'
    width: 'the row'
    height: 'half the row width, 150–280px'
  detail-gallery:
    backgroundColor: '{colors.hairline}'
    height: 'a third of the window, between 4:3 and 16:10 of its width (transportation: 2:1)'
  day-chip:
    backgroundColor: '{colors.card-white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.floating}'
    padding: '8px 12px 0'
    width: 'min 56px'
  day-chip-selected:
    backgroundColor: '{colors.teal}'
    textColor: '{colors.card-white}'
    rounded: '{rounded.floating}'
  map-filter-bar:
    backgroundColor: '{colors.card-white}'
    rounded: '{rounded.floating}'
---

# Design System: Unterwegs

## Overview

**Creative North Star: "The Travel Wallet"**

Everything for the trip in your pocket, calm and always to hand. Unterwegs is opened on a platform, at a hotel desk or in a temple without signal, by people who know their phone but not this app. So the design is calm, native and quietly warm: the platform's own controls (SwiftUI on iOS, Material 3 on Android) do most of the work, and personality comes from one accent, the teal of the app icon's hills, and the trip's own photos. It is flat and layered, not decorative, and nothing competes with the information you need right now.

Density is that of a system settings screen: grouped lists of rows, each row one fact with a tinted icon (or an emoji the user chose), a value and a secondary line. The one exception is the collection hero (`CollectionHero`) on the home screen, a full-bleed photo card that is the app's only "loud" moment. On a wide card (iPad, landscape) it shows as many of the collection's photos side by side as fit at least 380px each, up to four (the cover first, then the places' photos), instead of stretching one across the window.

**Direction: playful, from the trip itself.** The owner asked for more character and for looking back to feel like a pleasure rather than a record. The character comes from the trip, never from decoration on top of the native controls: your own photos (memory cards, the day's photo strip), time (apricot countdowns, "Noch 5 Mal schlafen!", "Als Nächstes in 25 Min."), places (passport stamps) and a few real milestones (a check that pops when a list is done). Copy is warm and short ("Nichts geplant – Zeit zum Treibenlassen."). Everything stays within the accessibility rules below; every flourish has a reduce-motion and screen-reader path.

**Key Characteristics:**

- Native grouped lists on a grey background; white (or near-black) rows.
- Two accents with separate jobs: Teal for icons, the selected state and actions; Apricot for time and what's next.
- The trip's photos carry the colour; the chrome stays neutral.
- Every text size follows the system and the app's own text-size setting.
- Light, dark and a "Mehr Kontrast" palette for each.

## Colors

A neutral canvas in the platform's own colours with one teal accent; colour beyond that comes from photos and the map's three point types. `useColors()` (`src/ui/theme.ts`) takes them from the Expo libraries rather than a hand-made palette: on iOS Apple's system colours (Expo Router `Color.ios`, `src/ui/palette.ts`), on Android the Material 3 scheme Expo UI derives from the teal seed (`useMaterialColors` with `seedColor`, `src/ui/palette.android.ts`). The accent values live in `src/ui/accent.ts`.

### Primary

- **Teal** (`teal`): the app's single accent, the icon's hill teal darkened to 5.3:1 on white. Leading icons in every list row, the native tab and toolbar tint, the selected day ("Heute"), checkmarks in pickers, and the hero card's background before its photo loads.
- **Teal Night** (`teal-night`): the same role in dark mode (6.9:1 on the night card).
- **Deep Teal** (`teal-deep`) and **Bright Teal** (`teal-bright`): the "Mehr Kontrast" accent in light and dark mode (≥ 7:1).
- **Teal Seed** (`teal-seed`): the icon's own hill colour. Android builds its whole Material 3 scheme from it (accent, surfaces, containers, outlines, error), the same on every phone and independent of the wallpaper; with "Mehr Kontrast" the accent there is Deep Teal / Bright Teal.
- **Apricot** (`apricot`): the second accent, for time and what's next. On photos (hero countdown, "vor 2 Jahren" on memory cards) the icon's own apricot over the dark scrim; on light surfaces **Apricot Ink** (`apricot-ink`, 5:1 on white; contrast mode `apricot-ink-deep`), in dark mode Apricot itself (contrast mode `apricot-soft`). Used for the countdown on upcoming collections, "in 25 Min." on the Als-Nächstes card. In code: `colors.next` (`nextAccent` in `accent.ts`).
- **Teal Wash** (`teal-wash` / `teal-wash-night`; Android: `primaryContainer`): the background of the one card that leads a screen (Als Nächstes, the passport page). Text on it keeps the normal text colours. In code: `colors.wash`.

### Secondary

- **Location Blue** (`location-blue`): locations on the map.
- **Lodging Terracotta** (`lodging-terracotta`): lodgings on the map.
- **Transit Violet** (`transit-violet`): transportation start / end points and the dashed route lines on the map. With blue and terracotta, the three point types read apart at a glance, and none of them looks like the teal accent.
- On the map of all locations ("Alle Orte") **Visited Green** (`visited-green`) and Location Blue mean visited and not yet visited, explained by a legend in the floating bar.

### Tertiary

- **Alarm Red** (`alarm-red`, `alarm-red-night`, contrast: `alarm-red-deep`, `alarm-red-soft`): destructive actions (delete), errors, and the "Offline" status line.

### Neutral

- **Grouped Mist** (`grouped-mist`) / **Night** (`night`): screen background behind grouped lists.
- **Card White** (`card-white`) / **Night Card** (`night-card`): list rows, sheets, the map's day filter.
- **Ink** (`ink`) / white: primary text.
- **Pebble** (`pebble`) / **Moon Grey** (`moon-grey`): secondary lines under row values, captions, section footers. Contrast mode: **Deep Pebble** (`pebble-deep`) / **Bright Moon** (`moon-grey-bright`).
- **Hairline** (`hairline`) / **Night Hairline** (`night-hairline`): separators. Contrast mode: `hairline-strong` / `night-hairline-strong`.

On iOS the neutrals and Alarm Red are Apple's system colours (`systemGroupedBackground`, `secondarySystemGroupedBackground`, `label`, `secondaryLabel`, `opaqueSeparator`, `systemRed`); the hex values above are their light and dark defaults. They follow the system "Increase Contrast" setting by themselves, which also provides the contrast twins of the neutrals there. On Android the same roles are Material 3 roles of the teal scheme: `surface` (background), `surfaceContainerLow` (cards), `onSurface` (text), `onSurfaceVariant` (secondary; `onSurface` with "Mehr Kontrast"), `outlineVariant` (separators; `outline` with "Mehr Kontrast") and `error`.

iOS system colours reach JavaScript as `PlatformColor` objects typed as strings (`palette.ts`): pass them to styles and Expo UI, never do string work on them (alpha suffixes, parsing).

### Named Rules

**The Two Accent Rule.** Teal is the accent of actions and state; Apricot only of time and what's next (countdowns, "in 25 Min.", how long ago). Never swap them, never use Apricot for a button. Blue, terracotta, violet and green exist only to tell map points apart; they never appear on buttons, icons or text.

**The Contrast Twin Rule.** Every colour the UI uses has a "Mehr Kontrast" twin (darker in light mode, lighter in dark mode): the accent in `accent.ts`, the Android neutrals as the stronger Material roles in `palette.android.ts`, the iOS neutrals through the system "Increase Contrast" setting. A new colour is not done until its twin exists.

### App icon

A folded paper map whose panels show a sunset landscape: sand sky, cream sun, teal hills and a cream road winding towards the sun. It stands on a paper-white plate (near-black in the dark appearance, where the map turns moonlit: deep teal sky, muted turquoise hills, a sand moon and road); staging builds put it on amber. `scripts/generate-icons.py` draws it once and writes the iOS Icon Composer documents (`assets/unterwegs.icon`, `assets/unterwegs-staging.icon`), the Android adaptive and themed icons, the splash images and the favicon. The accent teal is taken from its hills.

## Typography

**Font:** the platform's system font (SF Pro on iOS, Roboto on Android). No custom fonts.

**Character:** familiar and legible; hierarchy comes from size and weight, not from a second typeface.

### Hierarchy

Four sizes and two weights (regular 400, semibold 600), nothing else. On iOS they are the Dynamic Type styles title, title2, body and footnote, so what the code says is what renders.

- **Figure** (600, 28px): the one large value on a screen: departure and arrival times in the journey summary, the collection name on the hero card.
- **Title** (600, 22px): the name on a detail page (location, lodging, transportation, note), the date heading on "Heute", the day number on a day chip, titles of bottom sheets and pickers, Markdown headings.
- **Body** (400 / 600, 17px): row values and paragraph text; 600 for the places in the journey summary and the hero's countdown.
- **Label** (400 / 600, 13px): the second line of a row, captions, section footers, the "Stand: …" status, weekday and month on a day chip, the hero's badge (uppercase, 0.8px tracking), date line and stat chips.

In code these are `typeScale` (`src/ui/typeScale.ts`: `figure`, `title`, `body`, `bodyStrong`, `supporting`, `label`; `supporting` and `label` share a size and differ only in role); use it instead of writing sizes by hand. Further hierarchy comes from colour (text vs. secondary, or white at 80% on the hero), never from a fifth size or a third weight. The bold-text setting may raise any weight; that is accessibility, not hierarchy. Widgets and the Live Activity use their platform's widget text styles. Day headings on "Tage" are Label at 600 in sentence case, not uppercase labels.

### Named Rules

**The Dynamic Type Rule.** Sizes are written as plain numbers, but on iOS `src/ui/Text` maps each to the nearest Dynamic Type style (17 → body, 15 → subheadline, 13 → footnote …), and on Android text follows the font scale. Never set a size that ignores the user's text size; React Native text outside native rows uses `rnTextScale` (see the hero's `Label`).

**The Fixed-Box Cap Rule.** Text inside a fixed-height box (the hero card) may scale at most 1.4×; everywhere else text grows without a cap and the layout grows with it.

## Layout

Single column. On phones it is full width; on wide Android windows (tablets, unfolded foldables) each screen's native list is capped at 720px and centred (`READABLE_WIDTH` in `src/ui/Host.android.tsx`). Screens are native grouped lists (`FieldGroup` sections) with the platform's own insets: 16px side margins, section headers above, footers below. Cards placed between sections (the hero) are the window width minus 32px. Every margin, padding and gap is a multiple of 4 (in practice 4 / 8 / 12 / 16 / 24px): 8px between images in a strip and between chips, 16px card and floating-control margins, 24px inner padding on the hero. Related things sit closer than unrelated ones (4px between a title and its secondary line, 8–12px inside a group, a new section after that).

A detail screen's gallery takes about a third of the window height, kept between 4:3 and 16:10 of its width, so the facts below stay in view on any screen; transportation uses a compact 2:1 strip because the journey is the focus. The hero is 46% of the window height, clamped to 320–560px, so it stays a card on small phones and the Flip 5's folded-out screen. Everything else is content height; nothing assumes a screen size. A collection opens on native tabs (Heute, Tage, Karte, Unterkünfte, Notizen) and details are pushed on the native stack. A regular-width iPad window is specified separately in [docs/IPAD.md](docs/IPAD.md); until that ships, this single column is the layout.

## Elevation & Depth

Flat, tonal layering: white rows on a grey background (or dark-grey rows on black). There are no shadows on list content. Depth on the hero comes from its photo and a gradient scrim (35% black at the top, clear in the middle, 82% black at the bottom), which also keeps white text readable on any photo.

### Shadow Vocabulary

- **Floating control** (`floatingShadow` in `src/ui/theme.ts`: 0 4px 16px, 16% of a deep teal `#0B2B29`; Android elevation 3): only for controls that float over the map (the day filter bar, the legend). Soft and tinted, never pure black.

### Named Rules

**The Flat List Rule.** Lists and sheets never get shadows; only something floating over a map or photo may.

## Shapes

Native rows and sheets keep the platform's own shapes (iOS inset grouped corners, Material 3 list-item containers). Custom shapes are soft and rounded: 20px on photo cards, 12px on the detail gallery inside an Android card (edge to edge in the iOS card), 16px on floating controls and day chips, 24px on the QR scan frame, 28px on the hero card, and full pills for the badge and stat chips. No sharp corners on custom elements, no outlined boxes.

## Components

### Hero Card (signature)

The current or next collection as a large photo card on the home screen. Full-bleed cover photo (Teal fill until it loads) under the gradient scrim; top-left a frosted pill badge (22% white) with the uppercase label; bottom: Apricot countdown in Body 600, the collection name in Figure, a date / today line in Label at 80% white, then frosted stat chips (18% white pills) for days, locations and lodgings. Pressed state: 90% opacity. One accessibility label reads name, countdown and dates.

### List Rows

The app's main building block (`src/ui/rows.tsx`): a native `ListItem` with a 22px leading icon in the accent, the value as headline, and the label as a secondary line in Pebble. Variants: info, copy (trailing copy icon; the secondary line briefly reads "Kopiert ✓" with a success haptic), link and maps (trailing external-link icon), attachment ("Wird geöffnet…" while loading). Icons come from one semantic set: SF Symbols on iOS, Material Symbols on Android (`src/ui/icons.ts`).

### Selects and Sheets

iOS: a native menu picker tinted Teal. Android: a row with the label as headline and the current value as supporting text, opening a bottom sheet with a Title heading and a checkmark on the chosen option.

### Navigation

The app opens on a compact-header Home feed. Home, Collections, Places and World form the app-level native tabs. Collection screens are pushed above that navigator as a separate workspace, with Plan, Map, Stays and Notes (plus detached Search on iOS); only one tab bar is visible. Back preserves the previous app tab. Collection means Sammlung in German UI. The existing palette, grouped rows and photo treatment remain unchanged.

Home mixes current/upcoming collections with scheduled visits by date and puts recently saved places below. Its featured collection uses a smaller cover card (30% of the window, clamped to 240–340pt); the full collection list is a compact library, not another feed. Root headers contain creation and settings instead of a large title and a separate world shortcut. On iOS, Home, Collections and World each have a native search field stacked below their navigation title, with app-wide results displayed in place. Android main screens put Search inside the scrolling content. Places retains its scoped native list search on iOS. Their header actions are Add (when available) and Settings; Home, Collections and World use the app-wide search field, while Places uses its scoped search field. Collection actions use Search, Add, More. A saved place can stand alone; no collection or visit is invented for it.

Search from the app level is global. Collection search only returns that collection’s contents; it has no global scope switch. Its iOS workspace has Plan, Map, Stays, Notes and detached Search; Plan combines day view and all-days overview through a native segmented picker. Android also combines day view and all-days overview in Plan, using a native Material segmented control at the top. Opening a result retains its collection context when available; standalone locations open their own persisted details.

Native stack with the platform's header (large title on the collections screen on iOS), native tabs inside a collection, toolbar icon buttons. Each Android main tab owns a native stack and header, with a fixed title and actions. The root app header stays hidden throughout, so the tab switch carries header and content together. Header actions retain their Material symbol views. iOS also gives every main tab its own stack/header so each native search controller belongs to the screen it searches; the outer header stays hidden on both platforms. The Home route uses a route group so its public URL stays unchanged. Headers and tab labels follow the app's bold setting; the Android header title also follows its text size. Collection tabs use the native `onScrollDown` minimize behavior on iOS 26 and later.

On iOS, Settings → Appearance → Show tab labels controls both the main and collection tab bars. Labels are enabled by default; disabling them keeps explicit full accessibility labels and persists across restarts. Android retains labels and does not show this setting.

The German iOS collections tab uses the singular label “Sammlung” so its native item does not widen around “Sammlungen”. The header and accessibility label retain the full name; Android keeps its full tab label.

### Search: platform controls and scope

**iOS rule:** every search entry uses the system search UI (`UISearchController` / native navigation search), including list filtering in Places, country/region lists and pickers. Do not put a plain text input in a grouped card to imitate search. Use system clear, cancel, keyboard and focus behavior, Dynamic Type, accessibility and the OS-provided Liquid Glass treatment where available; do not draw a glass substitute. App-wide search uses the top native search fields on Home, Collections and World; collection search keeps its detached native Search tab. Main-tab fields use stacked placement, remain visible while scrolling, and show results in place using the existing shared search implementation. Clear or Cancel restores the tab content. The detached app-wide Search button also remains at the bottom right beside the iOS tab bar, using the native search role like Apple Music. The detached button is an action: it focuses the current tab’s existing search controller without changing tabs or replacing its scope/query/filter. The native trigger prevents selection and forwards tabPress to the focused screen. Places keeps local place filtering; Home, Collections and World retain their existing app-wide field behavior. Search within a list stays attached to that screen’s native navigation bar and filters that list; it does not silently open global search. Places uses a native navigation search field above the separate filter and map rows.

**Android direction:** use Material 3 search surfaces. A frequently searched list such as Places has a search bar at the top, separate from filter rows, which opens an expanded search view on phones. Home, Collections and World use the same in-list search field to open app-wide search. Collection search opens from its top app-bar magnifier into the same search view. The expanded view has a leading Back action, a query field with clear action, the keyboard and scrollable results. System Back first dismisses the keyboard, then closes search and returns to the prior screen. Keep the app/collection navigation destinations intact; do not add a detached iOS-style search tab on Android. Use native Material controls when supported by the current Expo stack, rather than a generic form field styled as search. Main-screen search launchers live inside the same native scrolling lists as their content, using the Material surface palette; it does not sit on a separate background strip. The expanded search header uses the same Material surface as its result list. The current implementation uses a native Android text field and Material-style search controls in a dedicated route. Expo UI’s bundled full-screen SearchBar exposes submit only, not live-query/clear state, so it cannot provide this behavior directly. Device verification remains separate from implementation.

**Scope is fixed by entry point on both platforms:** app-wide Search searches all supported entities; collection Search searches only the open collection’s contents; Places search filters the location library. Placeholders name that scope. No collection search result or control switches to global search. Filters remain separate controls and continue to apply to local search results. Clearing a query restores the unfiltered list; closing search preserves the originating navigation context. Results use the cached data offline and disclose unavailable data.

Android pattern reference: [Material search component](https://github.com/material-components/material-components-android/blob/master/docs/components/Search.md).

### Resource Header and Detail Gallery

The top of every location, lodging and transportation (`resourceHeaderRows`): a swipeable gallery of the resource's photos with an "n / total" pill (capped at 1.4× text size), then the name in Title and a short context line in Label on the card's solid surface. Tap opens the full-screen gallery; "Foto hinzufügen" and the gallery's cover/delete actions stay right below. Each photo is announced as "Name, Bild n von total". Without photos the header is a 28px Teal icon beside the title, never an empty frame or a collection photo. The frame is reserved in Hairline grey before photos load and stays when one can't.

### Photo Row

Every list row for something with a photo leads with that photo across the whole row, with the name and context line below it on the card (`PhotoListItem`, `src/ui/PhotoListItem.tsx`): itinerary entries, "Heute Nacht", Tage, Unterkünfte, Home, Collections, Places, search and the map preview. The photos are what makes a place somewhere to go, so they are the row, not a thumbnail beside it. Each photo row is a card of its own, 20px corners and 12px apart, in place of the list row's background and separator, so places stand apart instead of running into one block. In a regular-width iPad window consecutive cards pair up in two equal columns (`PhotoGrid`); a row without a photo ends the run, so the order still reads top to bottom, and an odd card keeps half the width. All cards in the grid are the same size: equal width, one photo height for the row, and one line each for the name and the context line (shortened with “…”, read in full by screen readers). The photo is half as tall as its card is wide, kept between 150px and 280px. Hairline fill while loading or when the photo is unavailable, hidden from screen readers (the row's text names it). The image is the primary one, else the first (`firstImage`); without one the row is the usual native row with its tinted type icon. Images fade in over 150ms (0 with reduced motion).

### Day Strip

"Heute" opens on a horizontal strip of day chips above the swipeable days (`src/ui/DayNav.tsx`): weekday, day number, month. The day number is Title, weekday and month Label. The selected day is filled Teal (black text in dark mode, white in light, both ≥ 4.5:1); the actual current day keeps a dot, so "selected" and "today" read apart. Chips are tabs with a selected state and a full-date label ("Freitag, 18. Dezember, Tag 2 von 23, Heute"). The strip scrolls the selected day into view; a tapped day jumps without animation when motion is reduced. The "Alle Tage" picker below the date stays for long jumps.

### Itinerary Entry and Stay Summary

An itinerary entry (`entryRow`) is a list row with the thumbnail or type icon, the name, and a secondary line that starts with the time when there is one, so times line up; untimed entries simply have none. The night's lodging (`stayRow`) says which night it is: "Check-in ab 15:00", "Nacht 2 von 3", "Check-out morgen 10:00". On "Heute" it sits in its own "Heute Nacht" section and is not repeated in the programme. The lodging detail opens with the arrival block (`stayRows`): check-in, check-out with the nights, address, booking number to copy, website.

### Journey Summary

The focus of a transportation (`journeyRows`): departure time in Figure, place with code in Body 600, then date, zone and UTC offset in Label; the travel time with the transport icon between; the arrival in the same form with "(+1 Tag)" when it lands on a later local date. Each end uses its own zone, never the phone's. Stacked vertically so it holds at the largest text sizes.

### Emoji Leading

Where the user or the server chose the symbol, a row leads with that emoji instead of a Teal icon: country flags (made from the country code, so they work offline), category icons, and calendar events. Everything else keeps the tinted icon.

### Toggle Rows

Marking something on or off in a list (a visited region, "Öffentlich") is a whole-row tap with a checkbox icon: Teal when on, Pebble when off. Online only; the change shows at once and rolls back with an alert if the server refuses it.

Ticking off a checklist item gives a selection tap; ticking off the last one is the list's small peak: a success haptic, and the “n of n done” line turns Teal.

### Photo Grid

The Immich picker shows search or album results as a three-column grid of square photos, 4px gaps, 12px corners; the tapped photo dims while it is added.

### Toolbar

The collections screen has toolbar actions for a new collection and settings; World is an app tab, and app-wide search uses top native fields on iOS (Android in-list search field). A collection's toolbar has two creation/management actions: “+” for adding and “…” for export/share actions, duplication and owner settings (edit, sharing, archive/restore, delete); collaborators can leave. “+” follows the active tab: Today / Plan day view adds to the selected day, Days / Plan all-days overview first asks which day, Map offers a location, Stays offers lodging/transportation, and Notes offers a note/checklist. Day menus also link to adding existing collection items. Android shows icons only, with accessibility labels. Creation remains online-only and hidden for public read-only collections.

Bold text applies at the iOS `Host` level for native string labels and controls. `Text` and Markdown also adjust explicit font weights while preserving Dynamic Type and the existing hierarchy; the React Native photo counter applies the preference separately.

### Sign-in

Start with the AdventureLog server address and a Continue action. A short footer explains that an existing server account is required; no promotional introduction precedes the form. QR sign-in stays available before a server is entered because its code includes the server address. Only after Continue does the app discover and show that server's sign-in methods. The selected server stays visible with a Change server action. A public-demo shortcut beneath QR sign-in selects the official hosted demo and uses its normal sign-in methods, with a notice to avoid uploading personal data. Manual API-key entry is disclosed under Advanced; connection failures expose retry and changing the server. Changing servers clears credentials and any pending MFA challenge. Keep the native grouped form and platform text scaling on both steps.

### Account and Integration Forms

Use the same native grouped rows as other settings. Account/integration preferences sit below the main settings/account entry points. Save is a labelled header action; online-only writes expose loading and errors. Existing credentials are never prefilled; replacement fields explain that blank keeps the current key. Destructive actions are named inline rows followed by confirmation, with a stronger username/password confirmation for deleting an account. Provider approval is a focused web-authentication screen with a clear return path.

### Offline-map Management

A labelled "Offline-Karten" row sits in the collection map's floating filter panel. The pushed native form groups area selection/download separately from saved packs. Each pack shows progress or completion, storage size and detail level; pause/resume and delete are explicit actions. Large areas use an overview detail level, and the form explains saving individual places for detail. Download and deletion have confirmations. Light-style offline maps are an explicit current limitation, not an extra theme setting.

Collection and point maps keep the app surface and an accessible spinner over the unrendered native map until its first complete frame. A failed map load offers Retry. The collection map can remain lazy, but even its unmounted/loading state has the app background.

Map overlays sit 12pt below the complete navigation header on iOS, rather than using only the status-bar inset. Collection filters keep an accessible-height picker row and a padded offline-map action. Collection and world-map previews use the shared `SheetRow` spacing, with 20pt above and 16pt below the content, so native rows do not collapse inside the sheet. “Open in Maps” follows Settings → Maps on every surface; the preference is local to the device.

### Initial Loading and Empty Home

Home, Collections, Places, World statistics/countries, search results, the collection day view and standalone place details use shared row-shaped skeletons while their first request is fetching. The placeholder pulse runs on the native driver, stops when removed, and becomes static with reduced motion. Screen readers get a single busy region; decorative shapes are hidden. Cached content stays visible during refresh. The app shell restores the persisted query cache before warming main-tab data, using the same query definitions as the screens. The main tab lists and summaries warm together after restoration, and screen reads reuse those requests. Fresh cached requests are reused, concurrent requests deduplicate, and failures stay independent. The two next likely collections also prefetch their complete detail through the same single-request cache; the rest of the library and media are not eagerly downloaded. Stays, Notes and All days prepare from the shared collection data without a first-focus null-render gate. A genuinely uncached collection shows placeholders or an offline/error state. Navigator scenes, native stack content and the Android host use the Material surface before content mounts, preventing a differently colored first frame. Paused requests without saved data explain that a connection is needed instead of showing an endless loader or claiming that the list is empty.

The collection day footer uses one native refresh row with timestamp and media availability as supporting text. It is a direct section in the form, and Android does not mount the iOS tab-bar spacer; neither may create an extra empty card.

An empty Collections library is a tappable “New collection” row with one line on what a collection holds, so the first one is a tap away inside the list rather than behind the header. Home uses a short “Nothing planned” empty state; creation stays in the header Add menu, with no duplicate New place row or instructional paragraph in the feed.

### Reading descriptions

Place, location, lodging and transportation descriptions use native selectable Markdown text with extra reading space (iOS: 4pt extra line spacing; Android: 17sp body / 26sp line height; both add 8pt vertical and 4pt horizontal padding inside the native row). Descriptions longer than 500 graphemes start with a plain-text excerpt of about 280 graphemes, cut at a nearby word boundary, followed by a native Read more row. Expansion restores the complete Markdown and link rows; Show less restores the excerpt. Short descriptions stay fully visible. This is display-only: the source is never rewritten or given invented paragraph breaks. Notes and editor previews retain their existing presentation.

### Offline Is Said Up Front

Offline is the normal case, so it is stated at the top, not only in the footer: Home and the day view open with one row, "Offline – alles Gespeicherte ist da", with the "Stand" time as its second line (`offlineNoticeRow`). Edits made on the road work offline (ADR 0016): the edit shows at once and the collection's status row says "n Änderungen warten auf Netz" until it is sent. What still needs a connection (sharing, archive and the rest of the collection menu, web image search, nearby) is hidden offline. "Stand" times use the UI language's date format (`formatUpdatedAt`).

### Peak and End

The few moments a trip has get a word of their own, nothing louder:

- On the morning of day 1, "Gute Reise!" in Body 600 Teal under the day heading; on the last day, "Letzter Tag – gute Heimreise!".
- The last day ends with "Eure Reise": days, places (visited when known), stays and nights, connections, and the reassurance that everything stays in the collection. It also shows when a finished collection is opened again.
- Ticking off the last checklist item (see Toggle Rows).

### More on Detail Screens

A detail screen shows what is needed at a glance first: when (planned/visited), where (maps), what to know (info), documents. Planning extras (Immich, trails, activities, sun times, rating, tags) fold into one "Mehr anzeigen" row whose second line names what is behind it (`useMoreSections`). Lodging and transportation are short enough without it.

### Settings Order

A category with more than one setting gets its own screen; a single setting stays on the overview. The overview opens with three navigation rows, each with its current state as the second line and a chevron: "Lesbarkeit und Bedienung" (text size with a live preview line, bold, contrast, motion, haptics), "Darstellung" (language, theme, iOS tab labels) and "Erinnerungen" (master switch, the seven kinds, the iOS Live Activity). Below them, inline: map app, offline data, account (with integrations), privacy, sign-out, version. Sign-out is one sheet with two plain choices, "Abmelden, Downloads behalten" and "Abmelden und alles löschen"; both revoke the device's key.

### Als Nächstes

Today's page opens with the one thing coming up, on a Teal Wash card (24px radius, 24px padding): how long until it in Apricot (Body 600), the time in Figure in its own zone, the name in Body 600, and its photo (88px, 16px radius) when it has one. It ticks once a minute, disappears when nothing timed is left, and opens the entry on tap. The day view also pulls to refresh.

### Looking Back

Finished things are memories, not records:

- **Memory cards** (`MemoryCard`): a finished collection's cover photo (24px radius) under the hero's scrim, "vor 2 Jahren" in Apricot and the name in white Body 600. Collections shows past collections as a sideways strip of them; Home shows "Heute vor 1 Jahr" when an earlier collection ran over today's date.
- **Fotos des Tages**: once a day is over, its page shows the day's photos as a sideways strip (120px, 16px radius); each opens what it shows.
- **Eure Reise** closes the last day (see Peak and End).
- **Passport stamps** (`PassportStamps`): World leads with the visited countries as stamps on a Teal Wash page: flag, country code in Teal, regions marked, a 2px dashed Teal border and a fixed tilt per country (−4° to 4°). Tapping opens the country.

### Celebration

`celebrate()` shows a Teal pill with a check that springs in, holds 1.8s and fades (reduce motion: a plain fade); screen readers hear the message. Only for milestones the person caused themselves, today the last checklist item. Never for an ordinary save, and never for background work: an "offline bereit" moment after downloads was tried and removed because it appeared out of nowhere (e.g. after opening a place) and read as confusing; the status row's "Bilder und PDFs offline verfügbar" line covers it.

### Press Feedback

Photo cards (hero, memories, Als Nächstes, stamps) give slightly under the thumb (scale 0.98, stamps 0.94) instead of dimming.

### Status Line

"Stand: …" (or "Offline · Stand: …" with the offline icon, in the secondary colour: offline is the normal case here, not an alarm) in Label size at the top of collection screens, so people always know how fresh the data is.

## Do's and Don'ts

### Do:

- **Do** use the platform's own controls (`@expo/ui`) first; React Native views only where no native one exists (hero, map, gallery, day strip, thumbnails).
- **Do** take colours from `useColors()` so light, dark and "Mehr Kontrast" all work; add the contrast twin with any new colour. Prefer a platform role (iOS system colour, Material role) over a new hex value.
- **Do** give every row a leading icon in Teal and a plain-language secondary line. Leading icons sit in a fixed 28pt slot (`ROW_ICON_SLOT`) so row text lines up.
- **Do** let text grow: check new screens at "Riesig" and with bold text on both platforms.
- **Do** honour reduced motion: no stack animation, no image fades, no animated day jumps.
- **Do** build resource screens from the shared pieces (`resourceHeaderRows`, `entryRow`, `stayRow`, `journeyRows`, `Thumb`, `typeScale`) and fix problems there, not per screen.

### Don't:

- **Don't** use blue or green outside the map.
- **Don't** add shadows to list content or cards in a list.
- **Don't** set fixed font sizes that bypass Dynamic Type or the app's text-size setting.
- **Don't** rely on icons alone: every action has a text label (Android toolbar icons excepted, with an accessibility label).
- **Don't** show the Japan trip's real data in published screenshots or marketing.
