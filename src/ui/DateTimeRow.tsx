import { ListItem } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { DatePicker } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { useState, type ReactElement } from 'react';
import { Platform } from 'react-native';

import { formatDayLabel, utcOffset, zoneLabel } from '@/time/tz';
import { dateToPicker, pickerToDate, pickerToTime, timeToPicker } from '@/time/zonedInput';
import { SERVER_ZONES } from '@/time/zones';

import { RowIcon, type RowTheme } from './rows';
import { useSelect } from './Select';
import { Sub } from './Sub';

type Props = {
  label: string;
  /** `YYYY-MM-DD` for mode `date`, `HH:mm` for mode `time`. */
  value: string;
  mode: 'date' | 'time';
  onChange: (value: string) => void;
};

/**
 * A date or a time row. The picker only provides wall-clock components; converting them in the object's own zone
 * is up to the form (`zonedToUtc`). iOS: SwiftUI `DatePicker` in the form. Android: a row that opens the Material
 * dialog. Render `sheet` next to the `Host`.
 */
export function useDateTimeRow(t: RowTheme, { label, value, mode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const pickerValue = mode === 'date' ? dateToPicker(value) : timeToPicker(value);
  const fromPicker = (d: Date) => (mode === 'date' ? pickerToDate(d) : pickerToTime(d));

  if (Platform.OS === 'ios') {
    const row: ReactElement = (
      <DatePicker
        key={`dt-${label}`}
        title={label}
        selection={pickerValue}
        displayedComponents={[mode === 'date' ? 'date' : 'hourAndMinute']}
        onDateChange={(d) => onChange(fromPicker(d))}
        modifiers={[tint(t.colors.tint)]}
      />
    );
    return { row, sheet: null };
  }

  const row: ReactElement = (
    <ListItem
      key={`dt-${label}`}
      colors={t.listColors}
      leading={<RowIcon name={mode === 'date' ? 'event' : 'time'} />}
      supportingText={<Sub>{label}</Sub>}
      onPress={() => setOpen(true)}>
      {mode === 'date' ? formatDayLabel(value) : value}
    </ListItem>
  );
  const sheet = open ? (
    <DateTimePicker
      value={pickerValue}
      mode={mode}
      is24Hour
      presentation="dialog"
      accentColor={t.colors.tint}
      onValueChange={(_, d) => {
        setOpen(false);
        onChange(fromPicker(d));
      }}
      onDismiss={() => setOpen(false)}
    />
  ) : null;
  return { row, sheet };
}

/** `Tokio (UTC+9)` at a given instant. */
export function zoneOptionLabel(zone: string, at: string): string {
  return `${zoneLabel(zone)} (UTC${utcOffset(at, zone)})`;
}

/**
 * Time zone choice: the suggested zones first (those of the collection, the device), then every zone the server
 * accepts.
 */
export function useZoneSelect(
  t: RowTheme,
  {
    label,
    value,
    suggestions,
    at,
    onChange,
  }: { label: string; value: string; suggestions: string[]; at: string; onChange: (z: string) => void },
) {
  const first = [...new Set([value, ...suggestions])].filter((z) => SERVER_ZONES.includes(z));
  const options = [
    ...first.map((z) => ({ value: z, label: zoneOptionLabel(z, at) })),
    ...SERVER_ZONES.filter((z) => !first.includes(z)).map((z) => ({ value: z, label: z.replace(/_/g, ' ') })),
  ];
  return useSelect(t, { title: label, label, value, options, onChange });
}
