import { parseDecimal } from './currency';

export const UNIT_GROUPS = {
  temperature: ['c', 'f'],
  distance: ['km', 'mi', 'm', 'ft'],
  weight: ['kg', 'lb', 'g', 'oz'],
  volume: ['l', 'ml', 'usGal', 'impGal'],
} as const;
export type UnitGroup = keyof typeof UNIT_GROUPS;
export type Unit = (typeof UNIT_GROUPS)[UnitGroup][number];
export const DEFAULT_PAIRS: Record<UnitGroup, { from: Unit; to: Unit }> = {
  temperature: { from: 'c', to: 'f' },
  distance: { from: 'km', to: 'mi' },
  weight: { from: 'kg', to: 'lb' },
  volume: { from: 'l', to: 'usGal' },
};
// SI definitions; US liquid and imperial gallons are deliberately separate.
// https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8
const factors: Partial<Record<Unit, number>> = {
  km: 1000,
  mi: 1609.344,
  m: 1,
  ft: 0.3048,
  kg: 1,
  lb: 0.45359237,
  g: 0.001,
  oz: 0.028349523125,
  l: 1,
  ml: 0.001,
  usGal: 3.785411784,
  impGal: 4.54609,
};
export function belongsToGroup(group: UnitGroup, unit: string): unit is Unit {
  return (UNIT_GROUPS[group] as readonly string[]).includes(unit);
}
export function parseUnitAmount(text: string, locale: string): number | null {
  const normalized = text.normalize('NFKC').trim().replace(/^−/, '-');
  const negative = normalized.startsWith('-');
  const parsed = parseDecimal(negative ? normalized.slice(1) : normalized, locale);
  if (parsed == null) return null;
  const value = Number(parsed) * (negative ? -1 : 1);
  return Number.isFinite(value) ? value : null;
}
export function convertUnit(amount: number, group: UnitGroup, from: Unit, to: Unit): number | null {
  if (!Number.isFinite(amount) || !belongsToGroup(group, from) || !belongsToGroup(group, to)) return null;
  if (group !== 'temperature' && amount < 0) return null;
  const celsius = from === 'f' ? ((amount - 32) * 5) / 9 : amount;
  if (group === 'temperature' && celsius < -273.15) return null;
  const result =
    group === 'temperature'
      ? to === 'f'
        ? (celsius * 9) / 5 + 32
        : celsius
      : (amount * factors[from]!) / factors[to]!;
  return Number.isFinite(result) ? result : null;
}
export function formatUnitAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 8 }).format(Object.is(value, -0) ? 0 : value);
}
