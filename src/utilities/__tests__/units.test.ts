import { convertUnit, formatUnitAmount, parseUnitAmount } from '../units';

it('converts freezing, boiling and negative temperatures with offsets', () => {
  expect(convertUnit(0, 'temperature', 'c', 'f')).toBe(32);
  expect(convertUnit(212, 'temperature', 'f', 'c')).toBe(100);
  expect(convertUnit(-40, 'temperature', 'c', 'f')).toBe(-40);
  expect(convertUnit(-273.16, 'temperature', 'c', 'f')).toBeNull();
  expect(convertUnit(-459.67, 'temperature', 'f', 'c')).toBeCloseTo(-273.15);
});
it('keeps US liquid and imperial volume separate', () => {
  expect(convertUnit(1, 'volume', 'usGal', 'l')).toBe(3.785411784);
  expect(convertUnit(1, 'volume', 'impGal', 'l')).toBe(4.54609);
  expect(convertUnit(1000, 'volume', 'ml', 'l')).toBe(1);
});
it('converts length and mass, rejecting mismatched units and invalid input', () => {
  expect(convertUnit(1, 'distance', 'mi', 'km')).toBeCloseTo(1.609344);
  expect(convertUnit(1, 'distance', 'ft', 'm')).toBe(0.3048);
  expect(convertUnit(1, 'weight', 'lb', 'kg')).toBe(0.45359237);
  expect(convertUnit(16, 'weight', 'oz', 'lb')).toBe(1);
  expect(convertUnit(-1, 'distance', 'km', 'mi')).toBeNull();
  expect(convertUnit(1, 'distance', 'kg', 'mi')).toBeNull();
  expect(convertUnit(Infinity, 'weight', 'kg', 'lb')).toBeNull();
});
it('parses localized signed values and keeps tiny results visible', () => {
  expect(parseUnitAmount('−12,5', 'de-DE')).toBe(-12.5);
  expect(parseUnitAmount('１，２３４．５', 'ja-JP')).toBe(1234.5);
  expect(parseUnitAmount('1.234,5', 'de-DE')).toBe(1234.5);
  expect(parseUnitAmount('', 'de-DE')).toBeNull();
  expect(parseUnitAmount('1..2', 'en-US')).toBeNull();
  expect(formatUnitAmount(0.000001, 'de-DE')).toBe('0,000001');
});
