# Unterwegs

React Native / Expo app for a self-hosted AdventureLog: reading collections offline, plus online-only edits. Before working, read `docs/ROADMAP.md` (what's next, links to the decisions in `docs/adr/`) and `docs/SERVER.md` (verified API behaviour). Which doc holds what, and when to update it: README → Docs. Key rules:

- All collection data comes from one request: `GET /api/collections/{id}` (`src/api/client.ts`, `collectionSchema`). Don't build on the other list endpoints for it. Data that isn't part of a collection (world, categories, invites, archive, calendar, Immich) has its own endpoints, each verified in `docs/SERVER.md` (`docs/adr/0002-data-beyond-one-collection.md`). Writes go through `client.edit`: collection edits via `useCollectionEdits` (optimistic patch, then refetch of that request), collection-level actions (sharing, invites, archive) via `useCollectionsActions`, the rest via `useOnlineAction` / `useRegionEdits`.
- Account and integration writes also use `client.edit` / `useOnlineAction`. Credential-bearing settings and OAuth queries set `meta: { persist: false }`; strip returned integration secrets in schemas. API-key auth works for DRF account/integration endpoints; allauth email/MFA endpoints are separate (see `docs/SERVER.md`).
- API paths without a trailing slash; auth via `X-API-Key`; `/media` also needs the key.
- Times are UTC from the server; display in each object's own time zone.
- Dev builds, release builds and over-the-air updates: `docs/RELEASING.md`. An update reaches only builds with the same app `version`, so a native change (new native module, config plugin, SDK) means bumping `version` and a new build.
- The repo is anonymous, as if already public: write placeholders (`example.org` URLs, the fake people of `scripts/anonymise-sample.ts`, "the owner") for people, servers, devices and accounts. Personal build values live in `.env.local` (`.env.example`); new API samples go through `scripts/anonymise-sample.ts`. `src/__tests__/privacy.test.ts` guards this, with personal terms in the gitignored `.privacy-denylist`.
- UI text goes through `tr('screen.key')` (`src/i18n`, on i18next): English keys grouped by the screen or module that uses them (`common` when several do), with the full text in `src/i18n/locales/de.json`, `en.json` and `ja.json`. German is the source wording. Placeholders are single-brace `{n}`; counts pass `count` and get `_one`/`_other` entries (Japanese only `_other`). A test fails on missing, leftover or mismatched entries in any file. Call `tr()` at render time with a string literal, never at module level. Use `Text` from `@/ui/Text`, not `@expo/ui`, so iOS text follows the text-size setting. Domain terms (Collection, Location, Lodging, Transportation, …) follow `GLOSSARY.md`. Keep `npm run check` green.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Builds and distribution

For building, signing, publishing or updating, follow `docs/RELEASING.md`: `npm run android:publish` publishes a signed APK to GitHub/Obtainium; `npm run ios:testflight` archives and uploads through Xcode; `npm run update:*` publishes to the self-hosted update server. Use the repository scripts and existing signing identity. Personal values and 1Password references stay in `.env.local`; verify the APK certificate against the previous release. Current build identifiers belong in `docs/RELEASING.md`, not here.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npm run ios` or `npm run android` after regenerating native configuration.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Agent skills

### Issue tracker

GitHub Issues on `Doderich/unterwegs`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.
