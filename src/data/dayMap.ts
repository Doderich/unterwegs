import type { MapPoint } from './selectors';

/**
 * The collection map as the place where days are shaped (docs/IPAD.md → The day map). With the whole collection
 * every point carries its day; with one day selected, that day stands out with the stays it starts and ends at,
 * and the places on no day stay visible, faded, so what is close and still free is easy to see.
 */
export type DayMapRole =
  /** On a day (the selected one, or any with the whole collection). */
  | 'planned'
  /** A place on no day yet. */
  | 'open'
  /** Where the selected day starts: last night's stay. */
  | 'start'
  /** Where the selected day ends: tonight's stay. */
  | 'tonight';

export type DayMapPoint = MapPoint & {
  role: DayMapRole;
  /** 1-based number of the day the point is shown with, or null when it is on no day. */
  dayNumber: number | null;
};

export type DayMapDay = { date: string; number: number; nightLodgingId: string | null };

export function dayMapPoints(points: MapPoint[], days: DayMapDay[], selected: string): DayMapPoint[] {
  const numberOf = new Map(days.map((d) => [d.date, d.number]));
  const firstDay = (p: MapPoint) =>
    p.dates.reduce<number | null>((min, date) => {
      const n = numberOf.get(date);
      return n !== undefined && (min === null || n < min) ? n : min;
    }, null);

  if (selected === 'all')
    return points.map((p) => {
      const dayNumber = firstDay(p);
      return { ...p, dayNumber, role: dayNumber === null && p.kind === 'location' ? 'open' : 'planned' };
    });

  const index = days.findIndex((d) => d.date === selected);
  if (index < 0) return [];
  const day = days[index];
  const lastNight = days[index - 1]?.nightLodgingId ?? null;
  const result: DayMapPoint[] = [];
  for (const p of points) {
    if (p.kind === 'lodging' && p.id === day.nightLodgingId)
      result.push({ ...p, role: 'tonight', dayNumber: day.number });
    else if (p.kind === 'lodging' && p.id === lastNight) result.push({ ...p, role: 'start', dayNumber: day.number });
    else if (p.dates.includes(selected)) result.push({ ...p, role: 'planned', dayNumber: day.number });
    else if (p.kind === 'location' && p.dates.length === 0) result.push({ ...p, role: 'open', dayNumber: null });
  }
  return result;
}

/**
 * One hue per day in a fixed order (the data-viz reference categorical palette, light and dark steps). On a map
 * every pair of days can sit side by side, and only about three hues stay apart for colour-blind readers there, so
 * the day number on the marker carries the day; the colour only helps neighbouring days apart. From day nine the
 * hues repeat, with the number still telling them apart.
 */
const DAY_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

export function dayColor(dayNumber: number, dark: boolean): string {
  const colors = dark ? DAY_COLORS.dark : DAY_COLORS.light;
  return colors[(dayNumber - 1) % colors.length];
}
