import type { Collection } from '@/api/schemas';

import { suggestionZones } from '../suggestionZones';

describe('suggestionZones', () => {
  it('offers the collection zone, lodging zones, transportation ends, then the phone', () => {
    const collection = {
      lodging: [{ timezone: 'Asia/Tokyo' }, { timezone: null }],
      transportations: [{ start_timezone: 'Europe/Berlin', end_timezone: 'Asia/Tokyo' }],
    } as unknown as Pick<Collection, 'lodging' | 'transportations'>;
    expect(suggestionZones('Asia/Tokyo', collection, 'Europe/Berlin')).toEqual([
      'Asia/Tokyo',
      'Asia/Tokyo',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Europe/Berlin',
    ]);
  });
});
