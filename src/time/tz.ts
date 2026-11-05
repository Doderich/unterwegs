/**
 * Time-zone aware formatting. The server sends UTC instants (`…Z`) plus an IANA zone per object;
 * we always render in that object's zone, never the phone's.
 */

import { getLanguage, tr } from '@/i18n';

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = timeZone + JSON.stringify(options);
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('de-DE', { timeZone, ...options });
    formatterCache.set(key, f);
  }
  return f;
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function parts(date: Date, timeZone: string) {
  const out: Record<string, string> = {};
  for (const p of formatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** Calendar date (`YYYY-MM-DD`) of an instant in a zone. */
export function localDate(iso: string | Date, timeZone: string): string {
  const p = parts(typeof iso === 'string' ? new Date(iso) : iso, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** `13:00` */
export function formatTime(iso: string, timeZone: string): string {
  const p = parts(new Date(iso), timeZone);
  return `${p.hour}:${p.minute}`;
}

/** Fixed tables: ICU versions disagree on `Do` vs `Do.`. */
const NAMES = {
  de: {
    weekdays: ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'],
    weekdaysLong: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    months: [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ],
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
  ja: {
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    weekdaysLong: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
};

const weekdayOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();

/** `Donnerstag, 17. Dezember` · `Thursday, 17 December` · `12月17日 木曜日` */
export function formatLongDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const n = NAMES[getLanguage()];
  if (getLanguage() === 'ja') return `${m}月${d}日 ${n.weekdaysLong[weekdayOf(y, m, d)]}`;
  const day = getLanguage() === 'de' ? `${d}.` : String(d);
  return `${n.weekdaysLong[weekdayOf(y, m, d)]}, ${day} ${n.months[m - 1]}`;
}

/** Pieces of a plain date for a compact day chip: `{ weekday: 'Do.', day: '17', month: 'Dez' }`. */
export function dayChipParts(date: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = date.split('-').map(Number);
  const n = NAMES[getLanguage()];
  // Japanese month names are already short (`12月`).
  return { weekday: n.weekdays[weekdayOf(y, m, d)], day: String(d), month: n.months[m - 1].slice(0, 3) };
}

/** `Do., 17.12.` · `Thu, 17 Dec` · `12/17(木)` for a plain `YYYY-MM-DD` date (no zone shift). */
export function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const n = NAMES[getLanguage()];
  const weekday = n.weekdays[weekdayOf(y, m, d)];
  if (getLanguage() === 'en') return `${weekday}, ${d} ${n.months[m - 1].slice(0, 3)}`;
  if (getLanguage() === 'ja') return `${m}/${d}(${weekday})`;
  return `${weekday}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** `Do., 17.12., 13:00` in the given zone. */
export function formatDateTime(iso: string, timeZone: string): string {
  return `${formatDayLabel(localDate(iso, timeZone))}, ${formatTime(iso, timeZone)}`;
}

/** Whole days between two plain dates (`b - a`). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

const CITY_NAMES: Record<string, () => string> = {
  'Asia/Tokyo': () => tr('tz.tokyo'),
  'Europe/Berlin': () => tr('tz.germany'),
  'Europe/Vienna': () => tr('tz.vienna'),
  'Europe/Zurich': () => tr('tz.zurich'),
  'Europe/London': () => 'London',
  'Europe/Paris': () => 'Paris',
  UTC: () => 'UTC',
};

/** Human label for a zone: `Tokio`, otherwise the city part of the IANA name. */
export function zoneLabel(timeZone: string): string {
  return CITY_NAMES[timeZone]?.() ?? timeZone.split('/').pop()!.replace(/_/g, ' ');
}

/** UTC offset of a zone at an instant, e.g. `+9`, `+1`, `+5:30`. */
export function utcOffset(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const p = parts(d, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const minutes = Math.round((asUtc - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}${abs % 60 ? ':' + String(abs % 60).padStart(2, '0') : ''}`;
}

export type ZonedTime = {
  /** `13:00` */
  time: string;
  /** Local calendar date in the zone. */
  date: string;
  timeZone: string;
  /** Zone label when it differs from the reference zone, else null. */
  zone: string | null;
};

export function zoned(iso: string, timeZone: string, referenceZone: string): ZonedTime {
  return {
    time: formatTime(iso, timeZone),
    date: localDate(iso, timeZone),
    timeZone,
    zone: timeZone === referenceZone ? null : zoneLabel(timeZone),
  };
}

/**
 * `13:00 → 10:45 (+1)`, with zone labels where a side differs from the reference zone:
 * `13:00 Deutschland → 10:45 Tokio (+1)`.
 */
export function formatSpan(start: ZonedTime, end: ZonedTime | null): string {
  const fmt = (z: ZonedTime) => (z.zone ? `${z.time} ${z.zone}` : z.time);
  if (!end) return fmt(start);
  const offset = daysBetween(start.date, end.date);
  return `${fmt(start)} → ${fmt(end)}${offset > 0 ? ` (+${offset})` : ''}`;
}

export type VisitTime = { date: string; time: string | null; endDate: string | null };

/**
 * A location visit (`start_date` / `end_date` are UTC instants). The website stores date-only visits
 * as midnight, either UTC or in the visit's zone; those have no time.
 */
export function visitTime(start: string, end: string | null | undefined, timeZone: string): VisitTime {
  // Same rule as the server: all-day = starts at midnight UTC and ends at midnight UTC (or has no end).
  // A visit 09:00–10:00 in Tokyo also starts at 00:00Z but is timed.
  const midnightUtc = (iso: string) => iso.slice(11, 19) === '00:00:00';
  const allDayUtc = midnightUtc(start) && (!end || midnightUtc(end));
  const zone = allDayUtc ? 'UTC' : timeZone;
  const date = localDate(start, zone);
  const time = formatTime(start, zone);
  const endDate = end ? localDate(end, zone) : null;
  return { date, time: time === '00:00' ? null : time, endDate: endDate && endDate !== date ? endDate : null };
}

/** `2 Std. 30 Min.` · `2 h 30 min` */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? tr('tz.hH', { h }) : '', m ? tr('tz.mMin', { m }) : ''].filter(Boolean).join(' ');
}
