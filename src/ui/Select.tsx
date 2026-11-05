import { BottomSheet, Icon, ListItem, Picker, ScrollView, Column } from '@expo/ui';
import { Picker as SwiftUIPicker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { useState, type ReactElement } from 'react';
import { Platform } from 'react-native';

import { icons } from './icons';
import type { RowTheme } from './rows';
import { Sub } from './Sub';
import { Text } from './Text';

export type SelectOption = { value: string; label: string };

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Optional secondary line on Android (e.g. "48 Punkte"). */
  hint?: string;
  title: string;
  /** Row label with the current value next to (iOS) or below (Android) it, like a settings row. */
  label?: string;
};

/**
 * Single choice that fits each platform:
 * - iOS: SwiftUI `Picker` (menu) — native Form row.
 * - Android: a rounded Material list row that opens a bottom sheet with the options. The universal
 *   Picker renders a filled TextField (square corners, underline) there, which doesn't fit the cards.
 *
 * `useSelect` returns the row (put it where the picker goes) and the sheet (render it next to the `Host`).
 */
export function useSelect(t: RowTheme, { options, value, onChange, hint, title, label }: SelectProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';

  if (Platform.OS === 'ios') {
    const row: ReactElement = (
      <SwiftUIPicker
        key={`select-${title}`}
        label={label ?? ''}
        selection={value}
        onSelectionChange={(v) => onChange(String(v))}
        modifiers={[pickerStyle('menu'), tint(t.colors.tint)]}>
        {options.map((o) => (
          <SwiftUIText key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </SwiftUIText>
        ))}
      </SwiftUIPicker>
    );
    return { row, sheet: null };
  }

  if (Platform.OS !== 'android') {
    const row: ReactElement = (
      <Picker key={`select-${title}`} selectedValue={value} onValueChange={onChange}>
        {options.map((o) => (
          <Picker.Item key={o.value} value={o.value} label={o.label} />
        ))}
      </Picker>
    );
    return { row, sheet: null };
  }

  const row: ReactElement = (
    <ListItem
      key={`select-${title}`}
      colors={t.listColors}
      supportingText={label ? <Sub>{current}</Sub> : hint ? <Sub>{hint}</Sub> : undefined}
      trailing={<Icon name={icons.expand} size={20} color={t.colors.secondary} />}
      onPress={() => setOpen(true)}>
      {label ?? current}
    </ListItem>
  );

  const sheet = (
    <BottomSheet isPresented={open} onDismiss={() => setOpen(false)} snapPoints={['half', 'full']}>
      <ScrollView>
        <Column spacing={0}>
          <Text textStyle={{ fontSize: 20, fontWeight: '600', color: t.colors.text }} style={{ padding: 16 }}>
            {title}
          </Text>
          {options.map((o) => (
            <ListItem
              key={o.value}
              colors={{ ...t.listColors, containerColor: 'transparent' }}
              trailing={o.value === value ? <Icon name={icons.check} size={20} color={t.colors.tint} /> : undefined}
              onPress={() => {
                setOpen(false);
                onChange(o.value);
              }}>
              {o.label}
            </ListItem>
          ))}
        </Column>
      </ScrollView>
    </BottomSheet>
  );

  return { row, sheet };
}
