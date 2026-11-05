import { sunTimes } from '../sun';

/** Minutes between an ISO time and a wall-clock time in a zone on that date. */
function wall(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone, hourCycle: 'h23' }).format(
    new Date(iso),
  );
}
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const near = (actual: string, expected: string) =>
  expect(Math.abs(minutes(actual) - minutes(expected))).toBeLessThanOrEqual(3);

describe('sunTimes', () => {
  it('matches published times in Berlin at midsummer', () => {
    const sun = sunTimes('2026-06-21', 52.52, 13.405);
    expect(sun.kind).toBe('normal');
    if (sun.kind !== 'normal') return;
    near(wall(sun.sunrise, 'Europe/Berlin'), '04:43');
    near(wall(sun.sunset, 'Europe/Berlin'), '21:33');
  });

  it('matches published times in Tokyo at midwinter', () => {
    const sun = sunTimes('2026-12-21', 35.6895, 139.6917);
    if (sun.kind !== 'normal') throw new Error(sun.kind);
    near(wall(sun.sunrise, 'Asia/Tokyo'), '06:47');
    near(wall(sun.sunset, 'Asia/Tokyo'), '16:32');
  });

  it('puts both events on the local date, also far from Greenwich', () => {
    // Honolulu (UTC−10): the sunset falls on the next UTC day.
    const sun = sunTimes('2026-03-01', 21.3069, -157.8583);
    if (sun.kind !== 'normal') throw new Error(sun.kind);
    const day = (iso: string) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Honolulu' }).format(new Date(iso));
    expect(day(sun.sunrise)).toBe('2026-03-01');
    expect(day(sun.sunset)).toBe('2026-03-01');
  });

  it('knows midnight sun and polar night', () => {
    expect(sunTimes('2026-06-21', 69.65, 18.96).kind).toBe('midnight-sun');
    expect(sunTimes('2026-12-21', 69.65, 18.96).kind).toBe('polar-night');
  });
});
