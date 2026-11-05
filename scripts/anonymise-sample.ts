/**
 * Strips personal data from an API response before it goes into docs/samples.
 * Rules are generic, so new exports get the same treatment without listing anyone's name here:
 *   npx tsx scripts/anonymise-sample.ts docs/samples/collection-detail.json [more files…]
 * Rewrites the files in place. Review the diff afterwards: free text the rules don't know about can still hold
 * personal data.
 *
 * - People (objects with `username`): fake names, usernames and ids; no profile pictures.
 * - The server's origin (taken from media URLs) → https://adventurelog.example.org.
 * - Links (incl. image `source_url`): replaced by example.org links. Booking and reservation numbers: XXXX. Flight / train numbers keep their
 *   letters, digits become 0.
 * - Free text on lodging, transportation and notes (booking details, guests, hosts, phone numbers): placeholder text.
 * - Lodging addresses lose the street part; lodging coordinates are rounded to ~1 km (holiday flats are homes).
 * - The collection id becomes a fixed example id.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EXAMPLE_ORIGIN = 'https://adventurelog.example.org';
const EXAMPLE_COLLECTION_ID = '00000000-0000-4000-8000-000000000001';
const FAKE_PEOPLE = [
  ['Alex', 'Beispiel'],
  ['Bea', 'Beispiel'],
  ['Chris', 'Beispiel'],
  ['Dana', 'Beispiel'],
  ['Eli', 'Beispiel'],
];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Same input → same output across all files, so references between samples stay intact. */
const idMap = new Map<string, string>();
const personMap = new Map<string, number>();

function fakeId(real: string, n: number): string {
  if (!idMap.has(real)) idMap.set(real, `00000000-0000-4000-8000-${String(100 + n).padStart(12, '0')}`);
  return idMap.get(real)!;
}

function personIndex(username: string): number {
  if (!personMap.has(username)) personMap.set(username, personMap.size);
  return personMap.get(username)!;
}

function findOrigin(root: Json): string | undefined {
  const text = JSON.stringify(root);
  return /"(https?:\/\/[^"/]+)\/media\//.exec(text)?.[1];
}

let linkCount = 0;
const exampleLink = () => `https://example.org/link-${++linkCount}`;

function anonymisePerson(o: Obj) {
  const i = personIndex(String(o.username));
  const [first, last] = FAKE_PEOPLE[i % FAKE_PEOPLE.length];
  o.username = first.toLowerCase() + (i >= FAKE_PEOPLE.length ? i : '');
  o.first_name = first;
  o.last_name = last;
  if ('email' in o) o.email = `${o.username}@example.org`;
  if ('profile_pic' in o) o.profile_pic = null;
  if (typeof o.uuid === 'string') o.uuid = fakeId(o.uuid, i);
  if (typeof o.id === 'string' || typeof o.id === 'number') o.id = fakeId(String(o.id), i);
}

function anonymiseLodging(o: Obj) {
  if (typeof o.description === 'string' && o.description) {
    o.description = 'Bestätigungsnummer: XXXX\n\n[Buchungsbestätigung](https://example.org/booking)';
  }
  if (typeof o.location === 'string') o.location = o.location.split(',').slice(-2).join(',').trim();
  for (const key of ['latitude', 'longitude']) {
    const v = o[key];
    const rounded = Math.round(Number(v) * 100) / 100;
    if (typeof v === 'number') o[key] = rounded;
    else if (typeof v === 'string') o[key] = rounded.toFixed(2);
  }
}

function anonymiseFreeText(o: Obj, key: string, placeholder: string) {
  if (typeof o[key] === 'string' && o[key]) o[key] = placeholder;
}

function walk(v: Json, parentKey: string | undefined, origin: string | undefined): Json {
  if (Array.isArray(v)) return v.map((x) => walk(x, parentKey, origin));
  if (typeof v === 'string') {
    let s = origin ? v.split(origin).join(EXAMPLE_ORIGIN) : v;
    for (const [real, fake] of idMap) s = s.split(real).join(fake);
    return s;
  }
  if (!isObj(v)) return v;

  if ('username' in v) anonymisePerson(v);
  if (parentKey === 'lodging' || 'check_in' in v) anonymiseLodging(v);
  if (parentKey === 'transportations' || 'flight_number' in v) {
    anonymiseFreeText(v, 'description', 'Details zur Verbindung');
    if (typeof v.flight_number === 'string') v.flight_number = v.flight_number.replace(/\d/g, '0');
  }
  if (parentKey === 'notes') anonymiseFreeText(v, 'content', 'Notiztext');

  for (const [key, value] of Object.entries(v)) {
    if ((key === 'link' || key === 'source_url') && typeof value === 'string' && value) v[key] = exampleLink();
    else if (key === 'links' && Array.isArray(value)) v[key] = value.map(() => exampleLink());
    else if (key === 'reservation_number' && typeof value === 'string' && value) v[key] = 'XXXX';
    else if (key === 'user' && typeof value === 'string' && idMap.has(value)) v[key] = idMap.get(value)!;
    else v[key] = walk(value, key, origin);
  }
  return v;
}

function collectPeople(v: Json) {
  if (Array.isArray(v)) v.forEach(collectPeople);
  else if (isObj(v)) {
    if (typeof v.username === 'string') {
      const i = personIndex(v.username);
      if (typeof v.uuid === 'string') fakeId(v.uuid, i);
    }
    Object.values(v).forEach(collectPeople);
  }
}

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Usage: npx tsx scripts/anonymise-sample.ts <file.json>…');
const docs = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as Json);
docs.forEach(collectPeople);
for (const d of docs) {
  // A collection detail: its own id becomes the example id everywhere.
  if (isObj(d) && typeof d.id === 'string' && 'itinerary' in d) idMap.set(d.id, EXAMPLE_COLLECTION_ID);
}
files.forEach((f, i) => {
  const out = walk(docs[i], undefined, findOrigin(docs[i]));
  writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  console.log(`anonymised ${f}`);
});
