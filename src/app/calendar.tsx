import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';

import { agenda, type AgendaDay, type AgendaEvent } from '@/data/calendar';
import { useCalendar } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { todayIn } from '@/time/today';
import { deviceTimeZone, formatLongDay } from '@/time/tz';
import { formatPlainDate } from '@/ui/format';
import { androidToolbarIcon } from '@/ui/icons';
import { useServerFile } from '@/ui/serverFile';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { useRowTheme, type RowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';

/** Agenda of all collections: trips, transportation, lodging, visits and dated notes (`/api/calendar/events`). */
export default function CalendarScreen() {
  const rt = useRowTheme();
  const calendar = useCalendar();
  const [showPast, setShowPast] = useState(false);
  const zone = deviceTimeZone();
  const today = todayIn(zone);
  const { upcoming, past } = useMemo(() => agenda(calendar.data ?? [], today, zone), [calendar.data, today, zone]);
  const online = useOnline();
  const serverFile = useServerFile();

  return (
    <>
      {online ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('share')}
            accessibilityLabel={tr('calendar.intoPhonesCalendar')}
            disabled={!!serverFile.busy}
            onPress={() =>
              void serverFile.open(
                '/api/ics-calendar/generate',
                'unterwegs.ics',
                'text/calendar',
                tr('common.calendar'),
              )
            }>
            {tr('calendar.export')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={async () => void (await calendar.refetch())}>
          {upcoming.length === 0 ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors}>
                {calendar.isPending
                  ? tr('common.loading')
                  : calendar.isError
                    ? tr('common.couldNotLoadedPullRefresh')
                    : tr('calendar.nothingPlanned')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {upcoming.map((d) => daySection(rt, d, today))}
          {past.length > 0 ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} onPress={() => setShowPast(!showPast)}>
                {showPast ? tr('calendar.hidePast') : tr('calendar.showPast', { count: past.length })}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {showPast ? past.map((d) => daySection(rt, d, today)) : null}
        </RefreshableFieldGroup>
      </Host>
    </>
  );
}

function daySection(rt: RowTheme, day: AgendaDay, today: string): ReactElement {
  const title = day.date === today ? `${tr('common.today')} · ${formatLongDay(day.date)}` : formatLongDay(day.date);
  return (
    <FieldGroup.Section key={day.date} title={title}>
      {day.events.map((e) => eventRow(rt, e))}
    </FieldGroup.Section>
  );
}

function eventRow(rt: RowTheme, e: AgendaEvent): ReactElement {
  const when = e.endDate !== e.date ? `${tr('calendar.until')} ${formatPlainDate(e.endDate)}` : e.time ? e.time : null;
  const meta = [
    when,
    e.type === 'collection' ? null : e.collection_name,
    e.type === 'collection' ? null : e.location_label,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListItem
      key={e.id}
      colors={rt.listColors}
      leading={<Sub>{e.icon ?? '•'}</Sub>}
      supportingText={<Sub>{meta}</Sub>}
      onPress={openEvent(e)}>
      {e.title}
    </ListItem>
  );
}

/** The app's own detail screen for the event, when it belongs to a collection the app can open. */
function openEvent(e: AgendaEvent): (() => void) | undefined {
  const collectionId = e.collection_id;
  const itemId = e.resource_id;
  if (!collectionId) return undefined;
  if (e.type === 'collection') return () => router.push({ pathname: '/collection/[id]', params: { id: collectionId } });
  if (!itemId) return undefined;
  if (e.type === 'visit')
    return () => router.push({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId } });
  if (e.type === 'lodging')
    return () => router.push({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId } });
  if (e.type === 'transportation')
    return () => router.push({ pathname: '/transport/[collectionId]/[itemId]', params: { collectionId, itemId } });
  if (e.type === 'note')
    return () => router.push({ pathname: '/note/[collectionId]/[itemId]', params: { collectionId, itemId } });
  return undefined;
}
