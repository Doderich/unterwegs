import {
  convert,
  fetchRate,
  findRate,
  formatMoney,
  initialCurrencyPair,
  parseDecimal,
  selectCurrency,
} from '../currency';

describe('currency calculations', () => {
  it('swaps both sides when either menu selects the opposite currency', () => {
    expect(selectCurrency({ base: 'EUR', quote: 'JPY' }, 'base', 'JPY')).toEqual({ base: 'JPY', quote: 'EUR' });
    expect(selectCurrency({ base: 'EUR', quote: 'JPY' }, 'quote', 'EUR')).toEqual({ base: 'JPY', quote: 'EUR' });
    expect(selectCurrency({ base: 'EUR', quote: 'JPY' }, 'quote', 'CHF')).toEqual({ base: 'EUR', quote: 'CHF' });
    expect(selectCurrency({ base: 'EUR', quote: 'JPY' }, 'base', 'EUR')).toEqual({ base: 'EUR', quote: 'JPY' });
  });
  it('starts with the account currency, follows its arrival, and retains saved choices', () => {
    expect(initialCurrencyPair({}, undefined)).toEqual({ base: 'EUR', quote: 'JPY' });
    expect(initialCurrencyPair({}, ' chf ')).toEqual({ base: 'CHF', quote: 'JPY' });
    expect(initialCurrencyPair({}, 'JPY')).toEqual({ base: 'JPY', quote: 'EUR' });
    expect(initialCurrencyPair({}, 'invalid')).toEqual({ base: 'EUR', quote: 'JPY' });
    expect(initialCurrencyPair({ base: 'USD', quote: 'CAD' }, 'EUR')).toEqual({ base: 'USD', quote: 'CAD' });
  });
  it.each([
    ['1.234,50', 'de-DE', '1234.50'],
    ['1,234.50', 'en-GB', '1234.50'],
    ['１２３４．５', 'ja-JP', '1234.5'],
    ['89.50', 'de-DE', '89.50'],
    ['89,50', 'en-GB', '89.50'],
    ['1.234', 'de-DE', '1234'],
    ['1,234', 'en-GB', '1234'],
    ['0,001', 'de-DE', '0.001'],
  ])('parses %s in %s', (input, locale, expected) => expect(parseDecimal(input, locale)).toBe(expected));

  it.each(['', '-1', '1e9', 'NaN', 'Infinity', '1,2,3', '1.23.456', '9999999999999999999'])('rejects %s', (input) => {
    expect(parseDecimal(input, 'en-GB')).toBeNull();
  });

  it('rounds exact products once at each currency precision, including large amounts', () => {
    expect(convert('0.1', '0.2', 'EUR')).toBe('0.02');
    expect(convert('1', '1.005', 'EUR')).toBe('1.01');
    expect(convert('1', '177.5', 'JPY')).toBe('178');
    expect(convert('1', '0.3075', 'KWD')).toBe('0.308');
    expect(convert('999999999999999999', '1', 'EUR')).toBe('999999999999999999.00');
    expect(convert('0', '177', 'JPY')).toBe('0');
    expect(convert('2', '0', 'EUR')).toBeNull();
    expect(convert('1', '0.000001', 'EUR')).toBe('0.00');
  });

  it('converts with an exact reciprocal instead of storing a rounded inverse', () => {
    expect(convert('1000', '160', 'EUR', true)).toBe('6.25');
    const rate = { base: 'EUR', quote: 'JPY', rate: '160', date: '2026-11-09', fetchedAt: 1 };
    expect(findRate({ 'EUR/JPY': rate }, 'JPY', 'EUR')).toEqual({ ...rate, inverse: true });
    expect(findRate({ 'EUR/JPY': rate }, 'EUR', 'USD')).toBeNull();
  });

  it('formats exact large values and currency fractions in all supported locales', () => {
    expect(formatMoney('999999999999999999.23', 'EUR', 'en-GB')).toContain('999,999,999,999,999,999.23');
    expect(formatMoney('1234.50', 'EUR', 'de-DE')).toContain('1.234,50');
    expect(formatMoney('1234', 'JPY', 'ja-JP')).toContain('1,234');
    expect(formatMoney('0.308', 'KWD', 'en-GB')).toContain('0.308');
  });

  it('works when the runtime has no usable Intl formatToParts', () => {
    const method = jest.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockImplementation(() => {
      throw new Error('not supported by this runtime');
    });
    try {
      expect(formatMoney('1234.50', 'EUR', 'de-DE')).toBe('1.234,50\u00a0EUR');
      expect(formatMoney('1234', 'JPY', 'ja-JP')).toBe('1,234\u00a0JPY');
      expect(method).not.toHaveBeenCalled();
    } finally {
      method.mockRestore();
    }
  });
});

describe('reference rate provider', () => {
  it('does not return a superseded pair after cancellation, even if the transport completes', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockImplementation(async () => {
      controller.abort();
      return { ok: true, json: async () => ({ date: '2026-11-09', base: 'EUR', quote: 'JPY', rate: 177 }) } as Response;
    });
    await expect(fetchRate('EUR', 'JPY', fetchImpl, controller.signal)).rejects.toThrow('cancelled');
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  const payload = { date: '2026-11-09', base: 'EUR', quote: 'JPY', rate: 177.14 };
  const fetcher = (data: unknown, ok = true) =>
    jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue({
      ok,
      json: async () => data,
    } as Response);

  it('fetches only a pair without account credentials or amounts', async () => {
    const fetchImpl = fetcher(payload);
    await expect(fetchRate('EUR', 'JPY', fetchImpl)).resolves.toMatchObject({ ...payload, rate: '177.14' });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.frankfurter.dev/v2/rate/eur/jpy', {
      credentials: 'omit',
      signal: expect.any(AbortSignal),
      headers: { Accept: 'application/json' },
    });
  });

  it.each([
    { ...payload, base: 'USD' },
    { ...payload, quote: 'USD' },
    { ...payload, rate: 0 },
    { ...payload, rate: -3 },
    { ...payload, rate: 'NaN' },
    { ...payload, date: '2026-02-30' },
    {},
    null,
  ])('rejects malformed or mismatched responses', async (payload) => {
    await expect(fetchRate('EUR', 'JPY', fetcher(payload))).rejects.toThrow();
  });

  it('rejects unavailable rates without supplying a replacement', async () => {
    await expect(fetchRate('EUR', 'JPY', fetcher({}, false))).rejects.toThrow();
    const fetchImpl = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error('offline'));
    await expect(fetchRate('EUR', 'JPY', fetchImpl)).rejects.toThrow('offline');
  });
});
