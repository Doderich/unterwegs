import type { Collection } from '@/api/schemas';

/* Pure helpers for edit forms (tested in `__tests__/forms.test.ts`). */

/** `YYYY-MM-DD` of the next day. */
export function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * A typed price: `''` → null (no price), `89,50` / `89.50` / `1.234,50` → `"89.50"` / `"1234.50"`,
 * anything else → undefined (invalid).
 */
export function parsePrice(text: string): string | null | undefined {
  const t = text.trim().replace(/\s/g, '');
  if (!t) return null;
  // The last `,` or `.` followed by 1–2 digits is the decimal separator; the others group thousands.
  const m = t.match(/^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/);
  if (!m) return undefined;
  const whole = m[1].replace(/[.,]/g, '');
  return `${Number(whole)}.${(m[2] ?? '').padEnd(2, '0')}`;
}

/** Comma-separated tags: trimmed, without empty or repeated ones (case-insensitive), at most 100 characters each. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(',')) {
    const tag = raw.trim().slice(0, 100);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

/** A server rating (a float, maybe out of range) as whole stars 0–5; 0 = not rated. */
export function ratingStars(rating: number | null | undefined): number {
  return rating ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
}

/** `★★★☆☆` for 3, or null when not rated. */
export function starsLabel(rating: number | null | undefined): string | null {
  const n = ratingStars(rating);
  return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : null;
}

const COMMON_CURRENCIES = ['EUR', 'JPY', 'USD', 'GBP', 'CHF', 'CNY', 'KRW', 'THB', 'AUD', 'CAD'];

export function currencyOptions(current: string) {
  return [...new Set([current, ...COMMON_CURRENCIES])].map((c) => ({ value: c, label: c }));
}

/** The currency used most in the collection's lodging, transportation and locations, else EUR. */
export function defaultCurrency(collection: Collection): string {
  const counts = new Map<string, number>();
  for (const x of [...collection.lodging, ...collection.transportations, ...collection.locations]) {
    if (x.price_currency) counts.set(x.price_currency, (counts.get(x.price_currency) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR';
}

/** Django's duration format (`HH:MM:SS`, `D HH:MM:SS`, optional fraction) as whole seconds; null when unreadable. */
export function parseServerDuration(value: string | null | undefined): number | null {
  const m = value?.trim().match(/^(?:(\d+) )?(\d+):(\d{2}):(\d{2})(?:\.\d+)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]);
}

/** Typed `1:30` (h:mm) or `45` (minutes) → `01:30:00`; `''` → null; anything else → undefined (invalid). */
export function parseTypedDuration(text: string): string | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^(?:(\d{1,3}):)?(\d{1,3})$/);
  if (!m) return undefined;
  const hours = m[1] != null ? Number(m[1]) : Math.floor(Number(m[2]) / 60);
  const minutes = m[1] != null ? Number(m[2]) : Number(m[2]) % 60;
  if (minutes > 59) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:00`;
}
