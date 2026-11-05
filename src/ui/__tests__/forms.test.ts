import { nextDate, parsePrice, parseServerDuration, parseTags, parseTypedDuration } from '../formValues';

describe('parsePrice', () => {
  it.each([
    ['', null],
    ['120', '120.00'],
    ['89,50', '89.50'],
    ['89.5', '89.50'],
    ['1.234,50', '1234.50'],
    ['1,234.50', '1234.50'],
    ['18000', '18000.00'],
    ['12 000', '12000.00'],
    ['abc', undefined],
    ['1,2,3', undefined],
  ])('%s → %s', (input, expected) => expect(parsePrice(input)).toBe(expected));
});

describe('nextDate', () => {
  it('crosses month and year ends', () => {
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
    expect(nextDate('2027-02-28')).toBe('2027-03-01');
  });
});

describe('parseTags', () => {
  it('splits on commas, trims, drops empty and repeated tags', () => {
    expect(parseTags(' Ramen, Nachtmarkt ,, ramen , Tempel ')).toEqual(['Ramen', 'Nachtmarkt', 'Tempel']);
    expect(parseTags('')).toEqual([]);
  });

  it('cuts a tag to the server limit of 100 characters', () => {
    expect(parseTags('x'.repeat(120))).toEqual(['x'.repeat(100)]);
  });
});

describe('durations', () => {
  it('reads the server format (Django DurationField) as seconds', () => {
    expect(parseServerDuration('01:30:00')).toBe(5400);
    expect(parseServerDuration('1 02:00:05')).toBe(93605);
    expect(parseServerDuration('00:45:10.500000')).toBe(2710);
    expect(parseServerDuration(null)).toBeNull();
    expect(parseServerDuration('nonsense')).toBeNull();
  });

  it('turns typed h:mm or minutes into the server format', () => {
    expect(parseTypedDuration('1:30')).toBe('01:30:00');
    expect(parseTypedDuration('45')).toBe('00:45:00');
    expect(parseTypedDuration('26:05')).toBe('26:05:00');
    expect(parseTypedDuration('')).toBeNull();
    expect(parseTypedDuration('1:75')).toBeUndefined();
    expect(parseTypedDuration('abc')).toBeUndefined();
  });
});
