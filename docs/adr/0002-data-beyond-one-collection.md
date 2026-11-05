# Data outside a collection comes from its own endpoints

Builds on [0001](0001-one-request-per-collection.md).

Everything inside a collection is read from the single `GET /api/collections/{id}` response, because the other list endpoints are inconsistent (some paginated, some plain arrays, some forbidden) and one response is easy to keep offline. When the app grew features that are not part of any one collection (the personal location library and standalone locations, statistics, the map of all locations, countries and regions, categories, invites, archived collections, the calendar, Immich), we read those from their own endpoints instead of stretching the collection response, each one verified on the server and recorded in `docs/SERVER.md`.

## Consequences

- Collection screens still use only the collection response; a new collection feature must not reach for the list endpoints.
- Ordinary reading responses from the extra endpoints are cached like the collection, so their screens open offline with the last data, but they are not part of the offline copy's images and attachments.
- Their response shapes differ from the OpenAPI schema in places (plain arrays where it says paginated, numbers typed as strings), so each gets its own lenient zod schema.

Account and integration management also use their own authenticated endpoints through `client.edit` / `useOnlineAction`, then refresh the affected queries. Responses containing credentials are stripped to their non-secret settings and excluded from persisted query storage.
