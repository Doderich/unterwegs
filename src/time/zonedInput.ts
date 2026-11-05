/**
 * Time input in an object's own zone. The user types the wall-clock time from the ticket or booking
 * ("check-in 15:00", in the lodging's zone); the server stores UTC.
 *
 * Pickers on the phone always work in the device's zone (Android ignores `timeZoneName`), so the app
 * only uses their wall-clock components (`toPickerDate` / `fromPickerDate`) and converts itself.
 */

/** A wall-clock time: `YYYY-MM-DD` and `HH:mm`. */
export type WallTime = { date: string; time: string };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock time of an instant in a zone. */
export function utcToZoned(iso: string | number, timeZone: string): WallTime {
  const p: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(iso))) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Wall-clock components as if they were UTC, in ms. */
function wallMs({ date, time }: WallTime): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi);
}

/** Offset of a zone at an instant, in minutes (Tokyo: 540). */
function offsetMinutes(ms: number, timeZone: string): number {
  return Math.round((wallMs(utcToZoned(ms, timeZone)) - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

export type ZonedResult = {
  /** `2027-03-27T06:00:00Z` */
  iso: string;
  /**
   * The typed time doesn't exist in the zone (clocks jump forward); `iso` is the same moment of the day after
   * the jump (02:30 → 03:30). The form shows a hint.
   */
  shifted: boolean;
};

/**
 * UTC instant of a wall-clock time in a zone. When clocks go back and the time occurs twice, the first
 * occurrence wins (the earlier instant).
 */
export function zonedToUtc(wall: WallTime, timeZone: string): ZonedResult {
  const target = wallMs(wall);
  // The offset either side of the target covers both sides of a DST change.
  const offsets = [
    ...new Set([offsetMinutes(target - 86_400_000, timeZone), offsetMinutes(target + 86_400_000, timeZone)]),
  ];
  const matches = offsets
    .map((o) => target - o * 60_000)
    .filter((ms) => wallMs(utcToZoned(ms, timeZone)) === target)
    .sort((a, b) => a - b);
  if (matches.length) return { iso: toIso(matches[0]), shifted: false };
  // In a gap: use the offset before the jump, which lands after it (02:30 +1 → 01:30 UTC → 03:30 +2).
  const before = offsetMinutes(target - 86_400_000, timeZone);
  return { iso: toIso(target - before * 60_000), shifted: true };
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Picker value for a date: noon of that day on the device (noon never falls into a DST gap). */
export function dateToPicker(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0);
}

/** Picker value for a time on a fixed reference day without DST changes. */
export function timeToPicker(time: string): Date {
  const [h, mi] = time.split(':').map(Number);
  return new Date(2001, 0, 1, h, mi);
}

export const pickerToDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const pickerToTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** True when `end` is after `start` (both UTC ISO strings); missing ends are fine. */
export function endsAfterStart(start: string | null, end: string | null): boolean {
  if (!start || !end) return true;
  return Date.parse(end) > Date.parse(start);
}
