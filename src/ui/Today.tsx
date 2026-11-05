import { Column, FieldGroup, ListItem } from '@expo/ui';
import PagerView, { type PagerViewRef } from '@expo/ui/community/pager-view';
import { router } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import type { Lodging } from '@/api/schemas';
import { viewToday, type CollectionView, type Day } from '@/data/selectors';
import { tr } from '@/i18n';
import { initialDayIndex } from '@/time/today';
import { formatDayLabel, formatLongDay } from '@/time/tz';

import { DayStrip } from './DayNav';
import { entryRow, stayRow } from './entries';
import { Host } from './Host';
import { markdownRows, RowIcon, useRowTheme, type RowTheme } from './rows';
import { useSelect } from './Select';
import { useStatusRows } from './StatusRows';
import { TabBarSpacer } from './TabBarSpacer';
import { useReduceMotion } from './theme';
import { Text } from './Text';
import { typeScale } from './typeScale';

/**
 * Today (docs/DESIGN-PLAN.md §4): the strip of days above the pager, then per day the programme, tonight's
 * lodging and the day's notes. Swiping between days and the "Alle Tage" picker stay.
 */
export function Today({
  view,
  initialDate,
  insetHeader = true,
  onDayChange,
}: {
  view: CollectionView;
  initialDate?: string | null;
  insetHeader?: boolean;
  onDayChange: (date: string) => void;
}) {
  const today = viewToday(view).date;
  const dates = useMemo(() => view.days.map((d) => d.date), [view.days]);
  const [index, setIndex] = useState(() => initialDayIndex(dates, initialDate ?? today));
  const pager = useRef<PagerViewRef>(null);
  const reduceMotion = useReduceMotion();
  const selectedDate = dates[index];
  useEffect(() => {
    if (selectedDate) onDayChange(selectedDate);
  }, [selectedDate, onDayChange]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(view.days.length - 1, i));
    setIndex(next);
    // A tapped day jumps straight there with reduced motion; swiping stays the user's own gesture.
    if (reduceMotion) pager.current?.setPageWithoutAnimation(next);
    else pager.current?.setPage(next);
  };

  return (
    <View style={{ flex: 1 }}>
      <DayStrip insetHeader={insetHeader} dates={dates} index={index} today={today} onSelect={go} />
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={index}
        onPageSelected={(e) => setIndex(e.nativeEvent.position)}>
        {view.days.map((day, i) => (
          <View key={day.date} style={{ flex: 1 }}>
            {/* Only the visible day and its neighbours: every day is a full native form. */}
            {Math.abs(i - index) <= 1 ? <DayPage view={view} day={day} today={today} onSelectDay={go} /> : null}
          </View>
        ))}
      </PagerView>
    </View>
  );
}

function DayPage({
  view,
  day,
  today,
  onSelectDay,
}: {
  view: CollectionView;
  day: Day;
  today: string;
  onSelectDay: (index: number) => void;
}) {
  const rt = useRowTheme();
  const network = useNetworkState();
  const offline = network.isInternetReachable === false || network.isConnected === false;
  const statusRows = useStatusRows({ offline });
  const total = view.days.length;
  const isToday = day.date === today;
  const night = day.nightLodging;
  // Tonight's lodging has its own section; its check-in entry would only repeat it.
  const entries = day.entries.filter((e) => !(e.kind === 'lodging' && night && e.lodging.id === night.id));
  const daySelect = useSelect(rt, {
    title: tr('common.chooseDay'),
    label: tr('today.allDays'),
    value: String(day.number - 1),
    onChange: (v) => onSelectDay(Number(v)),
    options: view.days.map((d, i) => ({
      value: String(i),
      label: `${tr('common.dayN', { n: d.number })} · ${formatDayLabel(d.date)}${d.date === today ? ` · ${tr('common.today')}` : ''}`,
    })),
  });

  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <Column key="title" spacing={2} alignment="start">
              <Text textStyle={{ ...typeScale.heading, color: rt.colors.text }}>{formatLongDay(day.date)}</Text>
              <Text textStyle={{ ...typeScale.supporting, color: isToday ? rt.colors.tint : rt.colors.secondary }}>
                {[isToday ? tr('common.today') : null, tr('common.dayNOfTotal', { n: day.number, total }), day.name]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Column>
            {daySelect.row}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.schedule')}>
            {entries.length > 0 ? (
              entries.map((entry) => entryRow(rt, entry, view, day.date))
            ) : (
              <Text textStyle={{ color: rt.colors.secondary }}>{tr('common.nothingPlanned')}</Text>
            )}
            {offline ? null : (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="edit" />}
                onPress={() =>
                  router.push({
                    pathname: '/day-edit/[collectionId]/[date]',
                    params: { collectionId: view.collection.id, date: day.date },
                  })
                }>
                {tr('common.editDay')}
              </ListItem>
            )}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('today.tonight')}>{nightRow(rt, view, day, night)}</FieldGroup.Section>

          {day.description ? (
            <FieldGroup.Section title={tr('today.notesForDay')}>
              {markdownRows(rt, day.description, `desc-${day.date}`)}
            </FieldGroup.Section>
          ) : null}

          {statusRows}
          {Platform.OS === 'ios' ? <TabBarSpacer /> : null}
        </FieldGroup>
      </Host>
      {daySelect.sheet}
    </>
  );
}

function nightRow(rt: RowTheme, view: CollectionView, day: Day, night: Lodging | null) {
  if (night) return stayRow(rt, view, day, night);
  return (
    <Text textStyle={{ color: rt.colors.secondary }}>
      {day.number === view.days.length ? tr('today.lastDayOfTrip') : tr('today.noAccommodationAdded')}
    </Text>
  );
}
