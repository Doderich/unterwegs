/**
 * Runs the app's server writes once against the real server, in throwaway collections it creates, checks the
 * responses, and deletes everything it made (also on failure). Touches the user's world data only reversibly
 * (marks are undone). Run before pinning a new AdventureLog version, after `npm run smoke`:
 *   UNTERWEGS_SERVER_URL=https://… UNTERWEGS_API_KEY_FILE=/path/to/key npm run smoke:write
 */
import { readFileSync } from 'node:fs';

import { ApiError, authHeaders, createClient } from '../src/api/client';

/** Thrown after a check recorded its own result. */
class Skip extends Error {}

const serverUrl = process.env.UNTERWEGS_SERVER_URL?.replace(/\/+$/, '');
const keyFile = process.env.UNTERWEGS_API_KEY_FILE;
if (!serverUrl || !keyFile) throw new Error('Set UNTERWEGS_SERVER_URL and UNTERWEGS_API_KEY_FILE');
const apiKey = readFileSync(keyFile, 'utf8').trim();
const client = createClient({ serverUrl, apiKey });
const e = client.edit;

const results: { name: string; ok: boolean; note: string; warn?: boolean }[] = [];
const cleanup: (() => Promise<unknown>)[] = [];

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const note = (await fn()) ?? '';
    results.push({ name, ok: true, note });
  } catch (err) {
    if (err instanceof Skip) return;
    results.push({ name, ok: false, note: err instanceof Error ? err.message.slice(0, 200) : String(err) });
  }
}
function expect(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Error(`expected ${what}`);
}
/** Raw request for binary answers and multipart uploads. */
async function raw(path: string, init: RequestInit = {}) {
  return fetch(serverUrl + path, {
    ...init,
    headers: { ...authHeaders(apiKey), Origin: serverUrl!, ...(init.headers ?? {}) },
  });
}

const KYOTO = { latitude: 35.0394, longitude: 135.7292 };
const GPX = `<?xml version="1.0"?><gpx version="1.1" creator="unterwegs-test" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Test</name><trkseg>
<trkpt lat="35.0394" lon="135.7292"><ele>100</ele><time>2027-03-02T01:00:00Z</time></trkpt>
<trkpt lat="35.0410" lon="135.7310"><ele>140</ele><time>2027-03-02T01:20:00Z</time></trkpt>
<trkpt lat="35.0430" lon="135.7330"><ele>120</ele><time>2027-03-02T01:40:00Z</time></trkpt>
</trkseg></trk></gpx>`;

