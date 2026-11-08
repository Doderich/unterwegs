import { zonedMoment } from '../zonedMoment';

describe('zonedMoment', () => {
  it("saves a wall-clock time in the object's own zone, without a hint", () => {
    expect(zonedMoment({ date: '2026-12-18', time: '15:00' }, 'Asia/Tokyo')).toEqual({
      iso: '2026-12-18T06:00:00Z',
      clockChange: null,
    });
  });

  it('tells which time is saved when the typed one falls into the spring-forward gap', () => {
    // 28.03.2027: Berlin jumps from 02:00 to 03:00.
    const m = zonedMoment({ date: '2027-03-28', time: '02:30' }, 'Europe/Berlin');
    expect(m.iso).toBe('2027-03-28T01:30:00Z');
    expect(m.clockChange).toContain('02:30');
    expect(m.clockChange).toContain('03:30');
  });

  it('has no hint for the same time in a zone without that jump', () => {
    expect(zonedMoment({ date: '2027-03-28', time: '02:30' }, 'Asia/Tokyo').clockChange).toBeNull();
  });
});
