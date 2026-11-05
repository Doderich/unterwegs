import { z } from 'zod';

import { lenientArray, reportSchemaError } from './compat';
import { keyedFetch } from './http';
import { nativeUpload, type MultipartUpload } from './upload';
import { tr } from '@/i18n';

import {
  attachmentSchema,
  apiKeySchema,
  calendarEventSchema,
  categorySchema,
  categoryWithCountSchema,
  checklistSchema,
  inviteSchema,
  lodgingSchema,
  placeResultSchema,
  publicUserSchema,
  publicProfileSchema,
  activitySchema,
  trailSchema,
  statsSchema,
  recommendationsSchema,
  duplicateMatchSchema,
  wikipediaPageSchema,
  webImageSchema,
  importedImagesSchema,
  reverseGeocodeSchema,
  transportationSchema,
  collectionSummarySchema,
  countrySchema,
  dashboardSchema,
  imageSchema,
  immichAlbumSchema,
  immichAssetSchema,
  integrationsSchema,
  integrationSettingsSchema,
  endurainConnectSchema,
  itineraryDaySchema,
  itineraryItemSchema,
  locationSchema,
  noteSchema,
  paginatedSchema,
  pinSchema,
  regionSchema,
  collectionSchema,
  userSchema,
  visitSchema,
  visitedRegionSchema,
  citySchema,
  visitedCitySchema,
  markedFromLocationsSchema,
  type CollectionSummary,
  type Collection,
  type User,
} from './schemas';

export type NoteInput = { name: string; content: string; date: string | null; links: string[]; is_public?: boolean };
/** A local file for a multipart upload (`upload.ts`). */
export type UploadFile = { uri: string; name: string; type: string };
/** Objects images and attachments can hang on. */
export type MediaOwnerKind = 'location' | 'lodging' | 'transportation';

export type VisitInput = { start_date: string; end_date: string; timezone: string; notes: string };
/** `POST /api/locations/quick-add`, `/api/lodging/quick-add`: a place in one call (photos imported by the server). */
export type QuickAddInput = {
  name: string;
  latitude: number;
  longitude: number;
  collection_id: string;
  location?: string | null;
  description?: string | null;
  link?: string | null;
  rating?: number | null;
  /** Place types; become tags (locations) or the lodging type. */
  types?: string[];
  /** Up to 5 public image URLs. */
  photos?: string[];
  /** Also puts it on this day's plan. */
  itinerary_date?: string;
};
export type TrailInput = { name: string; link?: string | null };
/** Durations as `HH:MM:SS`, distance and elevation in metres. */
export type ActivityInput = {
  name: string;
  sport_type: string;
  distance?: number | null;
  moving_time?: string | null;
  elevation_gain?: number | null;
  start_date?: string | null;
};
export type RecommendationCategory = 'tourism' | 'food' | 'lodging';
export type CategoryInput = { name: string; display_name: string; icon?: string };
export type LocationInput = {
  name: string;
  description?: string | null;
  link?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Replaces the whole list. */
  tags?: string[];
  /** Readable on the website without an account. */
  is_public?: boolean;
  /** Replaces the whole set of collections the location is in. */
  collections?: string[];
  price?: string | null;
  price_currency?: string | null;
  /** Matched by name among the user's categories, created if missing. Only the location's owner can change it. */
  category?: CategoryInput;
};
export type LodgingInput = {
  name: string;
  type?: string | null;
  description?: string | null;
  link?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  timezone?: string | null;
  reservation_number?: string | null;
  price?: string | null;
  price_currency?: string | null;
  /** 1–5, `null` clears. */
  rating?: number | null;
  /** Readable on the website without an account. */
  is_public?: boolean;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
export type TransportationInput = {
  name: string;
  type: string;
  description?: string | null;
  link?: string | null;
  date?: string | null;
  end_date?: string | null;
  start_timezone?: string | null;
  end_timezone?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  start_code?: string | null;
  end_code?: string | null;
  flight_number?: string | null;
  price?: string | null;
  price_currency?: string | null;
  /** 1–5, `null` clears. */
  rating?: number | null;
  /** Readable on the website without an account. */
  is_public?: boolean;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
};
export type CollectionInput = {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  link?: string | null;
};

export type ChecklistInput = {
  name?: string;
  items: { name: string; is_checked: boolean }[];
};

/** First human-readable message from a DRF / allauth error body. */
export function serverMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'string') return b.error;
  if (typeof b.detail === 'string') return b.detail;
  if (typeof b.message === 'string') return b.message;
  if (Array.isArray(b.errors) && b.errors[0] && typeof b.errors[0].message === 'string') return b.errors[0].message;
  for (const v of Object.values(b)) {
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  }
  return null;
}

