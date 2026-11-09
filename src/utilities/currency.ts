/** Exact decimal arithmetic for a reference-rate calculator. No amounts are sent to the provider. */
export type Decimal = { numerator: bigint; denominator: bigint };

export function isCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

/** Saved choices win; until the account preference arrives, EUR is a temporary fallback. */
export function initialCurrencyPair(saved: { base?: string; quote?: string }, preference?: string | null) {
  const preferred = preference?.trim().toUpperCase() ?? '';
  const base = saved.base ?? (isCurrency(preferred) ? preferred : 'EUR');
  return { base, quote: saved.quote ?? (base === 'JPY' ? 'EUR' : 'JPY') };
}

/** Choosing the currency on the other side is a swap, never a same-currency dead end. */
export function selectCurrency(pair: { base: string; quote: string }, side: 'base' | 'quote', value: string) {
  const other = side === 'base' ? pair.quote : pair.base;
  return value === other ? { base: pair.quote, quote: pair.base } : { ...pair, [side]: value };
}

/** Accept plain provider decimals, bounded to avoid unbounded BigInt work on typed or remote input. */
export function decimal(value: string): Decimal | null {
  if (!/^\d{1,18}(?:\.\d{1,18})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return { numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) };
}

/** Locale grouping is strict; an ungrouped alternate decimal separator is accepted too. */
export function parseDecimal(text: string, locale: string): string | null {
  let value = text.normalize('NFKC').trim();
  const german = locale.startsWith('de');
  const group = german ? '.' : ',';
  const separator = german ? ',' : '.';
  const groups = german ? /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/ : /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
  if (groups.test(value)) value = value.split(group).join('').replace(separator, '.');
  else if (/^\d+(?:[.,]\d+)?$/.test(value)) value = value.replace(',', '.');
  else return null;
  return decimal(value) ? value : null;
}

export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/** Half-up rounding once, at the target currency's precision. Returns an exact decimal string. */
export function convert(amount: string, rate: string, target: string, inverse = false): string | null {
  const a = decimal(amount);
  const r = decimal(rate);
  if (!a || !r || r.numerator <= 0n || !isCurrency(target)) return null;
  const digits = currencyDigits(target);
  const numerator = a.numerator * (inverse ? r.denominator : r.numerator) * 10n ** BigInt(digits);
  const denominator = a.denominator * (inverse ? r.numerator : r.denominator);
  const rounded = (numerator * 2n + denominator) / (2n * denominator);
  const padded = rounded.toString().padStart(digits + 1, '0');
  return digits ? `${padded.slice(0, -digits)}.${padded.slice(-digits)}` : padded;
}

/** Exact output for the app's de/en/ja locales, without Hermes' missing Intl.formatToParts. */
export function formatMoney(value: string, currency: string, locale: string): string {
  return `${formatDecimal(value, locale)}\u00a0${currency}`;
}

export function formatDecimal(value: string, locale: string): string {
  const [whole, fraction = ''] = value.split('.');
  const german = locale.startsWith('de');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, german ? '.' : ',');
  return `${grouped}${fraction ? `${german ? ',' : '.'}${fraction}` : ''}`;
}

export type Rate = { base: string; quote: string; rate: string; date: string; fetchedAt: number };

/** Timestamp a rate supplied by the user (or the same-currency identity), at the time of the action. */
export function localRate(base: string, quote: string, rate: string): Rate {
  const fetchedAt = Date.now();
  return { base, quote, rate, date: new Date(fetchedAt).toISOString().slice(0, 10), fetchedAt };
}

export function findRate(rates: Record<string, Rate>, base: string, quote: string) {
  const direct = rates[`${base}/${quote}`];
  if (direct) return { ...direct, inverse: false };
  const reverse = rates[`${quote}/${base}`];
  return reverse ? { ...reverse, inverse: true } : null;
}

/** Fixed public host, no AdventureLog client, cookies, API key, amount or collection identifiers. */
export async function fetchRate(
  base: string,
  quote: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Rate> {
  if (!isCurrency(base) || !isCurrency(quote) || base === quote) throw new Error('invalid pair');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(
      `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`,
      {
        signal: controller.signal,
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      },
    );
    if (!response.ok) throw new Error('rate unavailable');
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('base' in data) ||
      !('quote' in data) ||
      !('rate' in data) ||
      !('date' in data)
    )
      throw new Error('invalid rate');
    const rate = String(data.rate);
    const parsed = decimal(rate);
    if (
      data.base !== base ||
      data.quote !== quote ||
      !parsed ||
      parsed.numerator <= 0n ||
      typeof data.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
      !Number.isFinite(Date.parse(data.date)) ||
      new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) !== data.date
    )
      throw new Error('invalid rate');
    if (signal?.aborted) throw new Error('cancelled');
    return { base, quote, rate, date: data.date, fetchedAt: Date.now() };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
