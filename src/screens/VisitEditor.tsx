import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { locationZone, viewToday } from '@/data/selectors';
import { useClient } from '@/auth/session';
import { useLocation, useLocationAction } from '@/data/useLocation';
import { todayIn } from '@/time/today';
import { suggestedZone } from '@/time/placeZone';
import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { deviceTimeZone, formatDayLabel, visitTime } from '@/time/tz';
import { utcToZoned, zonedToUtc } from '@/time/zonedInput';
import { useDateTimeRow, useZoneSelect } from '@/ui/DateTimeRow';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, switchRow, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

/** The website's placeholder note for visits it creates from the itinerary; never shown or written back. */
const GENERATED_VISIT_NOTE = 'Created from itinerary planning';

/** Create (`visitId` missing) or edit a visit of a location: day, all-day or a time span, zone, note. */
export function VisitEditor({
  collectionId,
  locationId,
  visitId,
  day,
}: {
  collectionId?: string;
  locationId: string;
  visitId?: string;
  day?: string;
}) {
  const { view } = useCollectionView(collectionId ?? '');
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const colors = useColors();
  const standalone = useLocation(collectionId ? '' : locationId);
  const direct = useLocationAction(locationId);
  const client = useClient();
  const location = collectionId ? view?.collection.locations.find((l) => l.id === locationId) : standalone.data;
  const visit = visitId ? location?.visits.find((v) => v.id === visitId) : undefined;

  const initial = (() => {
    if (!location) return null;
    if (visit?.start_date) {
      const zone = visit.timezone ?? view?.timeZone ?? deviceTimeZone();
      const t = visitTime(visit.start_date, visit.end_date, zone);
      return {
        date: t.date,
        allDay: t.time === null,
        start: t.time ?? '10:00',
        end: visit.end_date && t.time ? utcToZoned(visit.end_date, zone).time : '11:00',
        zone,
        notes: visit.notes && visit.notes !== GENERATED_VISIT_NOTE ? visit.notes : '',
      };
    }
    const placeZone =
      location.latitude != null && location.longitude != null
        ? suggestedZone(location.latitude, location.longitude)
        : null;
    const fallbackZone = placeZone ?? deviceTimeZone();
    const date = day ?? (view ? viewToday(view).date : todayIn(fallbackZone));
    const zone =
      view?.days.find((d) => d.date === date)?.nightLodging?.timezone ??
      (view ? locationZone(view, location) : fallbackZone);
    return { date, allDay: true, start: '10:00', end: '11:00', zone, notes: '' };
  })();

  const [date, setDate] = useState(initial?.date ?? '2000-01-01');
  const [allDay, setAllDay] = useState(initial?.allDay ?? true);
  const [start, setStart] = useState(initial?.start ?? '10:00');
  const [end, setEnd] = useState(initial?.end ?? '11:00');
  const [zone, setZone] = useState(initial?.zone ?? 'UTC');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const dateRow = useDateTimeRow(rt, { label: tr('common.date'), value: date, mode: 'date', onChange: setDate });
  const startRow = useDateTimeRow(rt, { label: tr('visitEdit.from'), value: start, mode: 'time', onChange: setStart });
  const endRow = useDateTimeRow(rt, { label: tr('visitEdit.to'), value: end, mode: 'time', onChange: setEnd });
  const zones = view
    ? [view.timeZone, ...view.collection.lodging.flatMap((l) => (l.timezone ? [l.timezone] : [])), deviceTimeZone()]
    : [];
  const zoneSelect = useZoneSelect(rt, {
    label: tr('common.timeZone'),
    value: zone,
    suggestions: zones,
    at: `${date}T12:00:00Z`,
    onChange: setZone,
  });

  if (!location || (visitId && !visit)) return null;

  const dayNumber = view?.days.find((d) => d.date === date)?.number;

  const save = async () => {
    if (saving) return;
    let startIso: string;
    let endIso: string;
    if (allDay) {
      // Like the website and the server: all-day visits are midnight UTC of the date.
      startIso = endIso = `${date}T00:00:00Z`;
    } else {
      startIso = zonedToUtc({ date, time: start }, zone).iso;
      endIso = zonedToUtc({ date, time: end }, zone).iso;
      if (Date.parse(endIso) <= Date.parse(startIso)) {
        Alert.alert(tr('common.checkTime'), tr('visitEdit.endMustAfterStart'));
        return;
      }
    }
    setSaving(true);
    const input = {
      start_date: startIso,
      end_date: endIso,
      timezone: zone,
      notes: notes.trim(),
    };
    const saved = collectionId
      ? await edits.saveVisit(location, visit?.id ?? null, input)
      : await direct.run(() =>
          visit ? client.edit.updateVisit(visit.id, input) : client.edit.addVisit({ ...input, location: locationId }),
        );
    setSaving(false);
    if (saved) router.back();
  };

  const confirmDelete = () =>
    Alert.alert(tr('visitEdit.deleteVisitConfirm'), formatDayLabel(date), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          router.back();
          if (visit) {
            if (collectionId) await edits.deleteVisit(visit.id);
            else await direct.run(() => client.edit.deleteVisit(visit.id).then(() => true));
          }
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: visit ? tr('visitEdit.editVisit') : tr('common.addVisit') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={saving || !edits.canEdit}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section title={location.name}>
            {dateRow.row}
            {switchRow(rt, { label: tr('visitEdit.allDay'), value: allDay, onChange: setAllDay })}
            {allDay ? null : startRow.row}
            {allDay ? null : endRow.row}
            {allDay ? null : zoneSelect.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                {collectionId
                  ? dayNumber
                    ? tr('visitEdit.dayNOfTrip', { n: dayNumber })
                    : tr('visitEdit.outsideTripsDays')
                  : tr('places.visitHint')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.note')}>
            <TextInput
              defaultValue={notes}
              onChangeText={setNotes}
              placeholder={tr('visitEdit.eGGoEarlyBeat')}
              multiline
            />
          </FieldGroup.Section>
          {visit ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={confirmDelete}>
                {tr('visitEdit.deleteVisit')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {dateRow.sheet}
      {startRow.sheet}
      {endRow.sheet}
      {zoneSelect.sheet}
    </>
  );
}
