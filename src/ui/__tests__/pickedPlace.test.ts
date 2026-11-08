import type { Collection } from '@/api/schemas';

import { fieldsFromPick } from '../pickedPlace';

const kyoto = { name: 'Kyoto', address: 'Gion', latitude: 35.04, longitude: 135.73 };

describe('fieldsFromPick', () => {
  it('fills the name, address, coordinates and the zone of those coordinates', () => {
    expect(fieldsFromPick(kyoto, null)).toEqual({ ...kyoto, zone: 'Asia/Tokyo' });
  });

  it('uses a nearby stay when the coordinate lookup has no zone', () => {
    const collection = {
      lodging: [{ latitude: 89, longitude: 0, timezone: 'Arctic/Longyearbyen' }],
      transportations: [],
    } as unknown as Collection;
    expect(fieldsFromPick({ name: 'Ice', address: null, latitude: 91, longitude: 0 }, collection).zone).toBe(
      'Arctic/Longyearbyen',
    );
  });

  it('has no zone without a collection when the lookup fails', () => {
    expect(fieldsFromPick({ name: 'Ice', address: null, latitude: 91, longitude: 0 }, null).zone).toBeNull();
  });
});
