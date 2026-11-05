import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { unscheduled, viewToday, type UnscheduledItem } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';
import { formatDayLabel } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { entryRow, openLodging, openNote, stayRow } from '@/ui/entries';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors, useListColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { typeScale } from '@/ui/typeScale';
import { CollectionLoading } from '@/ui/CollectionLoading';

export default function DaysScreen() {
  const listColors = useListColors();
  const { view } = useCollectionContext();
  const colors = useColors();
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const sheet = useActionSheet(rt);
  const [generating, setGenerating] = useState(false);
  if (!view) return <CollectionLoading />;
  const today = viewToday(view).date;
  const open = unscheduled(view);
  const collectionId = view.collection.id;

  const openItem = (u: UnscheduledItem) => {
    if (u.kind === 'note' || u.kind === 'checklist') openNote(collectionId, u.id);
    else if (u.kind === 'lodging') openLodging(collectionId, u.id);
    else router.push({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: u.id } });
  };
  const itemActions = (u: UnscheduledItem) =>
    sheet.open(u.title, [
      { label: tr('common.open'), icon: 'chevron', onPress: () => openItem(u) },
      ...(edits.online
        ? [
            {
              label: tr('days.addDay'),
              icon: 'addToPlan' as const,
              onPress: () => {
                sheet.open(
                  tr('common.whichDayConfirm'),
                  view.days.map((d) => ({
                    label: `${tr('common.dayN', { n: d.number })} · ${formatDayLabel(d.date)}`,
                    hint: d.name ?? undefined,
                    onPress: () => edits.addToDay(d.date, u.kind, u.id),
                  })),
                );
                return false as const;
              },
            },
          ]
        : []),
    ]);

  const canGenerate = edits.online && view.collection.itinerary.length === 0 && !!view.collection.start_date;
  const generate = () =>
    Alert.alert(tr('days.fillDayPlanFromDatesConfirm'), tr('days.visitsGoOnTheirDays'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('days.fill'),
        onPress: async () => {
          setGenerating(true);
          const result = await edits.autoGenerateItinerary();
          setGenerating(false);
          if (result) Alert.alert(tr('days.entriesPlanned', { count: result.items.length }));
        },
      },
    ]);

  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {canGenerate ? (
            <FieldGroup.Section>
              <ListItem
                colors={listColors}
                leading={<RowIcon name="addToPlan" />}
                onPress={generating ? undefined : generate}>
                {generating ? tr('days.planning') : tr('days.fillDayPlanFromDates')}
              </ListItem>
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {tr('days.dayPlanEmptyEverythingWith')}
                </Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}
          {view.days.map((day) => (
            <FieldGroup.Section key={day.date}>
              <FieldGroup.SectionHeader>
                {/* Sentence case and a size up from the default section label, so a day reads as a heading. */}
                <Text
                  textStyle={{
                    ...typeScale.supporting,
                    fontWeight: '600',
                    color: day.date === today ? colors.tint : colors.text,
                  }}>
                  {[
                    tr('common.dayN', { n: day.number }),
                    formatDayLabel(day.date),
                    day.date === today ? tr('common.today') : null,
                    day.name,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </FieldGroup.SectionHeader>
              {day.entries.map((entry) => entryRow(rt, entry, view, day.date))}
              {day.nightLodging &&
              !day.entries.some((e) => e.kind === 'lodging' && e.lodging.id === day.nightLodging!.id)
                ? stayRow(rt, view, day, day.nightLodging)
                : null}
              {day.entries.length === 0 && !day.nightLodging ? (
                <Text textStyle={{ color: colors.secondary }}>{tr('common.nothingPlanned')}</Text>
              ) : null}
            </FieldGroup.Section>
          ))}
          {open.length > 0 ? (
            <FieldGroup.Section title={tr('common.notPlannedYet')}>
              {open.map((u) => (
                <ListItem
                  key={u.id}
                  colors={listColors}
                  leading={<RowIcon name={u.kind} color={colors.secondary} />}
                  onPress={() => itemActions(u)}>
                  {u.title}
                </ListItem>
              ))}
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('days.onNoDayYetTap')}</Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
