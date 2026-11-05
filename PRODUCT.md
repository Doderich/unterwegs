# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

A family travelling together, using the app while on the move. First trip: Japan, 17.12.2026 – 08.01.2027 (departure Frankfurt). Devices in use: a Samsung Galaxy Z Flip 5, Galaxy S22s and an iPhone (the owner's, who runs the server and plans the trips). Those phones stay how the trip is carried. A regular-width iPad window is specified in [docs/IPAD.md](docs/IPAD.md). Typical moments: on a platform checking which train, at a hotel desk looking up the booking number, in the evening checking tomorrow's plan, on a train or in a temple with no signal. Not everyone is technical; the owner can explain the app, but it should not need explaining.

Also: other people who run their own AdventureLog server, once the app is in the stores ([0014](docs/adr/0014-store-distribution.md)).

## Product Purpose

Unterwegs ("on the way") is a native Android and iOS app for a self-hosted [AdventureLog](https://github.com/seanmorley15/AdventureLog). It is the companion for a trip that is already planned: today's plan, where we sleep, how we get there, booking numbers and PDFs, notes and checklists. It also lets people fill things in on the go (tick checklists, write notes, rate and mark locations as visited, adjust the day plan, add a photo from Immich), and covers the website's features beyond a single trip: statistics, a map of all locations, visited countries and regions, a calendar, sharing and invites, archived trips and categories. Account and integration settings let the owner manage access and connected services from the phone.

Success: during the trip, everyone opens Unterwegs instead of the website or a screenshot, finds what they need in a few taps, and can rely on it without signal.

Direction: feature parity with the website over time, but the focus stays on being a companion that is easy to use and easy to fill in while travelling. Big planning work may stay on the website.

## Positioning

The website is built for planning at a desk. Unterwegs is built for the trip itself: synced reading works offline (data, photos, PDFs and downloaded map areas), every time is shown in the time zone of its own location, lodging or transportation, and phone actions are one tap away (open in maps, copy a booking number, open the airline or hotel app). Core screens use each platform's own controls; SSO/provider approval and the remaining account-security workflows use web authentication.

The opening Home feed answers what is happening today and what comes next, combining collections with scheduled location visits. Collections, Places and World are app-level destinations. A saved location does not need a collection; opening a collection enters a focused workspace with its own section tabs. The two navigation layers are never displayed together. Domain wording is Collection (German: Sammlung), rather than Trip/Reise.

## Operating Context

- Data comes from the user's AdventureLog server; the website remains the main planning tool. Each trip is one AdventureLog collection; code and docs say "collection" (see `GLOSSARY.md`).
- Sign-in: SSO (Authentik on the owner's server), username / password, the website's QR code, or an API key.
- Reading works offline from the last sync; editing, account administration and integration setup need a connection. Downloaded map coverage/detail is explicit; viewed tiles alone are only a cache.
- Distribution today: Android via GitHub releases and Obtainium, iOS via TestFlight. Next: Google Play and the App Store, tested through TestFlight and a Play testing track; once live, the stores replace Obtainium ([docs/STORE-RELEASE.md](docs/STORE-RELEASE.md)).

## Capabilities and Constraints

- Current features and the differences to the website: [docs/FEATURES.md](docs/FEATURES.md). Plan: [docs/ROADMAP.md](docs/ROADMAP.md). Decisions: [docs/adr/](docs/adr/).
- Stack: Expo SDK 58 / React Native, expo-router, `@expo/ui` (SwiftUI on iOS, Jetpack Compose / Material 3 on Android), TanStack Query, MapLibre with OpenFreeMap.
- Tested against AdventureLog v0.13.1; all collection data comes from one request per collection, and data beyond a collection (world, calendar, sharing, categories, Immich) from its own endpoints ([docs/adr/0002](docs/adr/0002-data-beyond-one-collection.md)).
- German UI by default, English available. The server URL preset (`EXPO_PUBLIC_DEFAULT_SERVER_URL`) and the SSO provider come from the owner's build and server, not fixed parts of the product.
- UI terms: Sammlung (collection), Heute, Tage, Karte, Unterkünfte, Notizen, Ort (location), Unterkunft (lodging), Verbindung (transportation), Besuch (visit), Welt (statistics, all locations, countries), Kalender, Kategorien, Teilen, Mitglied (collaborator), Einladung (invite), Archiv. Code and docs use the AdventureLog terms from `GLOSSARY.md`.

## Brand Commitments

- Name: Unterwegs. App icon in `assets/`.
- Voice: plain, friendly German (English as a translation), short labels, no jargon.

## Evidence on Hand

- Real trip data: the "Japan Familienreise" collection (23 days, 21 locations, 7 lodgings, photos and booking PDFs) on the owner's server. It is private family data: use it for testing, never in published material.
- No users outside the family, no testimonials, no store listing yet; don't invent any.

## Product Principles

1. **The next plan comes first.** Every screen answers a question someone has while travelling; planning features earn their place by being needed on the road. Home, Collections, Places and World are app-level destinations. Collection workspaces keep their own navigation; account and supporting features stay out of their section bar.
2. **Offline is the normal case.** Nothing should break or look broken without signal; show how fresh the data is.
3. **Right time, right place.** Times are always in the local zone of the thing they belong to, never the phone's.
4. **Native, not novel.** Use each platform's own patterns so the app feels familiar to someone who knows their phone but not this app.
5. **Easy to fill in on the go.** Edits are quick, forgiving and safe: few taps, clear confirmation, nothing lost by accident.

## Accessibility & Inclusion

As accessible and as easy to use as possible, for a family with mixed technical confidence and ages. The app must work with large text sizes (system and in-app setting up to "Riesig"), bold text, more contrast, reduced motion, screen readers, dark mode, and the Flip 5 folding / unfolding. Large touch targets and clear labels over icons alone.
