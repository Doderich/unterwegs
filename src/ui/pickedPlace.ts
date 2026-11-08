import type { Collection } from '@/api/schemas';
import { nearestZone } from '@/data/selectors';
import { suggestedZone } from '@/time/placeZone';

import type { PickedPlace } from './PlaceSearch';

/**
 * What a picked place fills in: its name, address and coordinates, and the own time zone to suggest. The coordinate
 * lookup wins; a nearby lodging or transportation of this collection is the fallback when that lookup has no zone
 * the server accepts.
 */
export function fieldsFromPick(place: PickedPlace, collection: Collection | null) {
  return {
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    zone:
      suggestedZone(place.latitude, place.longitude) ??
      (collection ? nearestZone(collection, place.latitude, place.longitude) : null),
  };
}
