import { getLanguage, locale, tr } from '@/i18n';
import { daysBetween } from '@/time/tz';

/** `2026-12-17` → `17.12.2026` · `17/12/2026` · `2026/12/17` without going through Date (no time-zone shift for plain dates). */
export function formatPlainDate(date: string | null | undefined): string {
  if (!date) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  const language = getLanguage();
  if (language === 'ja') return `${m[1]}/${m[2]}/${m[3]}`;
  return language === 'de' ? `${m[3]}.${m[2]}.${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (start && end) return `${formatPlainDate(start)} – ${formatPlainDate(end)}`;
  return formatPlainDate(start ?? end);
}

/** Within two weeks the countdown is counted in nights, the way children count to a trip. */
const SLEEPS_FROM = 14;

/**
 * Headline of the next-collection card: `Noch 44 Tage`, `Noch 5 Mal schlafen!`, `Morgen geht's los`,
 * `Tag 3 von 23`.
 */
export function collectionCountdown(start: string, end: string, today: string): string {
  const untilStart = daysBetween(today, start);
  if (untilStart > SLEEPS_FROM) return tr('format.daysToGo', { count: untilStart });
  if (untilStart > 1) return tr('format.sleepsToGo', { count: untilStart });
  if (untilStart === 1) return tr('format.startsTomorrow');
  const total = daysBetween(start, end) + 1;
  const day = Math.min(daysBetween(start, today) + 1, total);
  return day === 1 ? tr('format.startsToday', { count: total }) : tr('format.dayDayOfTotal', { day, total });
}

/** How long ago a plain date was, for looking back: `vor 3 Wochen`, `vor 2 Jahren`. */
export function timeAgo(date: string, today: string): string {
  const days = daysBetween(date, today);
  if (days < 14) return tr('format.agoDays', { count: Math.max(1, days) });
  if (days < 60) return tr('format.agoWeeks', { count: Math.floor(days / 7) });
  if (days < 365) return tr('format.agoMonths', { count: Math.floor(days / 30) });
  return tr('format.agoYears', { count: Math.floor(days / 365) });
}

export function formatPrice(
  price: string | number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (price == null || price === '') return null;
  const n = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(n) || n === 0) return null;
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: currency || 'EUR' }).format(n);
  } catch {
    return `${n.toFixed(2).replace('.', ',')} ${currency ?? ''}`.trim();
  }
}

/** `40 m`, `1,3 km`, `12 km` (rounded so it doesn't look more precise than a straight-line distance is). */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 0.995) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  const digits = km < 9.95 ? 1 : 0;
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }).format(km)} km`;
}

/**
 * A 400 px preview of an original file on upload.wikimedia.org (originals can be many MB); other URLs unchanged.
 * SVGs get a PNG rendering, as Wikimedia serves them.
 */
export function wikimediaThumb(url: string): string {
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
  if (!m) return url;
  const [, base, hash, file] = m;
  return `${base}/thumb/${hash}/${file}/400px-${file}${/\.svg$/i.test(file) ? '.png' : ''}`;
}

/** "Alex Beispiel", else the username. */
export function personName(u: { first_name?: string | null; last_name?: string | null; username: string }): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
}

/** When this phone last refreshed something ("Stand"), in the phone's own zone and the UI language's format. */
export function formatUpdatedAt(ms: number): string {
  if (!ms) return tr('statusRows.never');
  return new Intl.DateTimeFormat(locale(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}
