import { z } from 'zod';

import { lenientArray } from './compat';

/**
 * Runtime schemas for the AdventureLog responses the app uses.
 * Based on docs/samples/collection-detail.json (v0.13.1). Unknown fields are stripped;
 * anything not needed for identity is nullish so a server-side change degrades instead of crashing.
 */

const str = z.string();
const optStr = z.string().nullish();
const optNum = z.number().nullish();
/** Decimal fields (price) arrive as strings; accept numbers too. */
const decimal = z.union([z.string(), z.number()]).nullish();

export const imageSchema = z.object({
  id: str,
  image: str,
  is_primary: z.boolean().nullish(),
  /** Uploader's uuid; only own images can become the collection's cover. */
  user: optStr,
  source: optStr,
  immich_id: optStr,
});

export const attachmentSchema = z.object({
  id: str,
  file: str,
  extension: optStr,
  name: optStr,
});

export const categorySchema = z.object({
  id: str,
  name: str,
  display_name: optStr,
  icon: optStr,
});

/** `GET /api/categories`: the user's own categories with usage. */
export const categoryWithCountSchema = categorySchema.extend({ num_locations: optNum });

/**
 * An activity of a visit (a hike, a ride …), with an optional GPX track. Distances and elevation in metres,
 * durations in Django's `HH:MM:SS`. The server also sends `geojson`, which the app doesn't keep.
 */
export const activitySchema = z.object({
  id: str,
  visit: optStr,
  name: str,
  sport_type: optStr,
  gpx_file: optStr,
  distance: optNum,
  moving_time: optStr,
  elapsed_time: optStr,
  elevation_gain: optNum,
  elevation_loss: optNum,
  start_date: optStr,
  timezone: optStr,
  calories: optNum,
});
export type Activity = z.infer<typeof activitySchema>;

/** A trail linked to a location: a name and a link (AllTrails, Komoot, Wanderer …). */
export const trailSchema = z.object({
  id: str,
  name: str,
  link: optStr,
  provider: optStr,
  wanderer_link: optStr,
});
export type Trail = z.infer<typeof trailSchema>;

export const visitSchema = z.object({
  id: str,
  start_date: optStr,
  end_date: optStr,
  timezone: optStr,
  notes: optStr,
  activities: lenientArray(activitySchema, 'activities').default([]),
});

export const locationSchema = z.object({
  id: str,
  name: str,
  created_at: optStr,
  updated_at: optStr,
  description: optStr,
  location: optStr,
  link: optStr,
  latitude: optNum,
  longitude: optNum,
  tags: z.array(str).nullish(),
  category: categorySchema.nullish(),
  rating: optNum,
  price: decimal,
  price_currency: optStr,
  is_visited: z.boolean().nullish(),
  is_public: z.boolean().nullish(),
  /** Filled by the server's background geocoding; the code gives the location its time zone. */
  country: z.object({ country_code: optStr }).nullish().catch(null),
  /** Ids of all collections the location is in (it can be in several). */
  collections: z.array(str).nullish(),
  trails: lenientArray(trailSchema, 'trails').default([]),
  images: lenientArray(imageSchema, 'images').default([]),
  attachments: lenientArray(attachmentSchema, 'attachments').default([]),
  visits: lenientArray(visitSchema, 'visits').default([]),
});

export const lodgingSchema = z.object({
  id: str,
  name: str,
  type: optStr,
  description: optStr,
  link: optStr,
  check_in: optStr,
  check_out: optStr,
  timezone: optStr,
  reservation_number: optStr,
  is_public: z.boolean().nullish(),
  price: decimal,
  price_currency: optStr,
  rating: optNum,
  location: optStr,
  latitude: optNum,
  longitude: optNum,
  images: lenientArray(imageSchema, 'images').default([]),
  attachments: lenientArray(attachmentSchema, 'attachments').default([]),
});

export const transportationSchema = z.object({
  id: str,
  type: str,
  name: str,
  description: optStr,
  link: optStr,
  date: optStr,
  end_date: optStr,
  start_timezone: optStr,
  end_timezone: optStr,
  from_location: optStr,
  to_location: optStr,
  start_code: optStr,
  end_code: optStr,
  flight_number: optStr,
  is_public: z.boolean().nullish(),
  price: decimal,
  price_currency: optStr,
  rating: optNum,
  origin_latitude: optNum,
  origin_longitude: optNum,
  destination_latitude: optNum,
  destination_longitude: optNum,
  travel_duration_minutes: optNum,
  images: lenientArray(imageSchema, 'images').default([]),
  attachments: lenientArray(attachmentSchema, 'attachments').default([]),
});

