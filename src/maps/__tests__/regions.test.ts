import { planRegion, tileCount } from '../regions';

describe('offline region planning', () => {
  it('keeps detail around a single place and includes surrounding streets', () => {
    const plan = planRegion([{ latitude: 35.04, longitude: 135.73 }])!;
    expect(plan.maxZoom).toBe(14);
    expect(plan.bounds[0]).toBeLessThan(135.73);
    expect(plan.bounds[2]).toBeGreaterThan(135.73);
    expect(plan.tiles).toBeLessThanOrEqual(128);
  });
  it('reduces detail for a large trip to stay within the provider limit', () => {
    const plan = planRegion([
      { latitude: 50, longitude: 8 },
      { latitude: 35, longitude: 139 },
    ])!;
    expect(plan.maxZoom).toBeLessThan(14);
    expect(tileCount(plan.bounds, plan.maxZoom)).toBeLessThanOrEqual(2800);
  });
  it('keeps dateline and polar bounds valid without downloading the whole world in detail', () => {
    const plan = planRegion([
      { latitude: 85, longitude: 179.99 },
      { latitude: -85, longitude: -179.99 },
    ])!;
    expect(plan.bounds[0]).toBeGreaterThanOrEqual(-180);
    expect(plan.bounds[2]).toBeLessThanOrEqual(180);
    expect(plan.tiles).toBeLessThanOrEqual(128);
  });
  it('does not plan downloads without valid coordinates', () => {
    expect(planRegion([])).toBeNull();
    expect(
      planRegion([
        { latitude: NaN, longitude: 0 },
        { latitude: 91, longitude: 0 },
      ]),
    ).toBeNull();
  });
});
