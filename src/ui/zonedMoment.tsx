import { FieldGroup } from '@expo/ui';
import { useState, type ReactElement } from 'react';

import type { WallTime } from '@/time/zonedInput';
import { zonedMoment } from '@/time/zonedMoment';

import { useDateTimeRow } from './DateTimeRow';
import type { RowTheme } from './rows';
import { Text } from './Text';
import { useColors } from './theme';

type Options = {
  /** The wall-clock time the form starts with, in `zone`. */
  initial: WallTime;
  /** The object's own zone the time is typed in (ADR 0006); the form owns it, e.g. through a zone choice. */
  zone: string;
  timeLabel: string;
  /** Label of the date row. Leave out with `date` for a time on a date chosen elsewhere (a visit's end). */
  dateLabel?: string;
  /** The date from another moment; this one then has no date row of its own. */
  date?: string;
};

/**
 * One moment of an object (check-in, departure, a visit's start) typed as a date and a time in the object's own
 * zone: holds both, renders their rows (and the clock-change hint when the time doesn't exist), and gives the UTC
 * instant to save. Render `rows` in a form section and `sheets` next to the `Host`.
 */
export function useZonedMoment(t: RowTheme, { initial, zone, timeLabel, dateLabel, date: sharedDate }: Options) {
  const colors = useColors();
  const [ownDate, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const date = sharedDate ?? ownDate;
  const dateRow = useDateTimeRow(t, { label: dateLabel ?? '', value: ownDate, mode: 'date', onChange: setDate });
  const timeRow = useDateTimeRow(t, { label: timeLabel, value: time, mode: 'time', onChange: setTime });
  const { iso, clockChange } = zonedMoment({ date, time }, zone);

  const rows: ReactElement = (
    <>
      {sharedDate === undefined ? dateRow.row : null}
      {timeRow.row}
      {clockChange ? (
        <FieldGroup.SectionFooter>
          <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{clockChange}</Text>
        </FieldGroup.SectionFooter>
      ) : null}
    </>
  );
  const sheets: ReactElement = (
    <>
      {dateRow.sheet}
      {timeRow.sheet}
    </>
  );
  /** The rows one by one, for forms that put something between them; show `clockChange` then too. */
  const parts = { dateRow: dateRow.row, timeRow: timeRow.row, clockChange };
  return { date, time, iso, rows, sheets, parts };
}
