/**
 * Smoke test against the real server: lists collections, loads and parses every full collection, reads the user.
 * Run before pinning a new AdventureLog version:
 *   UNTERWEGS_SERVER_URL=https://… UNTERWEGS_API_KEY_FILE=/path/to/key npm run smoke
 */
import { readFileSync } from 'node:fs';

import { createClient } from '../src/api/client';

async function main() {
  const keyFile = process.env.UNTERWEGS_API_KEY_FILE;
  if (!keyFile) throw new Error('Set UNTERWEGS_API_KEY_FILE to a file containing an API key');
  const serverUrl = process.env.UNTERWEGS_SERVER_URL;
  if (!serverUrl) throw new Error('Set UNTERWEGS_SERVER_URL to the AdventureLog server');
  const client = createClient({ serverUrl, apiKey: readFileSync(keyFile, 'utf8').trim() });

  const collections = await client.listCollections();
  console.log(`${collections.length} collection(s)`);
  for (const t of collections) {
    const collection = await client.getCollection(t.id);
    console.log(
      `✓ ${collection.name}: ${collection.itinerary_days.length} days, ${collection.itinerary.length} items, ` +
        `${collection.lodging.length} lodging, ${collection.transportations.length} transportation, ${collection.locations.length} locations`,
    );
  }
  const stats = await client.world.stats();
  const pins = await client.world.pins();
  const countries = await client.world.countries();
  const visited = countries.filter((c) => c.num_visits > 0);
  const sample = visited[0]?.country_code ?? 'JP';
  const regions = await client.world.regions(sample);
  const regionVisits = await client.world.regionVisits(sample);
  console.log(
    `✓ world: ${stats.location_count} locations, ${pins.length} pins, ${countries.length} countries ` +
      `(${visited.length} visited), ${sample}: ${regions.length} regions, ${regionVisits.length} visited`,
  );
  const [categories, archived, invites, events, integrations] = await Promise.all([
    client.categoriesWithCount(),
    client.archivedCollections(),
    client.listInvites(),
    client.calendar(),
    client.integrations(),
  ]);
  const users = await client.listUsers();
  console.log(
    `✓ ${categories.length} categories, ${archived.length} archived, ${invites.length} invites, ` +
      `${events.length} calendar events, ${users.length} public users`,
  );
  if (integrations.immich?.exists) {
    const albums = await client.immich.albums();
    console.log(`✓ immich: ${albums.length} albums`);
  }
  const user = await client.getUser();
  console.log(`✓ user ${user.username ? 'ok' : 'missing'}`);
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? `${e.name}: ${e.message}` : e);
  if (e && typeof e === 'object' && 'issues' in e) console.error(JSON.stringify(e.issues, null, 2));
  process.exit(1);
});
