# Update health without ClickHouse

Checked **04.11.2026**. The owner does not want another database. xprem 3.2.7 uses its existing PostgreSQL control plane for device identity and current update-health state. ClickHouse is not configured or required for this scope.

## Implemented scope

The infrastructure stack enables `DISABLE_DEVICE_TELEMETRY=false`. Existing `expo-updates` manifest requests record installation first/last check-in, running update ID and update-load failure signals. The installation ID is a pseudonymous UUID, not an account or hardware identifier. Offline launches and failures before the updater runs can be invisible. [xprem identity](https://mercure-technologies.gitbook.io/xprem/identity/overview)

The 1.4.0 app adds SDK-compatible `expo-observe`. Its log batches enrich the same installation records with model/OS and binary version; fatal SDK JavaScript/native reports update crash flags. `src/telemetry/health.ts` sends the fixed, payload-free `app_started` event once after session and persisted-cache restoration and a rendered frame. A newer startup on the same installation/update can clear a runtime-crash flag. Reporting and network failures never gate opening the offline copy. Debug dispatch is disabled. [No-ClickHouse behavior and health signals](https://mercure-technologies.gitbook.io/xprem/observe/get-started-with-observe)

There is no navigation integration, network tracing, custom user/collection attributes or product-usage tracking. Startup timing instrumentation is omitted because metric batches are acknowledged and discarded without ClickHouse. The SDK can still generate native metrics; xprem does not retain them. No searchable log history, performance charts or grouped error history are available. An Enterprise license does not replace the missing telemetry storage. [xprem setup](https://mercure-technologies.gitbook.io/xprem/observe/get-started-with-observe), [licensing](https://mercure-technologies.gitbook.io/xprem/references/open-core-and-licensing)

## Configuration and deployment

`app.config.ts` builds the custom endpoint from `UNTERWEGS_UPDATES_URL` and `UNTERWEGS_UPDATES_APP_ID`, both in `.env.local`; `extra.eas.projectId` defaults to `xprem` when EAS is unused. Without this explicit endpoint, JS dispatch is disabled. The app sends directly to the self-hosted server, not the hosted Expo service.

The public proxy allows POST only to this app's exact `/observe/<app-id>/xprem/v1/logs` and `/observe/<app-id>/xprem/v1/metrics` routes alongside the existing manifest/assets paths. The metrics route acknowledges SDK batches so it does not keep retrying discarded metrics. Dashboard, publishing and other apps' ingest paths remain private. The encrypted stack and proxy recovery snapshot live in the owner's infrastructure repo. No ClickHouse, new database, geo-IP enrichment or source-map service is added.

Observe's endpoint is embedded in native configuration. Adding this SDK, changing the endpoint, or changing native packaging requires a new native build and app/runtime version bump; 1.3.x builds cannot gain it through OTA. SDK documentation: [Expo 58 Observe](https://docs.expo.dev/versions/v58.0.0/sdk/observe/), [custom endpoints](https://docs.expo.dev/eas/observe/configuration/).

## Limits and privacy

The dashboard describes installations and known OTA updates. An embedded APK bundle can appear as embedded/unknown; its binary version comes from Observe, and it cannot be treated as a published OTA. “No report” does not establish a successful startup. [Identity data](https://mercure-technologies.gitbook.io/xprem/identity/overview)

Automatic fatal reports contain SDK error messages and stack traces. With no ClickHouse, detailed batches are not retained for exploration, but xprem can retain a bounded fatal-error message with its current failure record in PostgreSQL. Do not put credentials, server responses, collection content or URLs into thrown errors. No account/device names, coordinates, route parameters or request bodies are deliberately attached by the app. Installation IDs and model/OS metadata are pseudonymous, not anonymous.

Native reporting is preview functionality. Capture depends on initialization and a subsequent launch that can upload; the early MapLibre startup failure in 1.3.0 is not guaranteed to be captured. ANRs and out-of-memory terminations are excluded. Keep native device logs and matching build artifacts for diagnosis. [Expo error-reporting limits](https://docs.expo.dev/eas/observe/errors/)

## Verification

Passed on **04.11.2026**: unit checks for one startup signal per launch, no hosted fallback dispatch and offline dispatch rejection; public-ingest/PostgreSQL smoke checks for binary/model/OS enrichment, a crash flag and its resolution by a newer startup. The synthetic installation, failure and outbox records were removed. The exact public app POST paths work; public dashboard/API, other-app ingest and GET ingest return 404. No ClickHouse connection is configured. Infra changes and scoped encrypted recovery snapshots are committed and mirrored to both hosts.

The published Android 1.4.0 APKs embed the self-hosted endpoint and pass signing/architecture checks. Native release behavior still needs checking on a phone: install over the existing app, open online/offline, background/relaunch, then verify binary version and health in the private dashboard. No simulator was opened for this work.
