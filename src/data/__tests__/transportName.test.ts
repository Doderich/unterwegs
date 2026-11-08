import { transportRoute, transportTitle } from '../transportName';

const leg = {
  name: 'LH716',
  from_location: 'Frankfurt',
  to_location: 'Tokyo',
  start_code: 'FRA',
  end_code: 'NRT',
};

describe('transport names', () => {
  it('writes the long list title with codes, and the short glance route as codes', () => {
    expect(transportTitle(leg)).toBe('Frankfurt (FRA) → Tokyo (NRT)');
    expect(transportRoute(leg)).toBe('FRA → NRT');
  });

  it('falls back to the stored name when a place is missing, and to a place when a code is missing', () => {
    expect(transportTitle({ ...leg, to_location: null })).toBe('LH716');
    expect(transportRoute({ ...leg, start_code: null, end_code: null })).toBe('Frankfurt → Tokyo');
    expect(transportRoute({ ...leg, from_location: null, to_location: null, start_code: null, end_code: null })).toBe(
      '',
    );
  });
});