export const noteSchema = z.object({
  id: str,
  name: str,
  content: optStr,
  date: optStr,
  links: z.array(str).nullish(),
  is_public: z.boolean().nullish(),
});

export const checklistSchema = z.object({
  id: str,
  name: str,
  date: optStr,
  items: z.array(z.object({ id: str, name: str, is_checked: z.boolean().nullish() })).default([]),
});

export const itineraryDaySchema = z.object({
  id: str,
  date: str,
  name: optStr,
  description: optStr,
});

export const itineraryContentTypes = ['location', 'transportation', 'lodging', 'note', 'checklist'] as const;

export const itineraryItemSchema = z.object({
  id: str,
  content_type: str,
  object_id: str,
  object_name: optStr,
  date: optStr,
  is_global: z.boolean().default(false),
  order: z.number().default(0),
  start_datetime: optStr,
  end_datetime: optStr,
});

export const collaboratorSchema = z.object({
  uuid: str,
  username: str,
  first_name: optStr,
  last_name: optStr,
  is_owner: z.boolean().nullish(),
  is_current_user: z.boolean().nullish(),
});

/** Collection list item (`GET /api/collections`, `/api/collections/shared`). */
export const collectionSummarySchema = z.object({
  id: str,
  name: str,
  description: optStr,
  start_date: optStr,
  end_date: optStr,
  is_archived: z.boolean().nullish(),
  is_public: z.boolean().nullish(),
  status: optStr,
  days_until_start: optNum,
  primary_image: imageSchema.nullish(),
  /** Images of the collection's locations (list endpoint only); fallback cover. */
  location_images: lenientArray(imageSchema, 'location_images').nullish(),
});

/** Full collection: `GET /api/collections/{id}`. Everything the app shows comes from this one response. */
export const collectionSchema = collectionSummarySchema.extend({
  link: optStr,
  /** Owner's uuid. */
  user: optStr,
  /** Uuids of the users it is shared with (only filled for the owner). */
  shared_with: z.array(z.unknown()).nullish(),
  locations: lenientArray(locationSchema, 'locations').default([]),
  lodging: lenientArray(lodgingSchema, 'lodging').default([]),
  transportations: lenientArray(transportationSchema, 'transportations').default([]),
  notes: lenientArray(noteSchema, 'notes').default([]),
  checklists: lenientArray(checklistSchema, 'checklists').default([]),
  itinerary: lenientArray(itineraryItemSchema, 'itinerary').default([]),
  itinerary_days: lenientArray(itineraryDaySchema, 'itinerary_days').default([]),
  collaborators: lenientArray(collaboratorSchema, 'collaborators').default([]),
});

/** `GET /api/reverse-geocode/search?query=` (Nominatim results through the server). */
export const placeResultSchema = z.object({
  lat: z.union([z.number(), z.string()]).transform(Number),
  lon: z.union([z.number(), z.string()]).transform(Number),
  name: optStr,
  display_name: optStr,
  type: optStr,
  category: optStr,
});

/** `GET /api/reverse-geocode/reverse_geocode?lat&lon`: no street address, only names. */
export const reverseGeocodeSchema = z.object({
  location_name: optStr,
  display_name: optStr,
  city: optStr,
  region: optStr,
  country: optStr,
});

/** Pending invite for the signed-in user (`GET /api/collections/invites`). */
export const inviteSchema = z.object({
  // A number or a UUID depending on the server version.
  id: z.union([str, z.number()]).transform(String),
  collection: str,
  name: optStr,
  collection_owner_username: optStr,
  collection_user_first_name: optStr,
  collection_user_last_name: optStr,
});

/** Users that can be invited (`GET /auth/users`: public profiles only). */
export const publicUserSchema = z.object({
  uuid: str,
  username: str,
  first_name: optStr,
  last_name: optStr,
  profile_pic: optStr,
  date_joined: optStr,
});

