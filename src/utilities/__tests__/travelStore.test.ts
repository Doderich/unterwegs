const mockMemory = new Map<string, string>();
let mockFailWrite = false;
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (key: string) => mockMemory.get(key) ?? null,
    setItemSync: (key: string, value: string) => {
      if (mockFailWrite) throw new Error('full');
      mockMemory.set(key, value);
    },
  },
}));

beforeEach(() => {
  mockMemory.clear();
  mockFailWrite = false;
  jest.resetModules();
});
it('persists essentials and tool preferences across restarts; clearing essentials preserves preferences', () => {
  let store = jest.requireActual<typeof import('../travelStore')>('../travelStore');
  store.saveEssentials({ contacts: 'Alex: +81 000 000', insurance: 'Example policy', phrases: 'Hello · こんにちは' });
  store.saveUnitPair('weight', 'lb', 'kg');
  store.updateTravelPreferences({ homeZone: 'Europe/Berlin', awayZone: 'Asia/Tokyo' });
  jest.resetModules();
  store = jest.requireActual<typeof import('../travelStore')>('../travelStore');
  expect(JSON.parse(mockMemory.get('unterwegs.travel-essentials.v1')!)).toMatchObject({ insurance: 'Example policy' });
  store.clearEssentials();
  expect(JSON.parse(mockMemory.get('unterwegs.travel-essentials.v1')!)).toEqual({
    contacts: '',
    insurance: '',
    phrases: '',
  });
  expect(JSON.parse(mockMemory.get('unterwegs.travel-tools.v1')!)).toMatchObject({
    homeZone: 'Europe/Berlin',
    unitPairs: { weight: { from: 'lb', to: 'kg' } },
  });
});
it('recovers corrupt records and refuses incompatible saved pairs', () => {
  mockMemory.set('unterwegs.travel-tools.v1', '{bad');
  mockMemory.set('unterwegs.travel-essentials.v1', '{bad');
  const store = jest.requireActual<typeof import('../travelStore')>('../travelStore');
  expect(() => store.saveUnitPair('weight', 'km', 'lb')).toThrow();
  store.saveUnitPair('distance', 'mi', 'km');
  store.clearEssentials();
  expect(() => store.updateTravelPreferences({ homeZone: 'Bad/Zone' })).toThrow();
});
it('does not replace the last saved content when storage fails', () => {
  const store = jest.requireActual<typeof import('../travelStore')>('../travelStore');
  const original = { contacts: 'Alex', insurance: '', phrases: '' };
  store.saveEssentials(original);
  mockFailWrite = true;
  expect(() => store.saveEssentials({ ...original, contacts: 'Changed' })).toThrow('full');
  expect(JSON.parse(mockMemory.get('unterwegs.travel-essentials.v1')!)).toEqual(original);
});
