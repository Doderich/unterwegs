# The app is tested against one pinned AdventureLog version

The owner's AdventureLog image is pinned by digest (v0.13.1) and only updated on purpose, because the API changes between releases without notice and the app depends on response shapes the OpenAPI schema doesn't describe. Before an update: re-export the schema (`docs/api/README.md`), run `npm run smoke` and the reviewed `npm run smoke:write` cases against the new server using disposable test data, and check `docs/SERVER.md`. Never during a trip.

The write runner covers selected parity operations. Account deletion, integration changes, collaboration and allauth security flows need separate disposable-account checks; the runner does not certify every management endpoint.

With store distribution ([0014](0014-store-distribution.md)) other people's servers run other versions. The owner's server stays pinned and remains the tested version. The app stays as backwards compatible as possible: below the oldest supported version it says the server is unsupported, and above the tested version it shows a notice that some features may not work. Schema parsing tolerates unknown fields so a newer server degrades rather than failing.

AdventureLog doesn't report its version, so "supported" is decided by capability, not by number: the sign-in check and the response handling in `src/api/compat.ts` (summary in [STORE-RELEASE.md](../STORE-RELEASE.md#1-decisions-and-groundwork)).
