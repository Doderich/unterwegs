import { Column, FieldGroup, ListItem } from '@expo/ui';
import PagerView, { type PagerViewRef } from '@expo/ui/community/pager-view';
import { router } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import type { Lodging } from '@/api/schemas';
import { useCollectionContext } from '@/data/CollectionContext';
import { isConnected } from '@/data/onlineWrite';
import { entryTitle, isMember, viewToday, type CollectionView, type Day } from '@/data/selectors';
import { tr } from '@/i18n';
import { initialDayIndex } from '@/time/today';
import { formatLongDay } from '@/time/tz';
import { dayLabel } from './dayPlan';

import { CardRow, cardRowWidth } from './CardRow';
import { DayStrip } from './DayNav';
import { NextUpCard, nextEntry, useNow } from './NextUp';
import { RefreshableFieldGroup } from './RefreshableFieldGroup';
import type { IconKey } from './icons';
import { nightsLabel } from './StaySummary';
import { entryRow, openEntryDetail, stayRow } from './entries';
import { DayPhotoStrip, type DayPhoto } from './Memories';
import { Host } from './Host';
import { markdownRows, offlineNoticeRow, RowIcon, useRowTheme, type RowTheme } from './rows';
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
  const offline = !isConnected(network);
  const statusRows = useStatusRows({ offline });
  const { query, offline: media } = useCollectionContext();
  const { width: windowWidth } = useWindowDimensions();
  const now = useNow();
  const refresh = async () => {
    await query.refetch();
    await media.sync();
  };
  const total = view.days.length;
  const isToday = day.date === today;
  const night = day.nightLodging;
  const lastDay = day.number === total;
  // The trip's first and last morning get a word of their own; the rest of the days stay plain.
  const greeting =
    isToday && total > 1
      ? day.number === 1
        ? tr('today.firstDayGreeting')
        : lastDay
          ? tr('today.lastDayGreeting')
          : null
      : null;
  // The ending: on the last day, and whenever the finished trip is opened again, a short look back.
  const showSummary = lastDay && today >= day.date;
  // Looking back: once a day is over, its photos come forward.
  const dayPhotos = day.date < today ? photosOfDay(view, day) : [];
  // Tonight's lodging has its own section; its check-in entry would only repeat it.
  const entries = day.entries.filter((e) => !(e.kind === 'lodging' && night && e.lodging.id === night.id));
  const daySelect = useSelect(rt, {
    title: tr('common.chooseDay'),
    label: tr('today.allDays'),
    value: String(day.number - 1),
    onChange: (v) => onSelectDay(Number(v)),
    options: view.days.map((d, i) => ({
      value: String(i),
      label: dayLabel(d, { today: d.date === today }),
    })),
  });

  return (
    <>
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          {offline ? <FieldGroup.Section>{offlineNoticeRow(rt, query.dataUpdatedAt)}</FieldGroup.Section> : null}
          {isToday && nextEntry(day, now) ? (
            <CardRow>
              <NextUpCard view={view} day={day} now={now} width={cardRowWidth(windowWidth)} />
            </CardRow>
          ) : null}
          <FieldGroup.Section>
            <Column key="title" spacing={4} alignment="start">
              <Text textStyle={{ ...typeScale.title, color: rt.colors.text }}>{formatLongDay(day.date)}</Text>
              <Text textStyle={{ ...typeScale.supporting, color: isToday ? rt.colors.tint : rt.colors.secondary }}>
                {[isToday ? tr('common.today') : null, tr('common.dayNOfTotal', { n: day.number, total }), day.name]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {greeting ? <Text textStyle={{ ...typeScale.bodyStrong, color: rt.colors.tint }}>{greeting}</Text> : null}
            </Column>
            {daySelect.row}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.schedule')}>
            {entries.length > 0 ? (
              entries.map((entry) => entryRow(rt, entry, view, day.date))
            ) : (
              <Text textStyle={{ color: rt.colors.secondary }}>{tr('common.nothingPlanned')}</Text>
            )}
            {/* Editing the day works offline too (ADR 0016); only members of the collection can. */}
            {isMember(view.collection) ? (
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
            ) : null}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('today.tonight')}>{nightRow(rt, view, day, night)}</FieldGroup.Section>

          {day.description ? (
            <FieldGroup.Section title={tr('today.notesForDay')}>
              {markdownRows(rt, day.description, `desc-${day.date}`)}
            </FieldGroup.Section>
          ) : null}

          {dayPhotos.length > 0 ? (
            <CardRow title={tr('today.photosOfDay')}>
              <DayPhotoStrip photos={dayPhotos} width={cardRowWidth(windowWidth)} />
            </CardRow>
          ) : null}

          {showSummary ? tripSummarySection(rt, view) : null}

          {statusRows}
          {Platform.OS === 'ios' ? <TabBarSpacer /> : null}
        </RefreshableFieldGroup>
      </Host>
      {daySelect.sheet}
    </>
  );
}

/** The trip in numbers, as the closing section of the last day. */
function tripSummarySection(rt: RowTheme, view: CollectionView) {
  const locations = view.collection.locations;
  const visited = locations.filter((l) => l.is_visited).length;
  const nights = view.lodgings.reduce((sum, l) => sum + (l.nights ?? 0), 0);
  const connections = view.collection.transportations.length;
  const rows: [IconKey, string][] = [
    ['days', tr('common.days', { count: view.days.length })],
    [
      'location',
      visited > 0 ? tr('today.visited', { count: visited }) : tr('common.places', { count: locations.length }),
    ],
    ['lodging', `${tr('common.stayCount', { count: view.lodgings.length })} · ${nightsLabel(nights)}`],
    ...(connections > 0 ? ([['train', tr('today.connections', { count: connections })]] as [IconKey, string][]) : []),
  ];
  return (
    <FieldGroup.Section title={tr('today.summaryTitle')}>
      {rows.map(([icon, text]) => (
        <ListItem key={icon} colors={rt.listColors} leading={<RowIcon name={icon} />}>
          {text}
        </ListItem>
      ))}
      <FieldGroup.SectionFooter>
        <Text textStyle={{ ...typeScale.label, color: rt.colors.secondary }}>{tr('today.summaryFooter')}</Text>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}

/** Every photo of the day's places, stays and connections, in the order of the day (at most 12). */
function photosOfDay(view: CollectionView, day: Day): DayPhoto[] {
  return day.entries
    .flatMap((entry) => {
      const images =
        entry.kind === 'location'
          ? entry.location.images
          : entry.kind === 'lodging'
            ? entry.lodging.images
            : entry.kind === 'transportation'
              ? entry.transport.images
              : [];
      return (images ?? []).map((img, i) => ({
        key: `${entry.key}-${i}`,
        url: img.image,
        label: entryTitle(entry),
        onPress: () => openEntryDetail(view.collection.id, entry),
      }));
    })
    .slice(0, 12);
}

function nightRow(rt: RowTheme, view: CollectionView, day: Day, night: Lodging | null) {
  if (night) return stayRow(rt, view, day, night);
  return (
    <Text textStyle={{ color: rt.colors.secondary }}>
      {day.number === view.days.length ? tr('today.lastDayOfTrip') : tr('today.noAccommodationAdded')}
    </Text>
  );
}
