import { Button, HStack, Spacer, VStack } from '@expo/ui/swift-ui';
import { Icon } from '@expo/ui';
import {
  accessibilityLabel,
  buttonStyle,
  font,
  frame,
  labelStyle,
  listRowSeparator,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { tr } from '@/i18n';
import type { CurrencyConverterProps } from './CurrencyConverter';
import { Text } from './Text';
import { TextInput } from './TextInput';
import { typeScale } from './typeScale';
import { useColors } from './theme';
import { icons } from './icons';

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
    <Button
      onPress={() => onPick(side)}
      modifiers={[
        buttonStyle('borderless'),
        tint(colors.tint),
        frame({ minWidth: 80, minHeight: 44 }),
        accessibilityLabel(`${side === 'base' ? tr('utilities.fromCurrency') : tr('utilities.toCurrency')}, ${code}`),
      ]}>
      <HStack spacing={8}>
        <Text textStyle={{ ...typeScale.bodyStrong, color: colors.tint }}>{code}</Text>
        <Icon name={icons.expand} size={18} color={colors.tint} />
      </HStack>
    </Button>
  );
  return (
    <VStack spacing={4} modifiers={[listRowSeparator('hidden')]}>
      <HStack spacing={12}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text textStyle={{ ...typeScale.supporting, color: colors.secondary }}>{tr('utilities.fromCurrency')}</Text>
          <TextInput
            defaultValue={amount}
            onChangeText={onAmountChange}
            keyboardType={keyboardType}
            accessibilityLabel={amountLabel ?? tr('utilities.amount')}
            modifiers={[font({ textStyle: 'title', weight: 'semibold' })]}
          />
        </VStack>
        {currency(base, 'base')}
      </HStack>
      <HStack>
        <Spacer />
        <Button
          label={swapLabel ?? tr('utilities.swap')}
          systemImage="arrow.up.arrow.down"
          onPress={onSwap}
          modifiers={[
            buttonStyle('borderless'),
            labelStyle('iconOnly'),
            tint(colors.tint),
            frame({ minWidth: 44, minHeight: 44 }),
          ]}
        />
        <Spacer />
      </HStack>
      <HStack spacing={12}>
        <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text textStyle={{ ...typeScale.supporting, color: colors.secondary }}>{tr('utilities.toCurrency')}</Text>
          <Text
            textStyle={{ ...typeScale.figure, color: colors.text }}
            modifiers={[accessibilityLabel(`${tr('utilities.result')}: ${result ?? '—'} ${quote}`)]}>
            {result ?? '—'}
          </Text>
        </VStack>
        {currency(quote, 'quote')}
      </HStack>
    </VStack>
  );
}
