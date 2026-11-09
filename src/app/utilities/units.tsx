import { FieldGroup } from '@expo/ui';
import { useState } from 'react';
import { router } from 'expo-router';
import { CurrencyConverter } from '@/ui/CurrencyConverter';
import { unitOptions } from '@/utilities/unitOptions';
import { locale, tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { Text } from '@/ui/Text';
import {
  belongsToGroup,
  DEFAULT_PAIRS,
  convertUnit,
  formatUnitAmount,
  parseUnitAmount,
  type UnitGroup,
} from '@/utilities/units';
import { saveUnitPair, updateTravelPreferences, useTravelPreferences } from '@/utilities/travelStore';

export default function UnitConverterScreen() {
  const rt = useRowTheme();
  const prefs = useTravelPreferences();
  const group = prefs.unitGroup;
  const pair = prefs.unitPairs[group];
  const from = belongsToGroup(group, pair.from) ? pair.from : DEFAULT_PAIRS[group].from;
  const to = belongsToGroup(group, pair.to) ? pair.to : DEFAULT_PAIRS[group].to;
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState(false);
  const persist = (action: () => void) => {
    try {
      action();
      setError(false);
    } catch {
      setError(true);
    }
  };
  const options = unitOptions(group);
  const category = useSelect(rt, {
    title: tr('units.category'),
    label: tr('units.category'),
    value: group,
    options: [
      { value: 'temperature', label: tr('units.temperature') },
      { value: 'distance', label: tr('units.distance') },
      { value: 'weight', label: tr('units.weight') },
      { value: 'volume', label: tr('units.volume') },
    ],
    onChange: (value) => persist(() => updateTravelPreferences({ unitGroup: value as UnitGroup })),
  });
  const parsed = parseUnitAmount(amount, locale());
  const result = parsed == null ? null : convertUnit(parsed, group, from, to);
  return (
    <>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>{category.row}</FieldGroup.Section>
          <FieldGroup.Section>
            <CurrencyConverter
              amount={amount}
              onAmountChange={setAmount}
              keyboardType="numbers-and-punctuation"
              amountLabel={tr('units.amount')}
              swapLabel={tr('units.swap')}
              result={result == null ? null : `≈ ${formatUnitAmount(result, locale())}`}
              base={
                from === 'usGal'
                  ? 'US gal'
                  : from === 'impGal'
                    ? 'Imp gal'
                    : options.find((o) => o.value === from)!.label
              }
              quote={
                to === 'usGal' ? 'US gal' : to === 'impGal' ? 'Imp gal' : options.find((o) => o.value === to)!.label
              }
              onSwap={() => persist(() => saveUnitPair(group, to, from))}
              onPick={(side) => router.push({ pathname: '/utilities/unit-picker', params: { side } })}
            />
            {result == null ? <Text textStyle={{ color: rt.colors.danger }}>{tr('units.invalidAmount')}</Text> : null}
          </FieldGroup.Section>
          {error ? (
            <FieldGroup.Section>
              <Text>{tr('travelTools.saveFailed')}</Text>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {category.sheet}
    </>
  );
}