const collectionPageSchema = paginatedSchema(collectionSummarySchema);
type CollectionPage = z.output<typeof collectionPageSchema>;

/** `next` links carry the server's own origin (which may differ from ours behind the proxy); keep the path. */
export function pathOf(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '');
}

/** Shown name and emoji of an existing category (`PATCH /api/categories/{id}`). */
export type CategoryEdit = { display_name: string; icon: string };

const immichPageSchema = paginatedSchema(immichAssetSchema);

export type Credentials = { serverUrl: string; apiKey: string };

/** The key is missing, revoked or rejected. The app should go back to login. */
export class AuthError extends Error {
  constructor(message = 'Nicht angemeldet') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class SchemaError extends Error {
  constructor(
    readonly path: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(tr('client.unexpectedResponseFromPath', { path }));
    this.name = 'SchemaError';
  }
}

/** `https://host/` → `https://host` */
export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** A 404 from the generate endpoints means "nothing found", not an error. */
function notFoundAsNull(e: unknown): null {
  if (e instanceof ApiError && e.status === 404) return null;
  throw e;
}

/** The SvelteKit proxy 308-redirects `/api/x/` → `/api/x`; call the final form directly. */
export function normalizePath(path: string): string {
  const [p, query] = path.split('?');
  const clean = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
  return query ? `${clean}?${query}` : clean;
}

export function authHeaders(apiKey: string): Record<string, string> {
  return { 'X-API-Key': apiKey };
}

function originOf(url: string): string | null {
  const m = /^(https?:\/\/[^/?#]+)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

type MediaSource = { url: string; headers?: Record<string, string> };

/** Parent domains whose subdomains usually belong to different people (shared hosting, dynamic DNS, tunnels). */
const SHARED_PARENTS = new Set([
  'github.io',
  'gitlab.io',
  'pages.dev',
  'workers.dev',
  'netlify.app',
  'vercel.app',
  'herokuapp.com',
  'onrender.com',
  'fly.dev',
  'railway.app',
  'web.app',
  'firebaseapp.com',
  'azurewebsites.net',
  'cloudfront.net',
  'amazonaws.com',
  'trycloudflare.com',
  'ngrok.io',
  'ngrok.app',
  'ngrok-free.app',
  'loca.lt',
  'ts.net',
  'duckdns.org',
  'ddns.net',
  'no-ip.org',
  'no-ip.biz',
  'hopto.org',
  'zapto.org',
  'sytes.net',
  'dynu.net',
  'freedns.org',
  'mooo.com',
  'afraid.org',
  'dyndns.org',
  'myfritz.net',
  'synology.me',
  'myqnapcloud.com',
  'tplinkdns.com',
  'eu.org',
]);

/** `https://demoapi.example.org` → `example.org`; null when the parent could be a public suffix. */
function ownedParent(origin: string): string | null {
  const host = origin.replace(/^https:\/\//, '');
  if (host.includes(':') || /^[\d.]+$/.test(host)) return null;
  const labels = host.split('.');
  if (labels.length < 3) return null;
  const parent = labels.slice(1).join('.');
  const [second, tld] = labels.slice(-2);
  // Two-label public suffixes like co.uk, com.au, ne.jp.
  if (labels.length === 3 && tld.length === 2 && second.length <= 3) return null;
  return SHARED_PARENTS.has(parent) ? null : parent;
}

/** Both HTTPS, and subdomains of the same domain (`demo.example.org` and `demoapi.example.org`). */
function isSiblingHost(origin: string, server: string): boolean {
  if (!origin.startsWith('https://')) return false;
  const parent = ownedParent(server);
  return parent != null && parent === ownedParent(origin);
}

/**
 * Where to load a media URL from the server's data, and whether it gets the key. The key only goes over HTTPS: to
 * the signed-in server, and as `fallback` to a sibling host of it. Media URLs carry the server's `PUBLIC_URL`, which
 * may differ from the address the user signed in with; `/media` and `/api` paths on another host are loaded from the
 * signed-in server first. Some servers only serve media on that other host (the public demo: API and media on
 * `demoapi.…`, its web app on `demo.…` answers `/media` with 404), so an HTTPS original comes back as `fallback`:
 * with the key when it is a subdomain of the server's own domain (not a shared-hosting or dynamic-DNS domain),
 * else without it. Anything else is loaded without the key.
 */
export function mediaRequest(url: string, credentials: Credentials | null): MediaSource & { fallback?: MediaSource } {
  if (!credentials) return { url };
  const base = normalizeServerUrl(credentials.serverUrl);
  const server = originOf(base);
  if (!server?.startsWith('https://')) return { url };
  const origin = originOf(url);
  if (origin === server) return { url, headers: authHeaders(credentials.apiKey) };
  const path = origin ? url.trim().slice(origin.length) : null;
  if (origin && path && /^\/(media|api)\//.test(path)) {
    const request = { url: base + path, headers: authHeaders(credentials.apiKey) };
    if (!origin.startsWith('https://')) return request;
    const original = url.trim();
    const fallback = isSiblingHost(origin, server) ? { url: original, headers: request.headers } : { url: original };
    return { ...request, fallback };
  }
  return { url };
}

/**
 * AdventureLog signals "not logged in" two ways:
 * 401 {"detail": "Authentication credentials were not provided."} and
 * 400 {"error": "User is not authenticated"}; invalid keys give 401/403.
 * For writes a 403 means "not allowed" (a collaborator editing the collection itself) or the proxy rejecting a form
 * post, never a bad key (that is 401 `Invalid or expired API key.`): pass `forbiddenIsAuth: false`.
 */
export function isAuthFailure(status: number, body: unknown, { forbiddenIsAuth = true } = {}): boolean {
  if (status === 401 || (forbiddenIsAuth && status === 403)) return true;
  if (status === 400 && body && typeof body === 'object') {
    const msg = String((body as Record<string, unknown>).error ?? (body as Record<string, unknown>).detail ?? '');
    return /not authenticated/i.test(msg);
  }
  return false;
}

export function createClient(
  { serverUrl, apiKey }: Credentials,
  fetchImpl: typeof fetch = keyedFetch,
  uploadImpl: MultipartUpload = nativeUpload,
) {
  const base = normalizeServerUrl(serverUrl);

  async function get<T extends z.ZodType>(path: string, schema: T): Promise<z.output<T>> {
    const p = normalizePath(path);
    const res = await fetchImpl(base + p, {
      headers: { Accept: 'application/json', ...authHeaders(apiKey) },
    });
    const body: unknown = await res.json().catch(() => null);
    if (isAuthFailure(res.status, body)) throw new AuthError();
    if (!res.ok) throw new ApiError(`HTTP ${res.status} (${p})`, res.status, p);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      reportSchemaError(p, parsed.error.issues);
      throw new SchemaError(p, parsed.error.issues);
    }
    return parsed.data;
  }

  /** Writes. API-key requests skip CSRF on the server (`DisableCSRFForAPIKeyMiddleware`). */
  function send<T extends z.ZodType>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    schema: T,
  ): Promise<z.output<T>>;
  function send(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<null>;
  async function send<T extends z.ZodType>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    schema?: T,
  ): Promise<z.output<T> | null> {
    const p = normalizePath(path);
    const res = await fetchImpl(base + p, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...authHeaders(apiKey) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = res.status === 204 ? null : await res.json().catch(() => null);
    if (isAuthFailure(res.status, data, { forbiddenIsAuth: false })) throw new AuthError();
    if (!res.ok) throw new ApiError(serverMessage(data) ?? `HTTP ${res.status} (${p})`, res.status, p);
    if (!schema) return null;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      reportSchemaError(p, parsed.error.issues);
      throw new SchemaError(p, parsed.error.issues);
    }
    return parsed.data;
  }

  /**
   * Multipart writes, through the native upload (see `upload.ts`). The SvelteKit proxy in front of the API rejects
   * form posts without a same-origin `Origin` header (403 "Cross-site POST form submissions are forbidden"), so it
   * is set explicitly.
   */
  async function upload<T extends z.ZodType>(
    path: string,
    fields: Record<string, string>,
    fileField: string,
    file: UploadFile,
    schema: T,
  ): Promise<z.output<T>> {
    const p = normalizePath(path);
    const res = await uploadImpl(base + p, {
      file,
      fieldName: fileField,
      fields,
      headers: { Accept: 'application/json', Origin: base, ...authHeaders(apiKey) },
    });
    let data: unknown = null;
    try {
      data = JSON.parse(res.body);
    } catch {
      // An HTML error page from a proxy: the status says enough.
    }
    if (isAuthFailure(res.status, data, { forbiddenIsAuth: false })) throw new AuthError();
    if (res.status < 200 || res.status >= 300)
      throw new ApiError(serverMessage(data) ?? `HTTP ${res.status} (${p})`, res.status, p);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      reportSchemaError(p, parsed.error.issues);
      throw new SchemaError(p, parsed.error.issues);
    }
    return parsed.data;
  }

  const id = encodeURIComponent;

  return {
    baseUrl: base,
    edit: {
      saveIntegration: (
        kind: 'immich' | 'wanderer',
        integrationId: string | null,
        input: { server_url: string; api_key?: string; copy_locally?: boolean },
      ) =>
        send(
          integrationId ? 'PUT' : 'POST',
          `/api/integrations/${kind}${integrationId ? `/${id(integrationId)}` : ''}`,
          input,
          integrationSettingsSchema,
        ),
      disconnectIntegration: (kind: 'immich' | 'wanderer' | 'endurain' | 'strava', integrationId?: string) => {
        if (kind === 'immich') {
          if (!integrationId) throw new Error('Missing integration id');
          return send('DELETE', `/api/integrations/immich/${id(integrationId)}`);
        }
        return send('POST', `/api/integrations/${kind}/disable`);
      },
      connectEndurain: (server_url: string, username: string, password: string) =>
        send('POST', '/api/integrations/endurain/connect', { server_url, username, password }, endurainConnectSchema),
      confirmEndurainMfa: (mfa_token: string, mfa_code: string) =>
        send('POST', '/api/integrations/endurain/mfa', { mfa_token, mfa_code }, integrationSettingsSchema),
      completeStrava: async (code: string) => {
        const path = '/api/integrations/strava/callback';
        const res = await fetchImpl(`${base}${path}?code=${encodeURIComponent(code)}`, {
          headers: { Accept: 'application/json', ...authHeaders(apiKey) },
          redirect: 'manual',
        });
        if (res.status === 401 || res.status === 403) throw new AuthError();
        if (!res.ok && res.status !== 302) throw new ApiError(tr('common.couldNotConnectStrava'), res.status, path);
        // The pinned server redirects to its settings page after exchanging the code. Verify with the API.
        const status = await get('/api/integrations', integrationsSchema);
        if (!status.strava?.user) throw new ApiError(tr('common.couldNotConnectStrava'), 400, path);
        return true;
      },
      updateAccount: (
        input: Partial<
          Pick<
            User,
            | 'username'
            | 'first_name'
            | 'last_name'
            | 'public_profile'
            | 'measurement_system'
            | 'default_currency'
            | 'date_format'
          >
        >,
      ) => send('PATCH', '/auth/update-user', input, userSchema),
      createApiKey: (name: string) =>
        send('POST', '/auth/api-keys', { name }, apiKeySchema.extend({ key: z.string() })),
      deleteApiKey: (keyId: string) => send('DELETE', `/auth/api-keys/${id(keyId)}`),
      deleteAccount: (confirmation: string, password: string) =>
        send('POST', '/auth/delete-account', { confirmation, password }),
      createNote: (n: NoteInput & { collection: string }) => send('POST', '/api/notes', n, noteSchema),
      /** Keep the collection explicit: the server treats omission as removal for collaborators. */
      updateNote: (noteId: string, n: Partial<NoteInput> & { collection: string }) =>
        send('PATCH', `/api/notes/${id(noteId)}`, n, noteSchema),
      deleteNote: (noteId: string) => send('DELETE', `/api/notes/${id(noteId)}`),
      createChecklist: (c: ChecklistInput & { collection: string }) =>
        send('POST', '/api/checklists', c, checklistSchema),
      /** The server replaces the whole item list (and re-creates the items): always send all of them. */
      updateChecklist: (checklistId: string, c: ChecklistInput & { collection: string }) =>
        send('PATCH', `/api/checklists/${id(checklistId)}`, c, checklistSchema),
      deleteChecklist: (checklistId: string) => send('DELETE', `/api/checklists/${id(checklistId)}`),
      createDay: (d: { collection: string; date: string; name: string; description: string }) =>
        send('POST', '/api/itinerary-days', d, itineraryDaySchema),
      updateDay: (dayId: string, d: { name: string; description: string }) =>
        send('PATCH', `/api/itinerary-days/${id(dayId)}`, d, itineraryDaySchema),
      /** `content_type` as the model name; the server resolves it. */
      addToItinerary: (i: {
        collection: string;
        content_type: string;
        object_id: string;
        date: string;
        order: number;
      }) => send('POST', '/api/itineraries', i, itineraryItemSchema),
      /** Moves and reorders in one call; `date` may change. */
      reorderItinerary: (items: { id: string; date: string; order: number }[]) =>
        send('POST', '/api/itineraries/reorder', { items }, z.array(itineraryItemSchema)),
      /**
       * Fills an empty day plan from the objects' own dates (visits per day, lodging on check-in, transportation on
       * departure, dated notes and checklists). 400 when the plan isn't empty or nothing is dated.
       */
      autoGenerateItinerary: (collectionId: string) =>
        send(
          'POST',
          '/api/itineraries/auto-generate',
          { collection_id: collectionId },
          z.object({ items: z.array(itineraryItemSchema).default([]) }),
        ).catch((e) => {
          if (e instanceof ApiError && /no dated records/i.test(e.message))
            throw new ApiError(tr('client.nothingInTripHasDate'), e.status, e.path);
          throw e;
        }),
      removeFromItinerary: (itemId: string) => send('DELETE', `/api/itineraries/${id(itemId)}`),
      addVisit: (v: { location: string; start_date: string; end_date: string; timezone: string; notes?: string }) =>
        send('POST', '/api/visits', v, visitSchema),
      /** Partial. All-day = start and end at midnight UTC (server rule). */
      updateVisit: (visitId: string, v: Partial<VisitInput>) =>
        send('PATCH', `/api/visits/${id(visitId)}`, v, visitSchema),
      deleteVisit: (visitId: string) => send('DELETE', `/api/visits/${id(visitId)}`),
      createLocation: (l: LocationInput & { collection?: string }) => {
        const { collection, ...rest } = l;
        return send('POST', '/api/locations', { ...rest, collections: collection ? [collection] : [] }, locationSchema);
      },
      /** Partial. Never send `visits` here: the server would replace all of them. */
      updateLocation: (locationId: string, l: Partial<LocationInput>) =>
        send('PATCH', `/api/locations/${id(locationId)}`, l, locationSchema),
      createTrail: (locationId: string, t: TrailInput) =>
        send('POST', '/api/trails', { ...t, location: locationId }, trailSchema),
      updateTrail: (trailId: string, t: Partial<TrailInput>) =>
        send('PATCH', `/api/trails/${id(trailId)}`, t, trailSchema),
      deleteTrail: (trailId: string) => send('DELETE', `/api/trails/${id(trailId)}`),
      /**
       * An activity on a visit; with a GPX file it goes up as multipart and the server reads elevation and the
       * start / end points from it.
       */
      createActivity: (visitId: string, a: ActivityInput, gpx?: UploadFile) => {
        const fields = { ...a, visit: visitId };
        if (!gpx) return send('POST', '/api/activities', fields, activitySchema);
        const form: Record<string, string> = {};
        for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') form[k] = String(v);
        return upload('/api/activities', form, 'gpx_file', gpx, activitySchema);
      },
      updateActivity: (activityId: string, a: Partial<ActivityInput>) =>
        send('PATCH', `/api/activities/${id(activityId)}`, a, activitySchema),
      deleteActivity: (activityId: string) => send('DELETE', `/api/activities/${id(activityId)}`),
      /** Likely duplicates among the user's own locations (all collections); read-only despite the POST. */
      checkDuplicates: (l: {
        name: string;
        latitude?: number | null;
        longitude?: number | null;
        location?: string | null;
      }) =>
        send(
          'POST',
          '/api/locations/check-duplicates',
          l,
          z.object({ matches: z.array(duplicateMatchSchema).default([]) }),
        ).then((r) => r?.matches ?? []),
      /** Creates a location from a place; the server looks up the address and imports `photos`. */
      quickAddLocation: (q: QuickAddInput) => send('POST', '/api/locations/quick-add', q, locationSchema),
      /** Creates a lodging from a place, without check-in / check-out. */
      quickAddLodging: (q: QuickAddInput) => send('POST', '/api/lodging/quick-add', q, lodgingSchema),
      /**
       * A copy named "Copy of …" in `collectionId` only, with copies of the photos; no visits or attachments.
       * Anyone with access to the location and the collection may do it.
       */
      duplicateLocation: (locationId: string, collectionId: string) =>
        send('POST', `/api/locations/${id(locationId)}/duplicate`, { collection_id: collectionId }, locationSchema),
      /** Also removes its itinerary items, visits, images and attachments. */
      deleteLocation: (locationId: string) => send('DELETE', `/api/locations/${id(locationId)}`),
      createLodging: (l: LodgingInput & { collection: string }) => send('POST', '/api/lodging', l, lodgingSchema),
      updateLodging: (lodgingId: string, l: Partial<LodgingInput> & { collection: string }) =>
        send('PATCH', `/api/lodging/${id(lodgingId)}`, l, lodgingSchema),
      deleteLodging: (lodgingId: string) => send('DELETE', `/api/lodging/${id(lodgingId)}`),
      createTransportation: (t: TransportationInput & { collection: string }) =>
        send('POST', '/api/transportations', t, transportationSchema),
      updateTransportation: (transportationId: string, t: Partial<TransportationInput> & { collection: string }) =>
        send('PATCH', `/api/transportations/${id(transportationId)}`, t, transportationSchema),
      deleteTransportation: (transportationId: string) =>
        send('DELETE', `/api/transportations/${id(transportationId)}`),
      createCollection: (c: CollectionInput) => send('POST', '/api/collections', c, collectionSummarySchema),
      /**
       * Owner only. Shrinking the dates deletes itinerary items and itinerary days outside the new range.
       * `is_public` cascades to the collection's items; `is_archived` moves it to `/api/collections/archived`.
       */
      updateCollection: (
        collectionId: string,
        c: Partial<CollectionInput> & { is_archived?: boolean; is_public?: boolean; primary_image_id?: string | null },
      ) => send('PATCH', `/api/collections/${id(collectionId)}`, c, collectionSummarySchema),
      deleteCollection: (collectionId: string) => send('DELETE', `/api/collections/${id(collectionId)}`),
      /**
       * A collection from a ZIP made by "Exportieren (ZIP)" (here or on the website), with its locations, lodging,
       * notes and files; a name that exists already gets " (2)".
       */
      importCollection: (file: UploadFile) =>
        upload('/api/collections/import', {}, 'file', file, collectionSummarySchema),
      /**
       * Owner only (others: 403). A private "Copy of …" with copies of the lodging, transportation, notes,
       * checklists and day plan; the locations are linked, not copied, so both collections share them.
       */
      duplicateCollection: (collectionId: string) =>
        send('POST', `/api/collections/${id(collectionId)}/duplicate`, {}, collectionSummarySchema),
      /** Sends an invite; the user has to accept it. Only users with a public profile. */
      shareCollection: (collectionId: string, userUuid: string) =>
        send('POST', `/api/collections/${id(collectionId)}/share/${id(userUuid)}`),
      unshareCollection: (collectionId: string, userUuid: string) =>
        send('POST', `/api/collections/${id(collectionId)}/unshare/${id(userUuid)}`),
      revokeInvite: (collectionId: string, userUuid: string) =>
        send('POST', `/api/collections/${id(collectionId)}/revoke-invite/${id(userUuid)}`),
      acceptInvite: (collectionId: string) => send('POST', `/api/collections/${id(collectionId)}/accept-invite`),
      declineInvite: (collectionId: string) => send('POST', `/api/collections/${id(collectionId)}/decline-invite`),
      leaveCollection: (collectionId: string) => send('POST', `/api/collections/${id(collectionId)}/leave`),
      rateLocation: (locationId: string, rating: number | null) =>
        send('PATCH', `/api/locations/${id(locationId)}`, { rating }, locationSchema),
      /**
       * The server downloads up to 10 public image URLs and adds them like uploads. `source` is shown on the website
       * (`wikipedia`, `url`). 400 when none of them could be downloaded.
       */
      importImages: (kind: MediaOwnerKind, objectId: string, urls: string[], source: 'wikipedia' | 'url') =>
        send(
          'POST',
          '/api/images/import_from_urls',
          { content_type: kind, object_id: objectId, urls, source },
          importedImagesSchema,
        ),
      /** Comes back as a `.webp` URL and never primary on its own. */
      uploadImage: (kind: MediaOwnerKind, objectId: string, file: UploadFile) =>
        upload('/api/images', { content_type: kind, object_id: objectId }, 'image', file, imageSchema),
      /** Makes it the only primary (cover) image of its object; 400 if it already is. */
      setPrimaryImage: (imageId: string) => send('POST', `/api/images/${id(imageId)}/toggle_primary`),
      deleteImage: (imageId: string) => send('DELETE', `/api/images/${id(imageId)}`),
      uploadAttachment: (kind: MediaOwnerKind, objectId: string, file: UploadFile, name?: string) =>
        upload(
          '/api/attachments',
          { content_type: kind, object_id: objectId, ...(name ? { name } : {}) },
          'file',
          file,
          attachmentSchema,
        ),
      renameAttachment: (attachmentId: string, name: string) =>
        send('PATCH', `/api/attachments/${id(attachmentId)}`, { name }, attachmentSchema),
      deleteAttachment: (attachmentId: string) => send('DELETE', `/api/attachments/${id(attachmentId)}`),
      /** 400 "Region already visited by user." when it already is. */
      markRegionVisited: (region: string) => send('POST', '/api/visitedregion', { region }, visitedRegionSchema),
      /** Looked up by the region code (`JP-13`), not by the visit's id. */
      unmarkRegionVisited: (region: string) => send('DELETE', `/api/visitedregion/${id(region)}`),
      /** Also marks the city's region visited when it isn't yet. */
      markCityVisited: (city: string) => send('POST', '/api/visitedcity', { city }, visitedCitySchema),
      /** Looked up by the city code, not by the visit's id. */
      unmarkCityVisited: (city: string) => send('DELETE', `/api/visitedcity/${id(city)}`),
      /**
       * Marks the regions and cities of all the user's visited locations (from the region / city the server stored
       * on each location). Never unmarks anything.
       */
      markRegionsFromLocations: () =>
        send('POST', '/api/reverse-geocode/mark_visited_region', {}, markedFromLocationsSchema),
      /** `name` must be unique per user (a duplicate gives a 500); the server lowercases it. */
      createCategory: (c: CategoryEdit & { name: string }) =>
        send('POST', '/api/categories', c, categoryWithCountSchema),
      updateCategory: (categoryId: string, c: CategoryEdit) =>
        send('PATCH', `/api/categories/${id(categoryId)}`, c, categoryWithCountSchema),
      /** Its locations move to "general" (created if missing); "general" itself can't be deleted. */
      deleteCategory: (categoryId: string) => send('DELETE', `/api/categories/${id(categoryId)}`),
      /** Links an Immich photo to a location; the image stays on Immich and is served through the server. */
      addImmichImage: (locationId: string, immichId: string) =>
        send(
          'POST',
          '/api/images',
          { content_type: 'location', object_id: locationId, immich_id: immichId },
          imageSchema,
        ),
    },
    /** Categories with their usage count (the categories screen). */
    categoriesWithCount: () => get('/api/categories', z.array(categoryWithCountSchema)),
    archivedCollections: () => get('/api/collections/archived', lenientArray(collectionSummarySchema, 'collections')),
    calendar: async () =>
      (await get('/api/calendar/events', z.object({ events: z.array(calendarEventSchema) }))).events,
    integrationSettings: (kind: 'immich' | 'wanderer' | 'endurain') =>
      get(`/api/integrations/${kind}`, integrationSettingsSchema).catch(notFoundAsNull),
    stravaAuthorization: () => get('/api/integrations/strava/authorize', z.object({ auth_url: z.string().url() })),
    integrations: () => get('/api/integrations', integrationsSchema),
    /** The Wikipedia summary for a name in `lang` (`de`, `en`); null when Wikipedia has nothing. */
    wikipediaDescription: (name: string, lang: string) =>
      get(
        `/api/generate/desc?name=${encodeURIComponent(name)}&lang=${encodeURIComponent(lang)}`,
        wikipediaPageSchema,
      ).catch(notFoundAsNull),
    /** Up to 8 images of the Wikipedia pages found for a name; empty when there are none. */
    wikipediaImages: (name: string, lang: string) =>
      get(
        `/api/generate/img?name=${encodeURIComponent(name)}&lang=${encodeURIComponent(lang)}`,
        z.object({ images: z.array(webImageSchema).default([]) }),
      )
        .then((r) => r.images)
        .catch((e) => notFoundAsNull(e) ?? []),
    /**
     * Places around a point, best first, within `radius` metres (server caps it at 50 km). Online only, throttled
     * by the server; `category` ∈ `tourism`, `food`, `lodging`. `google` asks Overpass only when Google finds
     * nothing; `both` always waits for Overpass too, which is often slow (see SERVER.md).
     */
    recommendations: (
      latitude: number,
      longitude: number,
      category: RecommendationCategory,
      sources: 'google' | 'osm' | 'both' = 'osm',
      radius = 5000,
    ) =>
      get(
        `/api/recommendations/query?lat=${latitude}&lon=${longitude}&category=${category}&radius=${radius}&sources=${sources}`,
        recommendationsSchema,
      ).then((r) => {
        // Nothing found because the providers failed is an outage, not an empty area.
        if (r.results.length === 0 && r.warnings?.length)
          throw new ApiError(r.warnings.join(', '), 503, '/api/recommendations/query');
        return r.results;
      }),
    immich: {
      /** Smart search; slow on big libraries. Paginated: pass the `next` URL back as `page`. */
      search: (query: string, page?: string | null) =>
        get(
          page ? pathOf(page) : `/api/integrations/immich/search?query=${encodeURIComponent(query)}`,
          immichPageSchema,
        ),
      albums: () => get('/api/integrations/immich/albums', z.array(immichAlbumSchema)),
      album: (albumId: string, page?: string | null) =>
        get(page ? pathOf(page) : `/api/integrations/immich/albums/${id(albumId)}`, immichPageSchema),
    },
    /** World travel: own endpoints outside the one-request-per-collection rule (docs/adr/0002). */
    world: {
      stats: async () => (await get('/api/stats/dashboard', dashboardSchema)).stats,
      pins: () => get('/api/locations/pins', z.array(pinSchema)),
      countries: () => get('/api/countries', z.array(countrySchema)),
      regions: (countryCode: string) => get(`/api/${id(countryCode)}/regions`, z.array(regionSchema)),
      regionVisits: (countryCode: string) => get(`/api/${id(countryCode)}/visits`, z.array(visitedRegionSchema)),
      cities: (regionId: string) => get(`/api/regions/${id(regionId)}/cities`, z.array(citySchema)),
      cityVisits: (regionId: string) => get(`/api/regions/${id(regionId)}/cities/visits`, z.array(visitedCitySchema)),
    },
    /** Own collections (incl. those you shared) + collections shared with you, de-duplicated. */
    async listCollections(): Promise<CollectionSummary[]> {
      const own: CollectionSummary[] = [];
      let next: string | null | undefined = '/api/collections';
      while (next) {
        const page: CollectionPage = await get(
          next.startsWith('http') ? next.slice(base.length) : next,
          collectionPageSchema,
        );
        own.push(...page.results);
        next = page.next;
      }
      const shared = await get('/api/collections/shared', lenientArray(collectionSummarySchema, 'collections'));
      const seen = new Set(own.map((c) => c.id));
      return [...own, ...shared.filter((c) => !seen.has(c.id))];
    },
    /** A public profile (or your own); 404 when it isn't public. */
    profile: (username: string) => get(`/auth/user/${id(username)}`, publicProfileSchema),
    /** The same counts as the dashboard, for a public profile (or your own). */
    profileStats: (username: string) => get(`/api/stats/counts/${id(username)}`, statsSchema),
    /** One location with the ids of all its collections. */
    getLocation(locationId: string) {
      return get(`/api/locations/${id(locationId)}`, locationSchema);
    },
    /** Personal location library, including locations outside collections. Collection screens keep their own read. */
    async listLocations() {
      const locations: z.infer<typeof locationSchema>[] = [];
      let next: string | null | undefined = '/api/locations';
      while (next) {
        const page: { results: z.infer<typeof locationSchema>[]; next?: string | null } = await get(
          pathOf(next),
          paginatedSchema(locationSchema),
        );
        locations.push(...page.results);
        next = page.next;
      }
      return locations;
    },
    /** The whole collection in one request. */
    getCollection(id: string): Promise<Collection> {
      return get(`/api/collections/${encodeURIComponent(id)}`, collectionSchema);
    },
    listCategories() {
      return get('/api/categories', z.array(categorySchema));
    },
    searchPlaces(query: string) {
      return get(`/api/reverse-geocode/search?query=${encodeURIComponent(query)}`, z.array(placeResultSchema));
    },
    reverseGeocode(latitude: number, longitude: number) {
      return get(`/api/reverse-geocode/reverse_geocode?lat=${latitude}&lon=${longitude}`, reverseGeocodeSchema);
    },
    listInvites() {
      return get('/api/collections/invites', z.array(inviteSchema));
    },
    /** Users with a public profile; the shape is checked leniently until verified with a second account. */
    listUsers() {
      return get(
        '/auth/users',
        z.union([z.array(publicUserSchema), paginatedSchema(publicUserSchema).transform((p) => p.results)]),
      );
    },
    listApiKeys: () =>
      get(
        '/auth/api-keys',
        z.union([z.array(apiKeySchema), paginatedSchema(apiKeySchema).transform((p) => p.results)]),
      ),
    getUser(): Promise<User> {
      return get('/auth/user-metadata', userSchema);
    },
    /** Top-level field names of a collection, for the sign-in compatibility check (`checkServer`). */
    async collectionFields(id: string): Promise<string[]> {
      return Object.keys(await get(`/api/collections/${encodeURIComponent(id)}`, z.record(z.string(), z.unknown())));
    },
    /**
     * Revokes this device's key on the server (best effort). The key itself is never returned by the API,
     * so it is matched by its stored `key_prefix`.
     */
    async revokeOwnKey(): Promise<boolean> {
      const keys = await get(
        '/auth/api-keys',
        z.union([z.array(apiKeySchema), paginatedSchema(apiKeySchema).transform((p) => p.results)]),
      );
      const own = keys.find((k) => k.key_prefix && apiKey.startsWith(k.key_prefix));
      if (!own) return false;
      const res = await fetchImpl(`${base}/auth/api-keys/${encodeURIComponent(own.id)}`, {
        method: 'DELETE',
        // Without a JSON content type the website's proxy rejects the DELETE as a cross-site form (403).
        headers: { 'Content-Type': 'application/json', ...authHeaders(apiKey) },
      });
      return res.ok;
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
