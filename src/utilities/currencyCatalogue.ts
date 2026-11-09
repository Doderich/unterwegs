import currencies from './currencies.json';
import type { Language } from '@/i18n';

export const POPULAR_CURRENCIES = ['EUR', 'JPY', 'USD', 'GBP', 'CHF', 'AUD', 'CAD', 'CNY', 'SGD'];

export function currencyName(code: string, language: Language): string {
  return currencies.find((entry) => entry.code === code)?.names[language] ?? code;
}

const normalized = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Names are bundled ICU reference data, not a network lookup or a runtime Intl dependency. */
export function currencySections(query: string, language: Language, extra: string[] = []) {
  const needle = normalized(query);
  const codes = [...new Set([...currencies.map((entry) => entry.code), ...extra])];
  const matching = codes
    .filter((code) => {
      const entry = currencies.find((entry) => entry.code === code);
      return normalized([code, ...Object.values(entry?.names ?? {})].join(' ')).includes(needle);
    })
    .sort((a, b) => currencyName(a, language).localeCompare(currencyName(b, language)));
  return {
    popular: needle ? [] : [...new Set([...extra, ...POPULAR_CURRENCIES])].filter((code) => codes.includes(code)),
    all: matching,
  };
}
