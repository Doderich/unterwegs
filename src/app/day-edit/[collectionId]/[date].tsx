import { FieldGroup, ListItem, TextInput } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useCollectionView } from '@/data/queries';
import { entryObjectId, entryTitle, unscheduled, type DayEntry, type Day, type CollectionView } from '@/data/selectors';
import { useCollectionEdits, type CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { formatDayLabel, formatLongDay } from '@/time/tz';
import { useActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { Sub } from '@/ui/Sub';
import { entryRow, openEntryDetail, openNote, transportTitle } from '@/ui/entries';
import { androidToolbarIcon, transportIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';

/** Plan one day: name + description, reorder / move / remove entries, add notes, checklists and collection items. */
export default function DayEditScreen() {
  const { collectionId, date } = useLocalSearchParams<{ collectionId: string; date: string }>();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const colors = useColors();
  const sheet = useActionSheet(rt);
  const day = view?.days.find((d) => d.date === date);
  const [name, setName] = useState(day?.name ?? '');
  const [description, setDescription] = useState(day?.description ?? '');
  const [saving, setSaving] = useState(false);
  const markdown = useMarkdownEditor(rt, description, setDescription);
  if (!view || !day) return null;

  const dirty = name !== (day.name ?? '') || description !== (day.description ?? '');
  const done = async () => {
    if (dirty) {
      setSaving(true);
      const saved = await edits.saveDay(day.date, name.trim(), description);
      setSaving(false);
      if (!saved) return;
    }
    router.back();
  };

  const newChecklist = async () => {
    const created = await edits.createChecklist(tr('common.newChecklist'), day.date);
    if (created)
      router.push({
        pathname: '/note/[collectionId]/[itemId]',
        params: { collectionId, itemId: created.id, edit: '1' },
      });
  };

  return (
    <>
      <Stack.Screen options={{ title: tr('dayEdit.editDayN', { n: day.number }) }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.done')}
          disabled={saving}
          onPress={() => void done()}>
          {saving ? tr('common.saving') : tr('common.done')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section title={formatLongDay(day.date)}>
            <TextInput defaultValue={name} onChangeText={setName} placeholder={tr('dayEdit.titleOfDayEG')} />
            {markdown.row}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.schedule')}>
            {day.entries.length > 0 ? (
              day.entries.map((entry) =>
                entryRow(rt, entry, view, day.date, (e) =>
                  sheet.open(entryTitle(e), entryActions(view, day, e, edits, sheet.open)),
                ),
              )
            ) : (
              <Text textStyle={{ color: colors.secondary }}>{tr('common.nothingPlanned')}</Text>
            )}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('dayEdit.tapMoveOrRemoveChanges')}</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('dayEdit.add')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="note" />}
              onPress={() =>
                router.push({ pathname: '/note-edit/[collectionId]', params: { collectionId, day: day.date } })
              }>
              {tr('common.newNote')}
            </ListItem>
            <ListItem colors={rt.listColors} leading={<RowIcon name="checklist" />} onPress={() => void newChecklist()}>
              {tr('common.newChecklist')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="location" />}
              onPress={() =>
                router.push({ pathname: '/location-edit/[collectionId]', params: { collectionId, day: day.date } })
              }>
              {tr('common.newPlace')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="lodging" />}
              onPress={() =>
                router.push({ pathname: '/lodging-edit/[collectionId]', params: { collectionId, day: day.date } })
              }>
              {tr('common.newStay')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="train" />}
              onPress={() =>
                router.push({ pathname: '/transport-edit/[collectionId]', params: { collectionId, day: day.date } })
              }>
              {tr('common.newConnection')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="addToPlan" />}
              supportingText={<Sub>{tr('dayEdit.placesStaysTransportNotes')}</Sub>}
              onPress={() => sheet.open(tr('dayEdit.addFromTrip'), addActions(view, day, edits))}>
              {tr('dayEdit.addFromTrip')}
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </FormHost>
      {sheet.sheet}
    </>
  );
}

function entryActions(
  view: CollectionView,
  day: Day,
  entry: DayEntry,
  edits: CollectionEdits,
  open: (title: string, actions: SheetAction[]) => void,
): SheetAction[] {
  const openAction: SheetAction = {
    label: tr('common.open'),
    icon: 'chevron',
    onPress: () =>
      entry.kind === 'note' || entry.kind === 'checklist'
        ? openNote(view.collection.id, entryObjectId(entry))
        : openEntryDetail(view.collection.id, entry),
  };
  if (!entry.itineraryId) {
    const byDate = entry.kind === 'note' || entry.kind === 'checklist';
    return [
      byDate
        ? {
            label: tr('dayEdit.addPlan'),
            hint: tr('dayEdit.onlyShownHereBecauseOf'),
            icon: 'addToPlan',
            onPress: () => edits.addToDay(day.date, entry.kind, entryObjectId(entry)),
          }
        : {
            label: tr('dayEdit.placedInPlanByTimes'),
            hint: tr('dayEdit.canOnlyMovedOnWebsite'),
            icon: 'time',
            disabled: true,
            onPress: () => undefined,
          },
      openAction,
    ];
  }

  const planned = day.entries.filter((e) => e.itineraryId);
  const index = planned.findIndex((e) => e.key === entry.key);
  return [
    openAction,
    ...(index > 0
      ? [{ label: tr('dayEdit.moveUp'), icon: 'up' as const, onPress: () => edits.moveEntry(day, entry, -1) }]
      : []),
    ...(index < planned.length - 1
      ? [{ label: tr('dayEdit.moveDown'), icon: 'down' as const, onPress: () => edits.moveEntry(day, entry, 1) }]
      : []),
    {
      label: tr('dayEdit.moveAnotherDay'),
      icon: 'moveDay',
      onPress: () => {
        open(
          tr('common.whichDayConfirm'),
          view.days
            .filter((d) => d.date !== day.date)
            .map((d) => ({
              label: `${tr('common.dayN', { n: d.number })} · ${formatDayLabel(d.date)}`,
              hint: d.name ?? undefined,
              onPress: () => edits.moveEntryToDay(d, entry),
            })),
        );
        return false;
      },
    },
    {
      label: tr('dayEdit.removeFromDay'),
      icon: 'remove',
      hint: entry.kind === 'location' ? tr('dayEdit.placeStaysInTripVisit') : tr('dayEdit.staysInTripJustNot'),
      destructive: true,
      onPress: () =>
        Alert.alert(tr('dayEdit.removeNameFromDayConfirm', { name: entryTitle(entry) }), undefined, [
          { text: tr('common.cancel'), style: 'cancel' },
          { text: tr('common.remove'), style: 'destructive', onPress: () => void edits.removeEntry(entry) },
        ]),
    },
  ];
}

/** Collection items not on this day yet: those on no day at all first, then locations, lodging, … */
function addActions(view: CollectionView, day: Day, edits: CollectionEdits): SheetAction[] {
  const onDay = new Set(day.entries.map(entryObjectId));
  const t = view.collection;
  const add = (kind: DayEntry['kind'], id: string) => () => edits.addToDay(day.date, kind, id);
  const open = unscheduled(view);
  const openIds = new Set(open.map((u) => u.id));
  const firstOpen: SheetAction[] = open.map((u) => ({
    label: u.title,
    hint: tr('common.notPlannedYet'),
    icon: u.kind,
    onPress: add(u.kind, u.id),
  }));
  const actions: SheetAction[] = [
    ...firstOpen,
    ...t.locations
      .filter((l) => !onDay.has(l.id) && !openIds.has(l.id))
      .map((l) => ({
        label: l.name,
        hint: l.category?.display_name ?? l.location ?? undefined,
        icon: 'location' as const,
        onPress: add('location', l.id),
      })),
    ...t.lodging
      .filter((l) => !onDay.has(l.id) && !openIds.has(l.id))
      .map((l) => ({
        label: l.name,
        hint: l.location ?? undefined,
        icon: 'lodging' as const,
        onPress: add('lodging', l.id),
      })),
    ...t.transportations
      .filter((x) => !onDay.has(x.id))
      .map((x) => ({ label: transportTitle(x), icon: transportIcon(x.type), onPress: add('transportation', x.id) })),
    ...t.notes
      .filter((n) => !onDay.has(n.id) && !openIds.has(n.id))
      .map((n) => ({ label: n.name, icon: 'note' as const, onPress: add('note', n.id) })),
    ...t.checklists
      .filter((c) => !onDay.has(c.id) && !openIds.has(c.id))
      .map((c) => ({ label: c.name, icon: 'checklist' as const, onPress: add('checklist', c.id) })),
  ];
  return actions.length > 0
    ? actions
    : [{ label: tr('dayEdit.everythingFromTripAlreadyOn'), disabled: true, onPress: () => undefined }];
}
