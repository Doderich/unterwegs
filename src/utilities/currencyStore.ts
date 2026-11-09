import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { convert, decimal, isCurrency, type Rate } from './currency';

const KEY = 'unterwegs.currency.v1';
const rateSchema = z.object({
  base: z.string().refine(isCurrency),
  quote: z.string().refine(isCurrency),
  rate: z.string().refine((s) => (decimal(s)?.numerator ?? 0n) > 0n),
  date: z.string(),
  fetchedAt: z.number().finite().nonnegative(),
});
const historySchema = z.object({
  base: z.string().refine(isCurrency),
  quote: z.string().refine(isCurrency),
  amount: z.string().refine((value) => decimal(value) !== null),
  result: z.string().regex(/^\d+(?:\.\d+)?$/),
  mode: z.enum(['manual', 'automatic']),
  rate: rateSchema,
  inverse: z.boolean(),
  savedAt: z.number().finite().nonnegative(),
});
const schema = z.object({
  base: z.string().refine(isCurrency).optional(),
  quote: z.string().refine(isCurrency).optional(),
  mode: z.enum(['manual', 'automatic']).default('automatic'),
  manual: z.record(z.string(), rateSchema).default({}),
  automatic: z.record(z.string(), rateSchema).default({}),
  // Additive default preserves existing v1 preferences and rate caches.
  history: z.array(historySchema).max(100).default([]).catch([]),
});
type CurrencyState = z.infer<typeof schema>;

function load(): CurrencyState {
  try {
    return schema.parse(JSON.parse(Storage.getItemSync(KEY) ?? '{}'));
  } catch {
    return schema.parse({});
  }
}
let state = load();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function updateCurrency(patch: Partial<CurrencyState>) {
  const next = schema.parse({ ...state, ...patch });
  Storage.setItemSync(KEY, JSON.stringify(next));
  state = next;
  listeners.forEach((listener) => listener());
}

export function saveRate(rate: Rate, mode: 'manual' | 'automatic') {
  const rates = { ...state[mode] };
  // A newly entered/fetched rate also replaces an older reciprocal for this pair.
  delete rates[`${rate.quote}/${rate.base}`];
  rates[`${rate.base}/${rate.quote}`] = rate;
  updateCurrency({ base: state.base ?? rate.base, quote: state.quote ?? rate.quote, [mode]: rates });
}

type HistoryInput = Omit<z.infer<typeof historySchema>, 'result' | 'savedAt'>;

/** Snapshot the calculation, so future rate refreshes never rewrite old results. */
export function saveConversion(input: HistoryInput) {
  const validPair = input.inverse
    ? input.rate.base === input.quote && input.rate.quote === input.base
    : input.rate.base === input.base && input.rate.quote === input.quote;
  const result = convert(input.amount, input.rate.rate, input.quote, input.inverse);
  if (!validPair || result == null) throw new Error('invalid conversion');
  const entry = historySchema.parse({ ...input, result, savedAt: Date.now() });
  const previous = state.history[0];
  // Repeated taps on the same result do not fill the recent list.
  const duplicate =
    previous &&
    previous.base === entry.base &&
    previous.quote === entry.quote &&
    previous.amount === entry.amount &&
    previous.result === entry.result &&
    previous.mode === entry.mode &&
    previous.inverse === entry.inverse &&
    JSON.stringify(previous.rate) === JSON.stringify(entry.rate);
  updateCurrency({
    base: input.base,
    quote: input.quote,
    history: [entry, ...state.history.slice(duplicate ? 1 : 0)].slice(0, 100),
  });
}

export function clearCurrencyHistory() {
  updateCurrency({ history: [] });
}

export function useCurrencyState() {
  return useSyncExternalStore(subscribe, () => state);
}
