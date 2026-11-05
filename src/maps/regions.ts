export const MAP_STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
export type Bounds = [west: number, south: number, east: number, north: number];
export type RegionPlan = { bounds: Bounds; maxZoom: number; tiles: number };
const MAX_LAT = 85.05112878;
// Dense-city vector tiles and fonts are large: keep the default comfortably below the provider's
// 3,000-tile/50 MB limits. The runtime size guard still handles unusually heavy areas.
const TARGET_TILES = 128;
const tileX = (lon: number, z: number) => Math.min(2 ** z - 1, Math.floor(((lon + 180) / 360) * 2 ** z));
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.max(0, Math.min(2 ** z - 1, Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z)));
};

/** Conservative count for Liberty: vector tiles plus the low-zoom Natural Earth raster source (256 px). */
export function tileCount([west, south, east, north]: Bounds, maxZoom: number): number {
  const countThrough = (zoom: number) => {
    let count = 0;
    for (let z = 0; z <= zoom; z++)
      count += (tileX(east, z) - tileX(west, z) + 1) * (tileY(south, z) - tileY(north, z) + 1);
    return count;
  };
  // 256 px raster tiles can require one extra source zoom relative to a 512 px map zoom.
  const count = countThrough(maxZoom) + countThrough(Math.min(6, maxZoom + 1));
  return count;
}

/** A collection overview, or a detailed area around one place. Keep below OpenFreeMap's 3,000 tile limit. */
export function planRegion(points: { latitude: number; longitude: number }[]): RegionPlan | null {
  const valid = points.filter(
    (p) =>
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.latitude) <= MAX_LAT &&
      Math.abs(p.longitude) <= 180,
  );
  if (!valid.length) return null;
  const latitudes = valid.map((p) => p.latitude);
  const longitudes = valid.map((p) => p.longitude);
  // At least ~5 km around each place. World-spanning collections become overview maps; save individual places for detail.
  const bounds: Bounds = [
    Math.max(-180, Math.min(...longitudes) - 0.06),
    Math.max(-MAX_LAT, Math.min(...latitudes) - 0.05),
    Math.min(180, Math.max(...longitudes) + 0.06),
    Math.min(MAX_LAT, Math.max(...latitudes) + 0.05),
  ];
  let maxZoom = 14;
  while (maxZoom > 0 && tileCount(bounds, maxZoom) > TARGET_TILES) maxZoom--;
  return { bounds, maxZoom, tiles: tileCount(bounds, maxZoom) };
}
