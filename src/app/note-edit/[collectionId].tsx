import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { Note } from '@/api/schemas';
import { realIdFor } from '@/data/outbox';
import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { publicRow } from '@/ui/forms';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { formatDayLabel } from '@/time/tz';
import { useSelect } from '@/ui/Select';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

const NO_DATE = 'none';

/** Create (`noteId` missing) or edit a note. `day`: new note goes onto that day's plan. */
export default function NoteEditScreen() {
  const { collectionId, noteId, day } = useLocalSearchParams<{ collectionId: string; noteId?: string; day?: string }>();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const colors = useColors();
  // A note created offline keeps working here after it is sent and gets its server id.
  const note = noteId ? view?.collection.notes.find((n) => n.id === realIdFor(noteId)) : undefined;

  const initialFocus = useInitialInputFocus(!note);
  const [name, setName] = useState(note?.name ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [links, setLinks] = useState((note?.links ?? []).join('\n'));
  const [date, setDate] = useState(note?.date?.slice(0, 10) ?? day ?? NO_DATE);
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(!!note?.is_public);
  const markdown = useMarkdownEditor(rt, content, setContent);

  const dateSelect = useSelect(rt, {
    title: tr('common.date'),
    value: date,
    onChange: setDate,
    options: [
      { value: NO_DATE, label: tr('noteEdit.noDate') },
      ...(view?.days ?? []).map((d) => ({
        value: d.date,
        label: `${tr('common.dayN', { n: d.number })} · ${formatDayLabel(d.date)}`,
      })),
    ],
  });

  if (!view || (noteId && !note)) return null;

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const saved = await edits.saveNote(
      note?.id ?? null,
      {
        name: name.trim(),
        content,
        date: date === NO_DATE ? null : date,
        links: links
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        is_public: isPublic,
      },
      note ? undefined : day,
    );
    setSaving(false);
    if (saved) router.back();
  };

  const confirmDelete = (target: Note) =>
    Alert.alert(tr('common.deleteNameConfirm', { name: target.name }), tr('common.cantUndone'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          router.dismiss(2);
          await edits.deleteObject('note', target.id);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: note ? tr('noteEdit.editNote') : tr('common.newNote') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!name.trim() || saving}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section title={tr('noteEdit.title')}>
            <TextInput
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('noteEdit.eGPickUpRail')}
              {...initialFocus}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.text')}>{markdown.row}</FieldGroup.Section>
          <FieldGroup.Section title={tr('common.visibility')}>
            {publicRow(rt, isPublic, setIsPublic)}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('noteEdit.links')}>
            <TextInput
              defaultValue={links}
              onChangeText={setLinks}
              placeholder={tr('noteEdit.httpsOneLinkPerLine')}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.date')}>
            {dateSelect.row}
            {!note && day ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('noteEdit.noteAddedDaysPlan')}</Text>
              </FieldGroup.SectionFooter>
            ) : null}
          </FieldGroup.Section>
          {note ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={() => confirmDelete(note)}>
                <Text textStyle={{ color: colors.danger }}>{tr('noteEdit.deleteNote')}</Text>
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {dateSelect.sheet}
    </>
  );
}
