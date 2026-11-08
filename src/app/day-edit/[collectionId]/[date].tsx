import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useCollectionView } from '@/data/queries';
import { entryTitle } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { formatLongDay } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { Sub } from '@/ui/Sub';
import { addActions, entryActions } from '@/ui/dayPlan';
import { entryRow } from '@/ui/entries';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

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