/** `GET /auth/user/{username}`: a public profile with its public locations ("adventures") and collections. */
export const publicProfileSchema = z.object({
  user: publicUserSchema,
  adventures: lenientArray(locationSchema, 'adventures').default([]),
  collections: lenientArray(collectionSummarySchema, 'collections').default([]),
});

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    count: z.number(),
    next: z.string().nullish(),
    previous: z.string().nullish(),
    results: lenientArray(item, 'results'),
  });

export const apiKeySchema = z.object({
  id: str,
  name: optStr,
  key_prefix: optStr,
  created_at: optStr,
  last_used_at: optStr,
});

export const userSchema = z.object({
  uuid: str.nullish(),
  username: str,
  first_name: optStr,
  last_name: optStr,
  email: optStr,
  public_profile: z.boolean().optional(),
  is_staff: z.boolean().optional(),
  has_password: z.boolean().optional(),
  disable_password: z.boolean().optional(),
  measurement_system: z.enum(['metric', 'imperial']).optional(),
  default_currency: optStr,
  date_format: optStr,
});

/*
 * World travel (`/world`): stats, pins of all locations, countries and regions. These come from their own
 * endpoints, not from the collection; see SERVER.md → World.
 */

/** Counts arrive as numbers; the OpenAPI schema types some as strings. */
const count = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => (v == null ? 0 : Number(v) || 0));

/** `GET /api/stats/dashboard` → `stats` (activity numbers are not used). */
export const statsSchema = z.object({
  location_count: count,
  visited_location_count: count,
  trips_count: count,
  visited_city_count: count,
  total_cities: count,
  visited_region_count: count,
  total_regions: count,
  visited_country_count: count,
  total_countries: count,
  /** Activities (visits with GPS tracks): count, metres. */
  activity_count: optNum,
  activity_distance: optNum,
});

export const dashboardSchema = z.object({ stats: statsSchema });

/** `GET /api/locations/pins`: every location of the user, across all collections (plain array). */
export const pinSchema = z.object({
  id: str,
  name: str,
  latitude: optNum,
  longitude: optNum,
  is_visited: z.boolean().nullish(),
  category: categorySchema.nullish(),
});

/** `GET /api/countries` (plain array, ~250). */
export const countrySchema = z.object({
  id: z.number(),
  name: str,
  country_code: str,
  subregion: optStr,
  capital: optStr,
  num_regions: count,
  num_visits: count,
  latitude: optNum,
  longitude: optNum,
});

/** `GET /api/{country_code}/regions`. `id` is the region code (`JP-13`). */
export const regionSchema = z.object({
  id: str,
  name: str,
  num_cities: count,
  latitude: optNum,
  longitude: optNum,
});

/** `GET /api/regions/{id}/cities`. `id` is a city code like the region's. */
export const citySchema = z.object({
  id: str,
  name: str,
  region: optStr,
  latitude: optNum,
  longitude: optNum,
});

/** `GET /api/regions/{id}/cities/visits`, `POST /api/visitedcity`. `city` is the city code. */
export const visitedCitySchema = z.object({
  id: z.number(),
  city: str,
  name: optStr,
});

/** `POST /api/reverse-geocode/mark_visited_region`: what it newly marked (code → name). */
export const markedFromLocationsSchema = z.object({
  new_regions: count,
  new_cities: count,
  regions: z.record(z.string(), z.string()).default({}),
  cities: z.record(z.string(), z.string()).default({}),
});

/** `GET /api/{country_code}/visits`, `POST /api/visitedregion`. `region` is the region code. */
export const visitedRegionSchema = z.object({
  id: z.number(),
  region: str,
  name: optStr,
});

/** `GET /api/calendar/events` → `events`. `start` / `end` are a date or a UTC datetime. */
export const calendarEventSchema = z.object({
  id: str,
  type: str,
  title: z.string().default(''),
  start: str,
  end: optStr,
  all_day: z.boolean().nullish(),
  timezone: optStr,
  icon: optStr,
  color: optStr,
  location_label: optStr,
  resource_id: optStr,
  collection_id: optStr,
  collection_name: optStr,
});