async function main() {
  const a = await e.createCollection({
    name: 'Unterwegs API-Test A',
    start_date: '2027-03-01',
    end_date: '2027-03-04',
  });
  const b = await e.createCollection({
    name: 'Unterwegs API-Test B',
    start_date: '2027-03-01',
    end_date: '2027-03-04',
  });
  expect(a && b, 'two test collections');
  cleanup.push(
    () => e.deleteCollection(a.id),
    () => e.deleteCollection(b.id),
  );

  let locationId = '';
  await check('location with tags, price, currency, public', async () => {
    const l = await e.createLocation({
      collection: a.id,
      name: 'Kinkaku-ji',
      ...KYOTO,
      tags: ['Tempel', 'Garten'],
      price: '500.00',
      price_currency: 'JPY',
      is_public: true,
    });
    expect(l, 'location');
    locationId = l.id;
    cleanup.unshift(() => e.deleteLocation(l.id));
    const back = await client.getLocation(l.id);
    expect(JSON.stringify(back.tags) === '["Tempel","Garten"]', `tags, got ${JSON.stringify(back.tags)}`);
    expect(Number(back.price) === 500, `price, got ${back.price}`);
    expect(back.price_currency === 'JPY', `currency JPY, got ${back.price_currency}`);
    // New locations take `is_public` from their collections; the app sends it again (useCollectionEdits).
    expect(back.is_public === false, `is_public from the private collection, got ${back.is_public}`);
    const made = await e.updateLocation(l.id, { name: l.name, is_public: true });
    expect(made?.is_public === true, 'is_public after a second write');
    const patched = await e.updateLocation(l.id, { name: l.name, tags: ['Tempel'], price: null });
    expect(patched && JSON.stringify(patched.tags) === '["Tempel"]', 'tags replaced');
    return `currency kept after price null: ${patched?.price_currency}`;
  });

  await check('lodging and transportation rating + public', async () => {
    const h = await e.createLodging({
      collection: a.id,
      name: 'Ryokan Test',
      type: 'hotel',
      timezone: 'Asia/Tokyo',
      check_in: '2027-03-01T06:00:00Z',
      check_out: '2027-03-02T01:00:00Z',
      rating: 4,
      is_public: true,
    });
    expect(h?.rating === 4, `lodging rating 4, got ${h?.rating}`);
    const t = await e.createTransportation({
      collection: a.id,
      name: 'Kyoto → Nara',
      type: 'train',
      date: '2027-03-03T00:00:00Z',
      end_date: '2027-03-03T01:00:00Z',
      start_timezone: 'Asia/Tokyo',
      end_timezone: 'Asia/Tokyo',
      rating: 3,
    });
    expect(t?.rating === 3, `transport rating 3, got ${t?.rating}`);
    const cleared = await e.updateLodging(h.id, { name: h.name, rating: null, collection: a.id });
    expect(cleared?.rating == null, 'rating cleared');
  });

  await check('note public', async () => {
    const n = await e.createNote({
      collection: a.id,
      name: 'Test',
      content: 'x',
      date: null,
      links: [],
      is_public: true,
    });
    const c = await client.getCollection(a.id);
    expect(c.notes.find((x) => x.id === n?.id)?.is_public === true, 'note is_public');
  });

  await check('check-duplicates finds the location', async () => {
    const m = await e.checkDuplicates({ name: 'Kinkakuji', ...KYOTO });
    expect(m[0]?.id === locationId, `match ${locationId}, got ${JSON.stringify(m.slice(0, 1))}`);
    return `score ${m[0].score}, reasons ${m[0].reasons.join(',')}`;
  });

  await check('link existing location into a second collection', async () => {
    const current = await client.getLocation(locationId);
    const linked = await e.updateLocation(locationId, {
      name: current.name,
      collections: [...(current.collections ?? []), b.id],
    });
    expect(linked?.collections?.includes(a.id) && linked.collections.includes(b.id), 'in both collections');
    const inB = await client.getCollection(b.id);
    expect(
      inB.locations.some((l) => l.id === locationId),
      'B lists the location',
    );
  });

  await check('duplicate location into collection A', async () => {
    const copy = await e.duplicateLocation(locationId, a.id);
    expect(copy, 'copy');
    cleanup.unshift(() => e.deleteLocation(copy.id));
    expect(copy.name.startsWith('Copy of'), `name "Copy of …", got ${copy.name}`);
    const back = await client.getLocation(copy.id);
    expect(
      JSON.stringify(back.collections) === JSON.stringify([a.id]),
      `only in A, got ${JSON.stringify(back.collections)}`,
    );
  });

  await check('quick-add location with day and lodging', async () => {
    const l = await e.quickAddLocation({
      name: 'Ryoan-ji',
      latitude: 35.0345,
      longitude: 135.7182,
      collection_id: a.id,
      types: ['tourist_attraction'],
      itinerary_date: '2027-03-02',
    });
    expect(l, 'quick-add location');
    cleanup.unshift(() => e.deleteLocation(l.id));
    const h = await e.quickAddLodging({ name: 'Hostel Test', ...KYOTO, collection_id: a.id, types: ['hostel'] });
    expect(h, 'quick-add lodging');
    const c = await client.getCollection(a.id);
    const planned = c.itinerary.some((i) => i.object_id === l.id && i.date === '2027-03-02');
    return `tags ${JSON.stringify(l.tags)}, address "${l.location ?? ''}", planned ${planned}, lodging type ${h.type}`;
  });

  await check('recommendations near Kyoto', async () => {
    try {
      const r = await client.recommendations(KYOTO.latitude, KYOTO.longitude, 'food');
      return `${r.length} places`;
    } catch (err) {
      // The public Overpass servers are often overloaded (SERVER.md): an outside outage, not an app failure.
      if (err instanceof ApiError && (err.status === 503 || err.status === 504)) {
        results.push({
          name: 'recommendations near Kyoto',
          ok: true,
          warn: true,
          note: `Overpass unreachable: ${err.message}`,
        });
        throw new Skip();
      }
      throw err;
    }
  });

  await check('Wikipedia description, images and image import', async () => {
    const d = await client.wikipediaDescription('Kinkaku-ji', 'de');
    const imgs = await client.wikipediaImages('Kinkaku-ji', 'de');
    expect(d?.extract, 'description');
    expect(imgs.length > 0, 'images');
    const imported = await e.importImages('location', locationId, [imgs[0].source], 'wikipedia');
    expect(imported?.created.length === 1, 'one imported image');
    const none = await client.wikipediaDescription('Xqzzv Unterwegs Nichts', 'de');
    return `"${d.extract!.slice(0, 40)}…", ${imgs.length} images, nothing → ${none}`;
  });

  await check('trail and activity with GPX', async () => {
    const trail = await e.createTrail(locationId, { name: 'Runde', link: 'https://example.org/trail' });
    expect(trail, 'trail');
    const renamed = await e.updateTrail(trail.id, { name: 'Große Runde' });
    expect(renamed?.name === 'Große Runde', 'trail renamed');
    const visit = await e.addVisit({
      location: locationId,
      start_date: '2027-03-02T00:00:00Z',
      end_date: '2027-03-02T00:00:00Z',
      timezone: 'Asia/Tokyo',
    });
    expect(visit, 'visit');
    const json = await e.createActivity(visit.id, {
      name: 'Spaziergang',
      sport_type: 'Walk',
      distance: 2500,
      moving_time: '00:40:00',
      elevation_gain: 30,
    });
    expect(json?.moving_time === '00:40:00', `moving_time, got ${json?.moving_time}`);
    const form = new FormData();
    for (const [k, v] of Object.entries({ visit: visit.id, name: 'Mit Track', sport_type: 'Hike', distance: '900' }))
      form.append(k, v);
    form.append('gpx_file', new Blob([GPX], { type: 'application/gpx+xml' }), 'test.gpx');
    const res = await raw('/api/activities', { method: 'POST', body: form });
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status === 201, `GPX activity 201, got ${res.status} ${JSON.stringify(body).slice(0, 150)}`);
    const c = await client.getCollection(a.id);
    const acts = c.locations.find((l) => l.id === locationId)?.visits.flatMap((v) => v.activities) ?? [];
    expect(acts.length === 2, `2 activities in the collection, got ${acts.length}`);
    const trails = c.locations.find((l) => l.id === locationId)?.trails ?? [];
    expect(trails.length === 1, 'trail in the collection');
    await e.deleteTrail(trail.id);
    return `GPX: elevation_gain ${body.elevation_gain}, start ${body.start_lat}/${body.start_lng}, gpx_file ${String(body.gpx_file).replace(/^https?:\/\/[^/]+/, '')}`;
  });

  await check('auto-generate itinerary (B empty, dated note)', async () => {
    await e.createNote({ collection: b.id, name: 'Dated', content: '', date: '2027-03-02', links: [] });
    const fresh = await client.getCollection(b.id);
    // B already has the linked location's visit (2027-03-02) and the dated note.
    expect(fresh.itinerary.length === 0, `B starts empty, has ${fresh.itinerary.length}`);
    const r = await e.autoGenerateItinerary(b.id);
    expect(r && r.items.length > 0, 'items');
    let again = 'no error';
    try {
      await e.autoGenerateItinerary(b.id);
    } catch (err) {
      again = err instanceof Error ? err.message : String(err);
    }
    return `${r.items.length} items; second call: ${again}`;
  });

  await check('share images, PDF, ZIP export and import, ICS', async () => {
    const notes: string[] = [];
    for (const path of [
      `/api/collections/${a.id}/share-image/square`,
      `/api/collections/${a.id}/share-image/story`,
      `/api/locations/${locationId}/share-image/landscape`,
      `/api/collections/${a.id}/export-pdf`,
      `/api/ics-calendar/generate`,
    ]) {
      const r = await raw(path);
      const type = r.headers.get('content-type') ?? '';
      const size = (await r.arrayBuffer()).byteLength;
      expect(r.ok, `${path} → ${r.status}`);
      notes.push(`${path.split('/').slice(-2).join('/')}: ${type.split(';')[0]} ${Math.round(size / 1024)} KB`);
    }
    const zip = await raw(`/api/collections/${a.id}/export`);
    expect(zip.ok, `export ${zip.status}`);
    const bytes = await zip.arrayBuffer();
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'application/zip' }), 'export.zip');
    const imp = await raw('/api/collections/import', { method: 'POST', body: form });
    const created = (await imp.json()) as { id?: string; name?: string };
    expect(imp.status === 201 && created.id, `import 201, got ${imp.status} ${JSON.stringify(created).slice(0, 150)}`);
    const imported = await client.getCollection(created.id!);
    cleanup.unshift(async () => {
      for (const l of imported.locations) await e.deleteLocation(l.id).catch(() => null);
      await e.deleteCollection(created.id!);
    });
    notes.push(
      `zip ${Math.round(bytes.byteLength / 1024)} KB → "${created.name}" with ${imported.locations.length} locations`,
    );
    return notes.join('; ');
  });

  await check('duplicate collection', async () => {
    const copy = await e.duplicateCollection(a.id);
    expect(copy, 'copy');
    cleanup.unshift(() => e.deleteCollection(copy.id));
    const full = await client.getCollection(copy.id);
    const renamed = await e.updateCollection(copy.id, { name: 'Unterwegs API-Test A (Kopie)' });
    return `"${copy.name}", ${full.lodging.length} lodging, ${full.locations.length} linked locations, rename ${renamed?.name}`;
  });

  await check('cities: mark and unmark one (region restored)', async () => {
    const region = 'JP-26';
    const before = (await client.world.regionVisits('JP')).some((v) => v.region === region);
    const cities = await client.world.cities(region);
    expect(cities.length > 0, 'cities of Kyoto prefecture');
    const city = cities[0];
    await e.markCityVisited(city.id);
    const visits = await client.world.cityVisits(region);
    const regionAfter = (await client.world.regionVisits('JP')).some((v) => v.region === region);
    await e.unmarkCityVisited(city.id);
    if (!before && regionAfter) await e.unmarkRegionVisited(region);
    expect(
      visits.some((v) => v.city === city.id),
      'city visit listed',
    );
    return `${cities.length} cities, ${city.id}; marking a city marked the region: ${!before && regionAfter}`;
  });

  await check('mark regions from locations (undone)', async () => {
    const r = await e.markRegionsFromLocations();
    expect(r, 'result');
    for (const code of Object.keys(r.cities)) await e.unmarkCityVisited(code).catch(() => null);
    for (const code of Object.keys(r.regions)) await e.unmarkRegionVisited(code).catch(() => null);
    return `${r.new_regions} regions, ${r.new_cities} cities marked and unmarked again`;
  });

  await check('public profiles', async () => {
    const users = await client.listUsers();
    if (!users.length) return 'no other public users';
    const p = await client.profile(users[0].username);
    const s = await client.profileStats(users[0].username);
    return `${users.length} users; first: ${p.collections.length} public collections, ${p.adventures.length} public locations, ${s.location_count} locations`;
  });
}

main()
  .catch((err) => results.push({ name: 'setup', ok: false, note: String(err) }))
  .finally(async () => {
    for (const undo of cleanup)
      await undo().catch((err) => {
        // The ZIP import links existing locations, so some are gone already.
        if (!(err instanceof ApiError && err.status === 404)) console.error('cleanup:', String(err).slice(0, 120));
      });
    for (const r of results) console.log(`${r.warn ? '⚠' : r.ok ? '✓' : '✗'} ${r.name}${r.note ? ` — ${r.note}` : ''}`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  });
