import { Button, FieldGroup } from '@expo/ui';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { tr } from '@/i18n';
import { deviceTimeZone, formatDayLabel, formatTime, localDate, utcOffset } from '@/time/tz';
import { utcToZoned } from '@/time/zonedInput';
import { zonedMoment } from '@/time/zonedMoment';
import { useDateTimeRow, useZoneSelect } from '@/ui/DateTimeRow';
import { FormHost } from '@/ui/FormHost';
import { useNow } from '@/ui/NextUp';
import { useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { typeScale } from '@/ui/typeScale';
import { updateTravelPreferences, useTravelPreferences } from '@/utilities/travelStore';
import { zoneDayDifference } from '@/utilities/timeZones';

export default function TimeZonesScreen() {
  const rt = useRowTheme();
  const prefs = useTravelPreferences();
  const home = prefs.homeZone ?? deviceTimeZone();
  const away = prefs.awayZone;
  const now = useNow();
  const [chosen, setChosen] = useState<string | null>(null);
  const [clockChange, setClockChange] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Capture home once so travelling with an automatically changing device zone doesn't move home too.
  useFocusEffect(
    useCallback(() => {
      if (!prefs.homeZone) {
        try {
          updateTravelPreferences({ homeZone: home });
        } catch {
          setError(true);
        }
      }
    }, [prefs.homeZone, home]),
  );
  const iso = chosen ?? new Date(now).toISOString();
  const wall = utcToZoned(iso, home);
  const persist = (patch: Parameters<typeof updateTravelPreferences>[0]) => {
    try {
      updateTravelPreferences(patch);
      setError(false);
    } catch {
      setError(true);
    }
  };
  const homeSelect = useZoneSelect(rt, {
    label: tr('timeZones.home'),
    value: home,
    suggestions: [deviceTimeZone(), 'Europe/Berlin', 'UTC'],
    at: iso,
    onChange: (homeZone) => persist({ homeZone }),
  });
  const awaySelect = useZoneSelect(rt, {
    label: tr('timeZones.destination'),
    value: away,
    suggestions: ['Asia/Tokyo', 'America/New_York', 'Europe/London'],
    at: iso,
    onChange: (awayZone) => persist({ awayZone }),
  });
  const change = (patch: Partial<typeof wall>) => {
    const result = zonedMoment({ ...wall, ...patch }, home);
    setChosen(result.iso);
    setClockChange(result.clockChange);
  };
  const date = useDateTimeRow(rt, {
    label: tr('timeZones.dateAtHome'),
    value: wall.date,
    mode: 'date',
    onChange: (date) => change({ date }),
  });
  const time = useDateTimeRow(rt, {
    label: tr('timeZones.timeAtHome'),
    value: wall.time,
    mode: 'time',
    onChange: (time) => change({ time }),
  });
  const difference = zoneDayDifference(iso, home, away);
  return (
    <>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>
            {homeSelect.row}
            <Text textStyle={{ ...typeScale.figure, color: rt.colors.text }}>{formatTime(iso, home)}</Text>
            <Text
              textStyle={{
                ...typeScale.supporting,
                color: rt.colors.secondary,
              }}>{`${formatDayLabel(localDate(iso, home))} · UTC${utcOffset(iso, home)}`}</Text>
          </FieldGroup.Section>
          <FieldGroup.Section>
            {awaySelect.row}
            <Text textStyle={{ ...typeScale.figure, color: rt.colors.text }}>{formatTime(iso, away)}</Text>
            <Text
              textStyle={{
                ...typeScale.supporting,
                color: rt.colors.secondary,
              }}>{`${formatDayLabel(localDate(iso, away))} · UTC${utcOffset(iso, away)}`}</Text>
            {difference !== 0 ? (
              <Text>
                {difference > 0
                  ? tr('timeZones.daysAhead', { count: difference })
                  : tr('timeZones.daysBehind', { count: -difference })}
              </Text>
            ) : null}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('timeZones.compareTime')}>
            {date.row}
            {time.row}
            {clockChange ? <Text>{clockChange}</Text> : null}
            {chosen ? (
              <Button
                label={tr('timeZones.now')}
                variant="text"
                onPress={() => {
                  setChosen(null);
                  setClockChange(null);
                }}
              />
            ) : null}
          </FieldGroup.Section>
          {error ? (
            <FieldGroup.Section>
              <Text>{tr('travelTools.saveFailed')}</Text>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {homeSelect.sheet}
      {awaySelect.sheet}
      {date.sheet}
      {time.sheet}
    </>
  );
}
