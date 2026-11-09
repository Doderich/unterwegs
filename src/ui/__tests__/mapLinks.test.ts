import { Alert, Linking, Platform } from 'react-native';

import { getSettings, settingsSchema, updateSettings, type MapApp } from '@/settings/store';
import { mapSearchUrl, mapUrl, openInMaps } from '../mapLinks';

jest.mock('expo-sqlite/kv-store', () => ({ Storage: { getItemSync: jest.fn(), setItemSync: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  updateSettings({ mapApp: 'system' });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it.each<[MapApp, string, string]>([
  ['system', 'ios', 'https://maps.apple.com/?q=Temple&ll=35,135'],
  ['system', 'android', 'geo:35,135?q=35,135(Temple)'],
  ['apple', 'ios', 'https://maps.apple.com/?q=Temple&ll=35,135'],
  ['google', 'ios', 'https://www.google.com/maps/search/?api=1&query=35%2C135'],
  ['google', 'android', 'https://www.google.com/maps/search/?api=1&query=35%2C135'],
  ['organic', 'ios', 'om://map?v=1&ll=35,135&n=Temple'],
  ['organic', 'android', 'om://map?v=1&ll=35,135&n=Temple'],
  ['osmand', 'ios', 'osmandmaps://?lat=35&lon=135&z=16&title=Temple'],
  ['osmand', 'android', 'osmand.geo:35,135?q=35,135(Temple)'],
])('opens %s on %s at the exact coordinates', (app, platform, expected) => {
  expect(mapUrl(app, platform, 'Temple', 35, 135)).toBe(expected);
});

it('encodes names and supports address-only searches without inventing coordinates', () => {
  expect(mapUrl('organic', 'ios', '寺 & Café?')).toBe('om://search?query=%E5%AF%BA%20%26%20Caf%C3%A9%3F');
  expect(mapUrl('osmand', 'android', 'Kyoto')).toBe('osmand.geo:0,0?q=Kyoto');
  expect(mapUrl('google', 'ios', 'Kyoto', NaN, 135)).toContain('query=Kyoto');
  expect(mapUrl('apple', 'ios', 'Origin', 0, 0)).toContain('ll=0,0');
  expect(mapUrl('osmand', 'ios', 'No coordinates')).toBeNull();
});

it('uses a changed preference on the next tap without restarting', async () => {
  Platform.OS = 'ios';
  await openInMaps('Temple', 35, 135);
  expect(Linking.openURL).toHaveBeenLastCalledWith(expect.stringContaining('maps.apple.com'));
  updateSettings({ mapApp: 'organic' });
  await openInMaps('Temple', 35, 135);
  expect(Linking.openURL).toHaveBeenLastCalledWith('om://map?v=1&ll=35,135&n=Temple');
  expect(getSettings().mapApp).toBe('organic');
});

it('reports an unavailable app without silently launching a different provider', async () => {
  updateSettings({ mapApp: 'organic' });
  jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('not installed'));
  await expect(openInMaps('Temple', 35, 135)).resolves.toBeUndefined();
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalled();
});

it('reports when OsmAnd on iOS needs coordinates instead of sending the user to 0,0', async () => {
  Platform.OS = 'ios';
  updateSettings({ mapApp: 'osmand' });
  await openInMaps('Address only');
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

it('migrates existing settings and falls back safely from unknown providers', () => {
  expect(settingsSchema.parse({ boldText: true })).toMatchObject({ boldText: true, mapApp: 'system' });
  expect(settingsSchema.parse({ mapApp: 'unknown' }).mapApp).toBe('system');
});

it('searches around the point in each maps app when the server finds nothing', () => {
  const at = [35.0116, 135.7681] as const;
  expect(mapSearchUrl('apple', 'ios', 'Restaurants', ...at)).toBe(
    'https://maps.apple.com/?q=Restaurants&sll=35.0116,135.7681',
  );
  expect(mapSearchUrl('system', 'android', 'Restaurants', ...at)).toBe('geo:35.0116,135.7681?q=Restaurants');
  expect(mapSearchUrl('google', 'ios', 'Food & drink', ...at)).toBe(
    'https://www.google.com/maps/search/Food%20%26%20drink/@35.0116,135.7681,15z',
  );
  expect(mapSearchUrl('organic', 'android', 'Sights', ...at)).toBe('om://search?query=Sights&cll=35.0116,135.7681');
  // OsmAnd has no search link: the system app takes over.
  expect(mapSearchUrl('osmand', 'ios', 'Sights', ...at)).toBe('https://maps.apple.com/?q=Sights&sll=35.0116,135.7681');
});
