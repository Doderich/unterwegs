# A collection is read with one request

Everything the app shows about a collection comes from `GET /api/collections/{id}`, which embeds its days, itinerary, locations, lodging, transportation, notes, checklists, images and attachments; screens derive their data from it with pure selectors. The alternative, AdventureLog's per-type list endpoints, is inconsistent (some paginated, some plain arrays, `GET /api/notes` forbidden) and would mean many requests to keep in step offline. One response is one thing to cache, to refresh and to test against a sample.

## Consequences

- Every collection-data write refetches this one request afterwards, which also picks up the server's side effects (visits created from the itinerary, reordered items).
- The OpenAPI schema lacks the full collection detail and the polymorphic itinerary item, so the response has its own zod schema, tested against `docs/samples/collection-detail.json`.
