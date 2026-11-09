# Unterwegs

Android/iOS companion for a self-hosted [AdventureLog](https://github.com/seanmorley15/AdventureLog): today's plan, lodging, trains, booking numbers and PDFs, offline, in German (English and Japanese available). Home combines upcoming collections and scheduled visits. Save and browse places without a collection, or enter a focused collection workspace. Also: collection planning and edits, downloadable maps, world statistics, search, sharing, account settings and integration management.

Android **1.4.0** is published with smaller ARM64/universal downloads and self-hosted update-health reporting. TestFlight remains **1.3.0**. Download/build identifiers and installation requirements: [current release](docs/RELEASING.md#current-release). Feature coverage: [FEATURES.md](docs/FEATURES.md); verified behavior and remaining checks: [ROADMAP.md](docs/ROADMAP.md).

## Docs

Each fact lives in one file; update the file that owns it.

| File                                                 | What it holds                                                          | Update when                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| [PRODUCT.md](PRODUCT.md)                             | Who the app is for, purpose, principles                                | The audience or direction changes             |
| [DESIGN.md](DESIGN.md)                               | Design system: colours, type, components, rules                        | A visual pattern is added or changed          |
| [docs/DESIGN-PLAN.md](docs/DESIGN-PLAN.md)           | Proposed UI direction, screen changes and rollout                      | The UI design plan is refined or implemented  |
| [docs/IPAD.md](docs/IPAD.md)                         | iPad and Mac: moments, the day map, big pictures                       | The iPad layout is refined or implemented     |
| [docs/GLANCES.md](docs/GLANCES.md)                   | Proposed widgets, reminders and Live Activities                        | Glances are refined or implemented            |
| [docs/TRAVEL-UTILITIES.md](docs/TRAVEL-UTILITIES.md) | Travel utilities, implementation phases and stock-server compatibility | Utility scope or implementation changes       |
| [docs/HOME-NAVIGATION.md](docs/HOME-NAVIGATION.md)   | Home feed, app tabs and collection workspace                           | Navigation or feed behavior changes           |
| [GLOSSARY.md](GLOSSARY.md)                           | Domain terms (AdventureLog's language)                                 | A new concept appears                         |
| [docs/FEATURES.md](docs/FEATURES.md)                 | What the app does, compared with the website                           | A feature ships                               |
| [docs/ROADMAP.md](docs/ROADMAP.md)                   | Done, next (in order), risks                                           | Work is finished or reprioritised             |
| [docs/adr/](docs/adr/)                               | Decisions and why                                                      | A hard-to-reverse choice is made              |
| [docs/SERVER.md](docs/SERVER.md)                     | Verified API behaviour of the server                                   | A request is checked against the server       |
| [docs/RELEASING.md](docs/RELEASING.md)               | Builds, release builds, over-the-air updates                           | The release process changes                   |
| [docs/STORE-RELEASE.md](docs/STORE-RELEASE.md)       | Checklist and decisions for the store release                          | A store requirement is done or decided        |
| [docs/TELEMETRY.md](docs/TELEMETRY.md)               | xprem telemetry research and proposed scope                            | Telemetry requirements or capabilities change |
| [AGENTS.md](AGENTS.md)                               | Rules for coding agents                                                | A rule changes                                |

Next to their files: [docs/api/README.md](docs/api/README.md) (schema export), [server/README.md](server/README.md) (sign-in page on the server), `docs/agents/` (settings for the agent skills), [site/README.md](site/README.md) (static privacy, support and account-deletion pages for the stores).

## Development

Requires Node 24+, Android SDK (Android) / Xcode (iOS). Uses a dev build, not Expo Go. Personal build values go into `.env.local` (template `.env.example`).

```sh
npm install
npm run android            # dev build on a connected Android phone / emulator
npm run ios -- --device    # dev build on a connected iPhone
npm start                  # Metro for an installed dev build
npm run check              # typecheck + lint + unit tests (same as CI)
```

Release builds (`npm run android:release`, `npm run ios:release -- --device`) and over-the-air updates (`npm run update:android`, `update:ios`, `update:publish`): [docs/RELEASING.md](docs/RELEASING.md).

## API

- `src/api/generated.ts`: types generated from the server schema (`npm run generate:api` after re-exporting `docs/api/swagger.json`, see [docs/api/README.md](docs/api/README.md)).
- `src/api/schemas.ts`: zod schemas for the responses the app actually uses; tested against `docs/samples/`.
- `npm run smoke` with `UNTERWEGS_SERVER_URL=…` and `UNTERWEGS_API_KEY_FILE=<file with key>`: loads and parses every collection and the data beyond collections (world, categories, invites, calendar, Immich albums) from the live server. Run before updating the AdventureLog image.
- `npm run smoke:write` with the same variables: checks selected collection/world parity operations in throwaway "Unterwegs API-Test" collections, checks the answers and deletes everything again (marked regions and cities are unmarked). Temporarily changes account data; use disposable world history and review the [runner limitations](docs/ROADMAP.md#testing-commands) before running it after `smoke`. Account deletion and integration credential changes are excluded.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE.md): use, change and share it for personal and other noncommercial purposes. Commercial use, such as selling it or building a product on it, needs permission.
