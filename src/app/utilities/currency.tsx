import { Button, FieldGroup, ListItem } from '@expo/ui';
import { Alert } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { CurrencyConverter } from '@/ui/CurrencyConverter';
import { useUser } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { locale, tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useSelect } from '@/ui/Select';
import { useRowTheme } from '@/ui/rows';
import { toolbarIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';
import { typeScale } from '@/ui/typeScale';
import { formatUpdatedAt } from '@/ui/format';
import {
  convert,
  fetchRate,
  findRate,
  formatMoney,
  formatDecimal,
  initialCurrencyPair,
  localRate,
  parseDecimal,
} from '@/utilities/currency';
import {
  clearCurrencyHistory,
  saveConversion,
  saveRate,
  updateCurrency,
  useCurrencyState,
} from '@/utilities/currencyStore';
import { Sub } from '@/ui/Sub';

export default function CurrencyScreen() {
  const state = useCurrencyState();
  const user = useUser();
  const rt = useRowTheme();
  const online = useOnline();
  const { base, quote } = initialCurrencyPair(state, user.data?.default_currency);
  const [amount, setAmount] = useState('1');
  const [editingRate, setEditingRate] = useState(false);
  const [draft, setDraft] = useState<{ pair: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rates = useQuery({
    queryKey: ['currency-rate', base, quote],
    queryFn: async ({ signal }) => {
      const rate = await fetchRate(base, quote, fetch, signal);
      saveRate(rate, 'automatic');
      return rate;
    },
    enabled: state.mode === 'automatic' && online && base !== quote && (!user.isPending || !!state.base),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
    networkMode: 'online',
    meta: { persist: false },
  });
  const busy = rates.isFetching;
  const pair = `${base}/${quote}`;
  const manual = findRate(state.manual, base, quote);
  const selected = findRate(state[state.mode], base, quote);
  const value =
    draft?.pair === pair
      ? draft.value
      : manual && !manual.inverse
        ? locale().startsWith('de')
          ? manual.rate.replace('.', ',')
          : manual.rate
        : '';
  const parsed = parseDecimal(amount, locale());
  const typedRate = draft?.pair === pair ? parseDecimal(draft.value, locale()) : null;
  const result =
    parsed == null
      ? null
      : base === quote
        ? convert(parsed, '1', quote)
        : state.mode === 'manual' && draft?.pair === pair
          ? typedRate
            ? convert(parsed, typedRate, quote)
            : null
          : selected
            ? convert(parsed, selected.rate, quote, selected.inverse)
            : null;
  const persist = (patch: Parameters<typeof updateCurrency>[0]) => {
    try {
      updateCurrency(patch);
      setError(null);
      return true;
    } catch {
      setError(tr('utilities.saveFailed'));
      return false;
    }
  };
  const changePair = (patch: { base?: string; quote?: string }) => {
    if (persist({ base, quote, ...patch })) setDraft(null);
  };
  const mode = useSelect(rt, {
    title: tr('utilities.rate'),
    label: tr('utilities.rate'),
    value: state.mode,
    options: [
      { value: 'manual', label: tr('utilities.manual') },
      { value: 'automatic', label: tr('utilities.automatic') },
    ],
    onChange: (mode) => {
      persist({ mode: mode === 'automatic' ? 'automatic' : 'manual' });
    },
  });
  const changeRate = (value: string) => {
    setDraft({ pair, value });
    const rate = parseDecimal(value, locale());
    if (rate && convert('1', rate, quote) != null) {
      try {
        saveRate(localRate(base, quote, rate), 'manual');
        setError(null);
      } catch {
        setError(tr('utilities.saveFailed'));
      }
    }
  };
  const remember = () => {
    if (parsed == null || result == null) return;
    const rate =
      base === quote
        ? localRate(base, quote, '1')
        : state.mode === 'manual' && draft?.pair === pair && typedRate
          ? manual && !manual.inverse && manual.rate === typedRate
            ? manual
            : localRate(base, quote, typedRate)
          : selected;
    if (!rate) return;
    try {
      saveConversion({
        base,
        quote,
        amount: parsed,
        mode: base === quote ? 'manual' : state.mode,
        rate,
        inverse: 'inverse' in rate && rate.inverse === true,
      });
      setError(null);
    } catch {
      setError(tr('utilities.saveFailed'));
    }
  };
  const clearHistory = () =>
    Alert.alert(tr('utilities.clearHistory'), tr('utilities.clearHistoryConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            clearCurrencyHistory();
            setError(null);
          } catch {
            setError(tr('utilities.saveFailed'));
          }
        },
      },
    ]);
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={toolbarIcon('edit') as never}
          accessibilityLabel={tr('utilities.editRate')}
          disabled={base === quote}
          onPress={() => setEditingRate((open) => !open)}
        />
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>
            <CurrencyConverter
              amount={amount}
              onAmountChange={setAmount}
              result={result == null ? null : `≈ ${formatDecimal(result, locale())}`}
              base={base}
              quote={quote}
              onSwap={() => changePair({ base: quote, quote: base })}
              onPick={(side) => router.push({ pathname: '/utilities/currency-picker', params: { side, base, quote } })}
            />
            <Button
              label={tr('utilities.saveConversion')}
              variant="text"
              disabled={result == null}
              onPress={() => remember()}
            />
            {error ? <Text textStyle={{ color: rt.colors.danger }}>{error}</Text> : null}
            {parsed == null || (state.mode === 'automatic' && base !== quote && (busy || !online || rates.isError)) ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ ...typeScale.supporting, color: rt.colors.secondary }}>
                  {parsed == null
                    ? tr('utilities.invalidAmount')
                    : busy
                      ? tr('common.loading')
                      : !online
                        ? selected
                          ? tr('utilities.offlineRate')
                          : tr('utilities.noOfflineRate')
                        : tr('utilities.rateFailed')}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
            {state.mode === 'automatic' && base !== quote && online && rates.isError ? (
              <Button label={tr('common.tryAgain')} variant="text" onPress={() => void rates.refetch()} />
            ) : null}
          </FieldGroup.Section>
          {base !== quote && (editingRate || state.mode === 'manual') ? (
            <FieldGroup.Section title={tr('utilities.rate')}>
              {mode.row}
              {state.mode === 'manual' ? (
                <>
                  <Text>{tr('utilities.rateDirection', { base, quote })}</Text>
                  <TextInput
                    key={`rate-${pair}`}
                    defaultValue={value}
                    onChangeText={changeRate}
                    keyboardType="decimal-pad"
                    placeholder={tr('utilities.enterRate')}
                  />
                  {manual?.inverse && draft?.pair !== pair ? (
                    <Text>
                      {tr('utilities.inverseRate', {
                        base: manual.base,
                        quote: manual.quote,
                        rate: manual.rate,
                      })}
                    </Text>
                  ) : null}
                  {draft?.pair === pair && (!typedRate || convert('1', typedRate, quote) == null) ? (
                    <Text>{tr('utilities.invalidRate')}</Text>
                  ) : null}
                </>
              ) : (
                <Button
                  label={busy ? tr('common.loading') : tr('utilities.fetchRate')}
                  variant="text"
                  disabled={busy || !online}
                  onPress={() => void rates.refetch()}
                />
              )}
            </FieldGroup.Section>
          ) : null}
          {state.history.length ? (
            <FieldGroup.Section title={tr('utilities.history')}>
              {state.history.map((entry, index) => (
                <ListItem
                  key={`${entry.savedAt}-${index}`}
                  colors={rt.listColors}
                  supportingText={<Sub>{formatUpdatedAt(entry.savedAt)}</Sub>}>
                  {tr('utilities.historyConversion', {
                    amount: locale().startsWith('de') ? entry.amount.replace('.', ',') : entry.amount,
                    base: entry.base,
                    result: formatMoney(entry.result, entry.quote, locale()),
                  })}
                </ListItem>
              ))}
              <Button label={tr('utilities.clearHistory')} variant="text" onPress={clearHistory} />
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {mode.sheet}
    </>
  );
}
