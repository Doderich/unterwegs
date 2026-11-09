import { Column, Icon, IconButton, Row, Spacer } from '@expo/ui/jetpack-compose';
import { weight, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { Button } from '@expo/ui';
import { tr } from '@/i18n';
import { materialIcon } from './icons';
import { Text } from './Text';
import { TextInput, type TextInputProps } from './TextInput';
import { typeScale } from './typeScale';
import { useColors } from './theme';

export type CurrencyConverterProps = {
  amount: string;
  onAmountChange: (value: string) => void;
  result: string | null;
  base: string;
  quote: string;
  onPick: (side: 'base' | 'quote') => void;
  onSwap: () => void;
  keyboardType?: TextInputProps['keyboardType'];
  amountLabel?: string;
  swapLabel?: string;
};

/** Two native amount rows, with the currency action next to the value it affects. */
export function CurrencyConverter({
  amount,
  onAmountChange,
  result,
  base,
  quote,
  onPick,
  onSwap,
  keyboardType = 'decimal-pad',
  amountLabel,
  swapLabel,
}: CurrencyConverterProps) {
  const colors = useColors();
  const currency = (code: string, side: 'base' | 'quote') => (
    <Button variant="text" onPress={() => onPick(side)}>
      <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
        <Text textStyle={{ ...typeScale.bodyStrong, color: colors.tint }}>{code}</Text>
        <Icon source={materialIcon('expand')} size={18} tint={colors.tint} />
      </Row>
    </Button>
  );
  return (
    <Column verticalArrangement={{ spacedBy: 4 }}>
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 12 }}>
        <Column modifiers={[weight(1)]}>
          <Text textStyle={{ ...typeScale.supporting, color: colors.secondary }}>{tr('utilities.fromCurrency')}</Text>
          <TextInput
            defaultValue={amount}
            onChangeText={onAmountChange}
            keyboardType={keyboardType}
            accessibilityLabel={amountLabel ?? tr('utilities.amount')}
            textStyle={{ ...typeScale.figure, color: colors.text }}
          />
        </Column>
        {currency(base, 'base')}
      </Row>
      <Row verticalAlignment="center">
        <Spacer modifiers={[weight(1)]} />
        <IconButton onClick={onSwap} modifiers={[semantics({ contentDescription: swapLabel ?? tr('utilities.swap') })]}>
          <Icon source={materialIcon('swap')} size={24} tint={colors.tint} />
        </IconButton>
        <Spacer modifiers={[weight(1)]} />
      </Row>
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 12 }}>
        <Column modifiers={[weight(1)]}>
          <Text textStyle={{ ...typeScale.supporting, color: colors.secondary }}>{tr('utilities.toCurrency')}</Text>
          <Text
            textStyle={{ ...typeScale.figure, color: colors.text }}
            modifiers={[semantics({ contentDescription: `${tr('utilities.result')}: ${result ?? '—'} ${quote}` })]}>
            {result ?? '—'}
          </Text>
        </Column>
        {currency(quote, 'quote')}
      </Row>
    </Column>
  );
}
