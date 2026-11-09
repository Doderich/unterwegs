import { currencyName, currencySections } from '../currencyCatalogue';

it('searches bundled names and codes in every app language without a network', () => {
  expect(currencySections('jpy', 'de').all).toEqual(['JPY']);
  expect(currencySections('yen', 'en').all).toContain('JPY');
  expect(currencySections('円', 'ja').all).toContain('JPY');
  expect(currencySections('danische', 'de').all).toContain('DKK');
  expect(currencySections('not a currency', 'en')).toEqual({ popular: [], all: [] });
});

it('keeps selected currencies in popular choices and exposes the full offline catalogue', () => {
  const sections = currencySections('', 'en', ['JPY', 'CHF', 'ABC']);
  expect(sections.popular.slice(0, 3)).toEqual(['JPY', 'CHF', 'ABC']);
  expect(new Set(sections.popular).size).toBe(sections.popular.length);
  expect(sections.all.length).toBeGreaterThan(100);
  expect(sections.all).toContain('ABC');
  expect(currencyName('JPY', 'de')).toBe('Japanischer Yen');
  expect(currencyName('ABC', 'ja')).toBe('ABC');
});
