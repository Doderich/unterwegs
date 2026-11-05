# Translations with i18next and English keys

UI text goes through `tr('screen.key')`, looked up by i18next in one JSON file per language (`src/i18n/locales/de.json`, `en.json`, `ja.json`). Keys are English and grouped by the screen or module that uses them (`settings.signOut`, `today.tonight`), with `common` for text several places share. Every language, German included, has its full text in its file; German stays the source wording the others are translated from. A missing entry falls back to English.

Counts use i18next plurals: the call passes `count` (`tr('staySummary.nights', { count })`) and the files hold `_one` / `_other` forms; Japanese, which has no singular form, only `_other`. Placeholders keep single braces (`{n}`), values aren't HTML-escaped. i18next is plain JavaScript, so the switch reached the 1.4.0 builds as an over-the-air update.

Earlier the German sentence itself was the key into an English table. Semantic keys stay stable when wording changes and don't clash where two German texts share one English translation.

Considered: Lingui (message IDs from the source text, catalog extraction, but every call site becomes a macro and Metro needs a Babel plugin) and i18n-js (the example in Expo's localization guide, but adds little over a plain lookup).

## Consequences

- `src/i18n/__tests__/i18n.test.ts` fails when a key used in the code is missing from a file, a file has a key nothing uses, a language lacks a plural form, or a translation uses a placeholder the German text doesn't have. `tr()` only takes string literals so the test finds every key.
- Reading a `tr()` call no longer shows the wording; the German file does.
- The phone's language is still read through `Intl`, not `expo-localization`: that module has native code and would need new builds. Adding it later also allows the per-app language setting in iOS/Android system settings (`supportedLocales`).
- Dates are formatted by `src/time/tz.ts` with fixed tables per language, not by i18next.
