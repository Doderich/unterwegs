import { zoneForPlace, suggestedZone } from '../placeZone';

describe('zoneForPlace', () => {
  it('takes the only zone of a single-zone country', () => {
    expect(zoneForPlace('JP', 35.04, 135.73)).toBe('Asia/Tokyo');
    expect(zoneForPlace('jp', 43.06, 141.35)).toBe('Asia/Tokyo');
  });

  it('picks the nearest reference point in a country with several zones', () => {
    expect(zoneForPlace('US', 37.77, -122.42)).toBe('America/Los_Angeles');
    expect(zoneForPlace('US', 40.71, -74.0)).toBe('America/New_York');
    expect(zoneForPlace('AU', -33.87, 151.21)).toBe('Australia/Sydney');
  });

  it('knows nothing without a country it can place', () => {
    expect(zoneForPlace(null, 35, 135)).toBeNull();
    expect(zoneForPlace('XX', 35, 135)).toBeNull();
  });
});

describe('coordinate time-zone suggestions', () => {
  it.each([
    [35.04, 135.73, 'Asia/Tokyo'],
    [50.05, 8.57, 'Europe/Berlin'],
    [40.71, -74, 'America/New_York'],
    [27.7, 85.32, 'Asia/Kathmandu'],
    [-33.87, 151.21, 'Australia/Sydney'],
  ])('suggests the local zone at %s, %s', (lat, lon, zone) => {
    expect(suggestedZone(lat, lon)).toBe(zone);
  });
  it('rejects invalid coordinates', () => {
    expect(suggestedZone(NaN, 0)).toBeNull();
    expect(suggestedZone(91, 0)).toBeNull();
  });
});