/** `GET /api/integrations`: which integrations the user has set up. */
export const integrationsSchema = z.object({
  immich: z.object({ exists: z.boolean(), copy_locally: z.boolean().optional() }).nullish(),
  strava: z.object({ user: z.boolean().nullish(), global: z.boolean().optional() }).nullish(),
  wanderer: z.object({ exists: z.boolean() }).nullish(),
  endurain: z.object({ exists: z.boolean() }).nullish(),
  /** The server has a `GOOGLE_MAPS_API_KEY` (places, geocoding, recommendations from Google). */
  google_maps: z.boolean().nullish(),
});

/** Management responses deliberately discard credentials returned by older Immich servers. */
export const integrationSettingsSchema = z.object({
  id: str,
  server_url: str,
  copy_locally: z.boolean().optional(),
  username: optStr,
  auth_method: optStr,
});
export const endurainConnectSchema = z.union([
  integrationSettingsSchema,
  z.object({ mfa_required: z.literal(true), mfa_token: str }),
]);
export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

/** `POST /api/locations/check-duplicates` → `matches`: the user's own locations that look like the new one. */
export const duplicateMatchSchema = z.object({
  id: str,
  name: str,
  location: optStr,
  score: optNum,
  distance_meters: optNum,
  reasons: z.array(str).default([]),
  is_visited: z.boolean().nullish(),
});
export type DuplicateMatch = z.infer<typeof duplicateMatchSchema>;

/** `GET /api/generate/desc`: the Wikipedia page found for a name (404 when none). */
export const wikipediaPageSchema = z.object({ title: optStr, extract: optStr });

/** `GET /api/generate/img` → `images` (404 when none). `source` is a public image URL on Wikimedia. */
export const webImageSchema = z.object({ source: str, title: optStr, width: optNum, height: optNum });
export type WebImage = z.infer<typeof webImageSchema>;

/** `POST /api/images/import_from_urls`: the images the server could download. */
export const importedImagesSchema = z.object({
  created: lenientArray(imageSchema, 'created').default([]),
  created_count: count,
  requested_count: count,
});

/** One place from `GET /api/recommendations/query` (OpenStreetMap, plus Google when the server has a key). */
export const recommendationSchema = z.object({
  id: str,
  name: str,
  source: optStr,
  description: optStr,
  latitude: optNum,
  longitude: optNum,
  address: optStr,
  distance_km: optNum,
  rating: optNum,
  review_count: optNum,
  website: optStr,
  types: z.array(str).nullish(),
  photos: z.array(str).nullish(),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const recommendationsSchema = z.object({
  results: lenientArray(recommendationSchema, 'results').default([]),
  /** e.g. `OpenStreetMap query error` when the server can't reach Overpass. */
  warnings: z.array(str).nullish(),
});

/** Immich asset from `/api/integrations/immich/search` or `…/albums/{id}` (paginated). */
export const immichAssetSchema = z.object({
  id: str,
  image_url: str,
  type: optStr,
  originalFileName: optStr,
  localDateTime: optStr,
  fileCreatedAt: optStr,
});

export const immichAlbumSchema = z.object({
  id: str,
  albumName: z.string().default(''),
  assetCount: optNum,
  startDate: optStr,
  endDate: optStr,
});

export type Stats = z.infer<typeof statsSchema>;
export type Pin = z.infer<typeof pinSchema>;
export type Country = z.infer<typeof countrySchema>;
export type Region = z.infer<typeof regionSchema>;
export type VisitedRegion = z.infer<typeof visitedRegionSchema>;
export type City = z.infer<typeof citySchema>;
export type VisitedCity = z.infer<typeof visitedCitySchema>;
export type CategoryWithCount = z.infer<typeof categoryWithCountSchema>;
export type Invite = z.infer<typeof inviteSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type ImmichAsset = z.infer<typeof immichAssetSchema>;
export type ImmichAlbum = z.infer<typeof immichAlbumSchema>;

export type Image = z.infer<typeof imageSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Visit = z.infer<typeof visitSchema>;
export type Lodging = z.infer<typeof lodgingSchema>;
export type Transportation = z.infer<typeof transportationSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Checklist = z.infer<typeof checklistSchema>;
export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type User = z.infer<typeof userSchema>;
export type Category = z.infer<typeof categorySchema>;
export type PlaceResult = z.infer<typeof placeResultSchema>;
export type ReverseGeocode = z.infer<typeof reverseGeocodeSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
