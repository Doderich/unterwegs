# Travel utilities

Scope and implementation order, 09.11.2026. Phases 1 and 2 are implemented in the working tree; device verification and release remain outstanding. The selected Phase 3 tools (units, clocks and essentials) are implemented; the rest remain candidates. Current behavior belongs in [FEATURES.md](FEATURES.md), overall priority in [ROADMAP.md](ROADMAP.md), and extension research in [travel-utilities-server-compatibility.md](research/travel-utilities-server-compatibility.md).

## Implementation status

- Home shows quick access to currency conversion, plus address and offline-readiness shortcuts for the current or next collection. Settings → Appearance → Show travel utilities on Home hides this section; it is visible by default and the preference persists on the device. Without a current/upcoming collection, currency conversion stays available. Settings → Travel utilities opens the utility list. Collection headers have no utilities menu: currency conversion stays on Home and in Settings, offline readiness opens from Plan, and lodging details offer address cards. Address shortcuts name the lodging (or offer a lodging choice) and only appear when the relevant night's lodging has a non-empty address. Home uses the cached collection copy and hides the shortcut until that context is available. Lodging details offer the address card directly when an address exists; collection status rows link to readiness.
- Frankfurter is the initial rate source. With no saved currency pair, the account's default currency fills From (EUR if unavailable), with JPY on the other side (EUR when the preferred currency is JPY). Saved pair/source choices take precedence on later visits. Frankfurter refreshes automatically on opening, currency changes and reconnect, with manual refresh available.
- Currency selection, manual rates and fetched rates persist in a separate device-wide SQLite key-value record. Amounts are persisted only when the user chooses Save conversion. The local history keeps the last 100 calculations with exact amount, result, currency pair, source and rate snapshot (including inverse direction, rate date and retrieval time). Refreshing rates does not rewrite history. Clear history removes calculations while retaining preferences/rates; signing out with Delete everything also clears it. Existing v1 preference/rate records migrate without losing data. Rates/preferences survive sign-out, like other device preferences; no collection data or API key is stored with them.
- Decimal multiplication and inverse conversion use integer ratios and round half-up once to the target currency's precision. Input allows up to 18 whole and 18 fractional digits. Locale grouping follows de/en/ja, including full-width Japanese numerals; an ungrouped alternate decimal separator is accepted. The searchable picker offers popular and selected currencies first, followed by the bundled active fiat-currency catalogue with localized names; unknown saved account currencies retain their codes; unsupported automatic pairs fall back to manual entry.
- Automatic rates use Frankfurter v2, automatically on opening, currency changes and reconnect, as well as manual refresh. The default blended feed needs no key, permits caching and commercial use, publishes dated daily rates, and is rate-limited against abuse without fixed quotas ([official API and FAQ](https://frankfurter.dev/)). Provider-specific endpoints have separate terms and are not used. The rate date and retrieval time are shown separately; cached rates remain visible during refresh or failure; no background task is used. Two amount rows put each value beside its currency button, with a compact swap icon between them. A searchable native picker lists popular currencies above all currencies and marks the opposite currency with the swap icon; selecting it swaps both sides. The UI links to the provider. Only the currency pair is sent, without credentials, amounts or collection identifiers. Privacy-page source text in de/en/ja covers the new service; it still needs deployment with the release.
- A read-only EUR/JPY request on 09.11.2026 returned `{date, base, quote, rate}` as documented. Automated checks cover validation, exact rounding, locale formatting, inverse conversion, persistence, failed refresh preservation, overlapping lodgings and shared file counts. iOS and Android production JavaScript/Hermes exports compile. Initial device inspection was blocked by `DEVICE_IN_USE`; later focused iOS checks are recorded below. Screen-reader and airplane-mode checks remain outstanding.
- The address card shows saved wording only and lets the user choose between overlapping night lodgings. Readiness uses the same image/attachment calculation as reminders, and reports map packs and pending edits separately. No server changes, dependencies or native configuration changes were added.
- Final automated verification: `npm run check` passes (78 suites, 576 tests passed; one suite/two tests skipped, one existing lint warning in `shareSigning.test.ts`). iOS and Android production exports pass. Concurrent requests for the same authenticated media file share one download; failed downloads remain retryable. Device verification remains outstanding as described above.

## Goal and compatibility

Answer small, frequent questions while travelling: what a price means at home, which address to show a driver, and what is available without signal. Utilities must work with an unmodified AdventureLog server, including the currently pinned v0.13.1. They must not delay or compromise collection reading, attachments, maps or pending edits.

Start with app-only features. No custom server image, database changes or companion service is needed for the first phases. Keep collection reads on `GET /api/collections/{id}`; use existing write paths when a utility edits a note or another supported object. Device preferences and external-provider caches are separate from AdventureLog collection data.

## Converter interaction verification

On 09.11.2026, the iOS simulator showed the compact swap control, with the former full-row action removed. A subsequent pass adopted two amount/currency rows and a centered swap icon, using the [Wise reference](https://mobbin.com/screens/6aeb33a8-d4f8-41be-a91f-5edc8ee8011d). The [Luma picker reference](https://mobbin.com/screens/8a0ca0a7-30b0-4dac-b017-76f9dd01fda1) informed the searchable sheet with popular currencies before the complete list. Native iOS checks verified searching for CHF, selecting it, automatic EUR/CHF conversion, and returning to EUR/JPY without losing the input. Opening the calculator loaded a Frankfurter rate automatically. The icon swapped EUR/JPY to JPY/EUR and fetched the new pair; selecting JPY from the To menu swapped both sides back. Android production export passes; its new icon/picker interaction still needs device verification. Requests for superseded pairs are cancelled; cached rates stay visible during refresh/failure. Recently fetched query results can be reused for five minutes, while opening the screen always refreshes. Updated privacy-page source text describes automatic requests and still needs deployment with the release.

The main calculator now focuses on the amount, currencies, approximate result and saved conversions. The toolbar's Adjust exchange rate action reveals automatic/manual controls and refresh; an active manual rate stays visible. Provider names, retrieval metadata, technical explanations and the empty history section were removed from the screen. History rows show the calculation and save time; their full rate snapshots remain stored locally. Loading, offline and failure messages appear only when relevant. This follows the owner's request for a simpler travel calculator; privacy documentation still describes the external rate request.

## Local history verification

Currency choices, rate source and saved rates remain device-local. The calculator now offers Save conversion and a recent history (100 entries maximum), with exact results and the save time; original rate metadata remains in the stored snapshot. History is never sent to AdventureLog or Frankfurter; clearing it preserves rates/preferences. The normal privacy pages describe the stored amounts. Automated checks cover migration from existing preference records, restart persistence, historical snapshots after a rate refresh, clearing, duplicate saves, the limit and invalid calculations.

On 09.11.2026, the iOS 27 simulator displayed the Home shortcut and calculator; a manual test conversion was saved, the app relaunched, and both the manual rate and history entry remained. Native testing exposed missing `Intl.NumberFormat.formatToParts` in Hermes; the formatter now groups exact decimal strings for de/en/ja and displays ISO currency codes without that API. This is a focused currency/history check, not the remaining Android, accessibility, address-card or readiness verification.

## Candidates and data ownership

| Utility                     | Where its data comes from                                              | Server requirement / limitation                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Currency calculator         | Manual rate, optionally a public rate provider; cached on the device   | No AdventureLog change. Automatic rates need connectivity to refresh; manual conversion works on first launch offline.                                                                                   |
| Show-address card           | Existing lodging name and address in the offline copy                  | No change. It can show only saved wording; a local-language address must be supplied, not inferred or automatically translated.                                                                          |
| Offline readiness           | Existing collection copy, file cache and offline-map status            | No change. Reports this device's downloads, not a guarantee against later OS eviction.                                                                                                                   |
| Home / destination clocks   | User-selected home zone and the collection's existing zone selection   | No change. Home zone is a device preference; do not replace object-specific time zones.                                                                                                                  |
| Unit converter              | Conversion rules and device preferences                                | No change; entirely offline.                                                                                                                                                                             |
| Bill splitter               | Amount, optional tip and number of people entered on the device        | No change for a one-off calculation. A shared ledger is a separate feature.                                                                                                                              |
| Essentials and phrase cards | User-entered content; ordinary collection notes when sharing is wanted | No change for readable notes. Private contacts should stay device-local; collection notes follow the collection's sharing/public visibility. No automatic translation or country-number lookup promised. |
| Cost overview               | Existing location, lodging and transportation prices and currencies    | No change for a summary. These are recorded costs, not a complete spending ledger. Missing prices and mixed currencies must stay visible.                                                                |
| Shared expenses / balances  | New structured entries shared across users and devices                 | Deferred. Needs an explicit storage and permissions design, via upstream support or an optional companion.                                                                                               |

## Phase 1: currency calculator

First implementation slice: a useful manual calculator that works without a network, followed by automatic rates once a provider is verified.

- Choose source and target currency, enter an amount, swap currencies, and enter a manual rate with an explicit direction (for example, 1 EUR = 160 JPY). Use the account's default currency as an initial home-currency suggestion when present; remember the user's choices locally. Destination currency stays selectable: a collection may cross countries and time zones do not identify currencies.
- Support German, English and Japanese number entry and formatting. Specify monetary precision, rounding and invalid-input behavior; avoid accumulating binary floating-point errors in money calculations.
- Provider verification is recorded above. Frankfurter is selected for optional automatic rates; a provider requiring a private shared key would need a different deployment decision.
- Store the source, currency pair, rate and provider timestamp; show the last successful retrieval separately if relevant. Keep a manual override distinct from a fetched rate. Show approximate results and explain that card/bank fees are not included unless the user accounts for them in their manual rate.
- Offline or refresh failure preserves the last good rate with its date. With no cached rate, offer manual entry. Refresh automatically on opening and currency changes, reuse rates less than five minutes old during selection, and allow manual refresh. There is no background task.

Done when: manual conversion works on a fresh offline install; cached rates survive a restart; failed refreshes preserve usable results; source, direction and freshness are clear. Verify comma/point input, zero and invalid rates, swapping, large values and currencies with different decimal precision. Automatic rates are a separate completion item after provider verification.

## Phase 2: address card and offline readiness

**Address card:** open it from a lodging detail and offer tonight's night lodging from collection context. Show the saved name and address in large, readable text, with copy and existing map actions. Keep booking references and personal contact details out of the card. Handle missing addresses, no night lodging and overlapping lodgings explicitly; let the user choose when there is ambiguity. Never label an address as local-language text without having that text. Defer a structured alternate-address field until its storage is designed; do not hide app metadata inside notes or descriptions.

Done when: a saved address opens after restart in airplane mode; long Japanese addresses and large text remain readable; missing data has a useful route back to the lodging; selecting a different date uses that date's lodging.

**Offline readiness:** expand the existing offline-download and reminder behavior into a collection-level status screen. Reuse the same readiness calculation for the screen and reminders, rather than introducing competing counts. Separate collection freshness, missing/downloading/failed images and attachments, map packs and pending edits. Link to the existing download/retry and map-area controls. Rate-cache status can appear separately once currency conversion exists; it must not make the collection itself appear unavailable.

Do not equate some cached tiles or one completed map pack with full coverage. Show saved areas and detail levels; make limits and unknown status visible. Keep pending edits distinct from downloaded content.

Done when: counts match available files and download state; partial downloads and failures are actionable; removed packs are reflected; collection reading stays usable during downloads; airplane-mode restart and a missing attachment are checked on both platforms.

## Phase 3: small additions

1. Home / destination clocks with an editable home zone, zone labels and date differences. A call-time slider must calculate each selected instant with daylight-saving rules. Widget work stays in [GLANCES.md](GLANCES.md); share zone selection instead of building a separate rule.
2. Unit conversion for temperature, distance, weight and volume, with explicit units (including US versus imperial volume where offered).
3. One-off bill splitting, reusing currency conversion. Round to currency precision and distribute remainders so the displayed shares add up to the total.
4. Essentials / phrases as a dedicated local card, selected explicitly by the owner. Keep originals visible and avoid presenting saved numbers or phrases as independently verified advice.
5. A recorded-cost summary, with totals per currency first. Converted totals must state their rate basis; do not combine incomplete prices into an apparently complete budget.

The owner selected clocks, unit conversion and an editable essentials card on 09.11.2026; these are implemented. The other items remain candidates. Shared expense entry, settlement, translation services, a secure document vault and automatic emergency-number maintenance are outside the initial scope.

## Entry points and delivery

Currency conversion is reachable without an active collection through Home and Settings → Travel utilities. Utilities do not occupy the collection header. Address cards sit beside lodging details; readiness sits beside existing offline controls. The existing navigation is retained, with no new app-level tab. Direct conversion of a tapped saved price is a possible later shortcut, not implemented.

For each slice, use native mobile controls and accessible text, literal render-time `tr()` keys with German source wording and complete de/en/ja translations. Verify both platforms, large text, screen readers, dark mode, and offline restart. Read the matching Expo SDK documentation before touching native or Expo APIs. Prefer existing dependencies; assess the native-build requirement if adding one.

Run `npm run check` and focused behavioral tests appropriate to the feature. Update FEATURES only as behavior ships; record device checks and remaining limits in ROADMAP. Reassess the next slice after using the previous one on the road.

## If server-side extras become necessary

The source review found no supported general plugin mechanism; existing integrations are built in. See the [cited research](research/travel-utilities-server-compatibility.md) for its checked versions and limits.

Prefer an upstream issue/contribution for shared domain features. An optional companion is an alternative for app-specific structured data, not an adopted deployment requirement:

- Keep separate storage and migrations, referring to AdventureLog objects by server identity plus object ID. Use authenticated HTTP APIs, never direct access to AdventureLog's database.
- Require explicit setup and capability detection. Absence, incompatibility or failure must leave ordinary stock-server collection use intact.
- Design authentication, collection access, revocation, deletion and reconciliation before building shared storage. API keys lack granular scopes; do not silently forward the mobile key to another host. Real-time change notifications are not established by the research.
- Define backup/export and removal behavior for companion-owned data. Stock AdventureLog exports cannot be assumed to contain it, and the stock website will not display it automatically.
- Write an ADR before adopting a companion or changing the shared data model. Review privacy documentation if data starts going to a new service. Keep native compatibility and server-version checks explicit.

Next concrete task: verify the implemented screens on both platforms (large text, dark mode, screen readers, offline restart, partial downloads, missing address and overlapping lodgings), then release through the normal repository process. No server deployment is required. Choose phase 3 only after use of the initial utilities.

## Currency reference data

`src/utilities/currencies.json` bundles the active fiat-currency catalogue from [Frankfurter](https://frankfurter.dev/#currencies), with de/en/ja names from Node's ICU/Unicode CLDR data. These are currency reference names, not interface copy. Run `node scripts/generate-currencies.mjs` when refreshing the catalogue, then format and review the result. The generator needs internet; the app's picker and search do not. Runtime code does not rely on `Intl.DisplayNames` being present in Hermes. Metals, crypto assets and legacy catalogue entries are excluded; saved/account codes absent from the catalogue remain selectable by code. New picker labels use `tr()` in all three languages.


## Additional utilities, implemented 09.11.2026

Home's optional utilities section now directly opens currency, units, time zones and travel essentials. Settings → Travel utilities lists these four; they do not add collection-header controls.

- **Units:** temperature (°C/°F, including negative temperatures down to absolute zero), distance (km/mi/m/ft), weight (kg/lb/g/oz) and volume (L/mL/US liquid gallons/imperial gallons). Selecting the opposite unit swaps the pair; the compact swap icon also works. Each category remembers its pair locally. Values use standard factors and up to eight significant digits, separate from the exact monetary calculator. Factors follow the [NIST SI conversion tables](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8).
- **Time zones:** home is captured from the device on first use, then kept until edited; the destination starts with Tokyo and is editable. Both clocks show the same instant, their date and UTC offset, with a calendar-day difference when necessary. The date/time preview is entered in the home zone and follows that date's daylight-saving rules, including the app's existing normalization hint for missing spring-forward times. Back to now resumes the clocks. This is not a widget or call-time slider.
- **Travel essentials:** user-entered contacts, insurance details and phrases/notes. Read mode shows only filled sections, with copying; the pencil opens a separate editor with explicit Save and a confirmed Delete action. Each field is limited to 5,000 characters. There are no built-in emergency numbers, automatic translations or claims of verified advice. The card is plain local SQLite content, not a secure document vault. It is never sent to AdventureLog or an external provider. Clearing essentials or deleting everything at sign-out removes it; unit/zone preferences remain device preferences.

No dependency, native configuration, API or server change. Tests cover unit factors/temperature offsets/invalid input, US versus imperial volume, local decimal input, calendar-day differences, selected-date DST, preference/essentials restart persistence, corrupt records, deletion and failed writes. Privacy-page source updates must be deployed with release.

## Further possibilities

- Bill and tip splitting: exact shares, configurable tip and remainder distribution.
- Packing templates: copy a reusable list into an existing collection checklist.
- Parking reminder: save a named parking position and optional return time; open the existing maps action.
- Fuel cost estimator: distance, consumption and price per unit, optionally converted to the home currency.
- Local spending tally: a simple device-only list with totals per currency, kept separate from shared expenses.

These are ideas, not implemented commitments. Keep them out of the collection header and add them only when they earn a place in the travel-utilities list.


Additional-utilities verification: `npm run check` passes with 81 suites and 586 tests (one suite/two tests skipped, one pre-existing lint warning). Android production export passes. On the iOS 27 simulator, units converted °C/°F, the centered icon swapped the pair, and selecting the opposite unit in the native sheet swapped it back. Home/destination clocks displayed Berlin/Tokyo times and native date/time controls. Essentials began empty; a fictional contact was saved, survived a complete app relaunch, and was removed through the confirmed deletion flow. Units was also inspected in dark mode at accessibility-large system text, then the device returned to light/large. Android authenticated interaction, tablet layouts, VoiceOver and an airplane-mode restart remain unverified for these additions. No test contact remains.
