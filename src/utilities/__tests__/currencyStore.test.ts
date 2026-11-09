const mockMemory = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (key: string) => mockMemory.get(key) ?? null,
    setItemSync: (key: string, value: string) => mockMemory.set(key, value),
  },
}));

describe('currency offline persistence', () => {
  beforeEach(() => {
    mockMemory.clear();
    jest.resetModules();
  });

  it('keeps manual and fetched rates separate across reloads and preserves them after a failed fetch', async () => {
    let store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    const rate = { base: 'EUR', quote: 'JPY', rate: '160', date: '2026-11-09', fetchedAt: 1 };
    store.updateCurrency({ base: 'EUR', quote: 'JPY', mode: 'manual' });
    store.saveRate(rate, 'manual');
    store.saveRate({ ...rate, rate: '177.14' }, 'automatic');
    const before = mockMemory.get('unterwegs.currency.v1');
    const { fetchRate } = jest.requireActual<typeof import('../currency')>('../currency');
    await expect(
      fetchRate(
        'EUR',
        'JPY',
        jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockRejectedValue(new Error('offline')),
      ),
    ).rejects.toThrow();
    expect(mockMemory.get('unterwegs.currency.v1')).toBe(before);
    jest.resetModules();
    store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    store.updateCurrency({ mode: 'automatic' });
    const persisted = JSON.parse(mockMemory.get('unterwegs.currency.v1')!);
    expect(persisted).toMatchObject({
      base: 'EUR',
      quote: 'JPY',
      mode: 'automatic',
      manual: { 'EUR/JPY': rate },
      automatic: { 'EUR/JPY': { ...rate, rate: '177.14' } },
    });
  });

  it('recovers from invalid persisted data', async () => {
    mockMemory.set('unterwegs.currency.v1', '{broken');
    const store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    store.updateCurrency({ base: 'EUR' });
    expect(JSON.parse(mockMemory.get('unterwegs.currency.v1')!)).toEqual({
      base: 'EUR',
      mode: 'automatic',
      manual: {},
      automatic: {},
      history: [],
    });
  });

  it('defaults to Frankfurter while preserving an explicitly saved manual-source preference', () => {
    const store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    store.updateCurrency({ base: 'CHF' });
    expect(JSON.parse(mockMemory.get('unterwegs.currency.v1')!).mode).toBe('automatic');
    store.updateCurrency({ mode: 'manual' });
    jest.resetModules();
    const restored = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    restored.updateCurrency({ quote: 'JPY' });
    expect(JSON.parse(mockMemory.get('unterwegs.currency.v1')!).mode).toBe('manual');
  });

  it('migrates old preferences and keeps history snapshots through restart and rate refresh', () => {
    const rate = { base: 'EUR', quote: 'JPY', rate: '160', date: '2026-11-09', fetchedAt: 1 };
    mockMemory.set(
      'unterwegs.currency.v1',
      JSON.stringify({ base: 'JPY', quote: 'EUR', mode: 'automatic', automatic: { 'EUR/JPY': rate } }),
    );
    let store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    store.saveConversion({ base: 'JPY', quote: 'EUR', amount: '1000', mode: 'automatic', rate, inverse: true });
    store.saveRate({ ...rate, rate: '180' }, 'automatic');
    jest.resetModules();
    store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    store.updateCurrency({ mode: 'manual' });
    const persisted = JSON.parse(mockMemory.get('unterwegs.currency.v1')!);
    expect(persisted).toMatchObject({
      base: 'JPY',
      quote: 'EUR',
      automatic: { 'EUR/JPY': { rate: '180' } },
      history: [{ base: 'JPY', quote: 'EUR', amount: '1000', result: '6.25', rate, inverse: true, mode: 'automatic' }],
    });
    store.clearCurrencyHistory();
    const cleared = JSON.parse(mockMemory.get('unterwegs.currency.v1')!);
    expect(cleared.history).toEqual([]);
    expect(cleared.base).toBe('JPY');
    expect(cleared.automatic).toEqual(persisted.automatic);
  });

  it('bounds history, collapses repeated saves, and rejects invalid or mismatched calculations', () => {
    const store = jest.requireActual<typeof import('../currencyStore')>('../currencyStore');
    const rate = { base: 'EUR', quote: 'JPY', rate: '160', date: '2026-11-09', fetchedAt: 1 };
    const input = { base: 'EUR', quote: 'JPY', amount: '1', mode: 'manual' as const, rate, inverse: false };
    store.saveConversion(input);
    store.saveConversion(input);
    expect(JSON.parse(mockMemory.get('unterwegs.currency.v1')!).history).toHaveLength(1);
    for (let n = 2; n <= 105; n++) store.saveConversion({ ...input, amount: String(n) });
    const persisted = JSON.parse(mockMemory.get('unterwegs.currency.v1')!);
    expect(persisted.history).toHaveLength(100);
    expect(persisted.history[0].amount).toBe('105');
    expect(persisted.history[99].amount).toBe('6');
    expect(() => store.saveConversion({ ...input, amount: 'NaN' })).toThrow();
    expect(() => store.saveConversion({ ...input, quote: 'USD' })).toThrow();
    expect(JSON.parse(mockMemory.get('unterwegs.currency.v1')!).history).toEqual(persisted.history);
  });
});
