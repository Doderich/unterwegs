import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Checklist } from '@/api/schemas';
import { realIdFor } from '@/data/outbox';
import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { formatDayLabel } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { useTextPrompt } from '@/ui/TextPrompt';
import { checklistProgress } from '@/ui/entries';
import { androidToolbarIcon, icons } from '@/ui/icons';
import { noteRows } from '@/ui/notes';
import { infoRow, RowIcon, useRowTheme, type RowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { typeScale } from '@/ui/typeScale';
import { TextInput, type TextInputRef } from '@/ui/TextInput';

export default function NoteScreen() {
  const { collectionId, itemId, edit } = useLocalSearchParams<{
    collectionId: string;
    itemId: string;
    edit?: string;
  }>();
  const { view } = useCollectionView(collectionId);
  const colors = useColors();
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const actions = useActionSheet(rt);
  const prompt = useTextPrompt(rt);
  const [editing, setEditing] = useState(edit === '1');
  const newItem = useRef<TextInputRef>(null);
  const [newItemText, setNewItemText] = useState('');
  const [name, setName] = useState<string | null>(null);
  if (!view) return null;

  // Something created offline keeps working here after it is sent and gets its server id.
  const id = realIdFor(itemId);
  const note = view.collection.notes.find((n) => n.id === id);
  const checklist = note ? undefined : view.collection.checklists.find((c) => c.id === id);
  const item = note ?? checklist;
  if (!item) return null;

  const plannedDays = view.days.filter((d) =>
    d.entries.some((e) => (e.kind === 'note' && e.note.id === id) || (e.kind === 'checklist' && e.checklist.id === id)),
  );

  const confirmDelete = () =>
    Alert.alert(tr('common.deleteNameConfirm', { name: item.name }), tr('common.cantUndone'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          router.back();
          await edits.deleteObject(note ? 'note' : 'checklist', item.id);
        },
      },
    ]);

  const finishEditing = async () => {
    if (checklist && name !== null && name.trim() && name.trim() !== checklist.name) {
      await edits.renameChecklist(checklist, name);
    }
    setName(null);
    setEditing(false);
  };

  const addItem = async () => {
    if (!checklist || !newItemText.trim()) return;
    const text = newItemText;
    setNewItemText('');
    newItem.current?.clear();
    await edits.addChecklistItem(checklist, text);
  };

  return (
    <>
      <Stack.Screen options={{ title: note ? tr('common.note') : tr('note.checklist') }} />
      <Stack.Toolbar placement="right">
        {note ? (
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() =>
              router.push({ pathname: '/note-edit/[collectionId]', params: { collectionId, noteId: note.id } })
            }>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button
            icon={androidToolbarIcon(editing ? 'check' : 'edit')}
            accessibilityLabel={editing ? tr('common.done') : tr('common.edit')}
            onPress={() => (editing ? void finishEditing() : setEditing(true))}>
            {editing ? tr('common.done') : tr('common.edit')}
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>
            {checklist && editing ? (
              <TextInput defaultValue={checklist.name} onChangeText={setName} placeholder={tr('note.listName')} />
            ) : (
              <Text textStyle={{ ...typeScale.title, color: colors.text }}>{item.name}</Text>
            )}
            {checklist ? (
              <Text
                textStyle={{
                  color:
                    checklist.items.length > 0 && checklist.items.every((it) => it.is_checked)
                      ? colors.tint
                      : colors.secondary,
                }}>
                {checklistProgress(checklist)}
              </Text>
            ) : null}
          </FieldGroup.Section>

          {note ? (
            noteRows(rt, note).length > 0 ? (
              <FieldGroup.Section>{noteRows(rt, note)}</FieldGroup.Section>
            ) : null
          ) : (
            <FieldGroup.Section>
              {checklistItemRows(rt, checklist!, editing, (i) =>
                editing
                  ? actions.open(checklist!.items[i].name, [
                      {
                        label: tr('common.rename'),
                        icon: 'edit',
                        onPress: () =>
                          prompt.open({
                            title: tr('note.renameItem'),
                            value: checklist!.items[i].name,
                            onSave: (v) => edits.renameChecklistItem(checklist!, i, v),
                          }),
                      },
                      {
                        label: tr('note.deleteItem'),
                        icon: 'delete',
                        destructive: true,
                        onPress: () => edits.removeChecklistItem(checklist!, i),
                      },
                    ])
                  : void edits.toggleChecklistItem(checklist!, i),
              )}
              <TextInput
                ref={newItem}
                onChangeText={setNewItemText}
                placeholder={tr('note.newItem')}
                returnKeyType="done"
                onSubmitEditing={() => void addItem()}
              />
            </FieldGroup.Section>
          )}

          {plannedDays.length > 0 ? (
            <FieldGroup.Section title={tr('note.planned')}>
              {plannedDays.map((d) =>
                infoRow(rt, {
                  key: d.date,
                  icon: 'days',
                  label: tr('common.dayN', { n: d.number }),
                  value: [formatDayLabel(d.date), d.name].filter(Boolean).join(' · '),
                }),
              )}
            </FieldGroup.Section>
          ) : null}

          {editing ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={confirmDelete}>
                {tr('note.deleteChecklist')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {actions.sheet}
      {prompt.sheet}
    </>
  );
}

/** Tap to tick (or, while editing, to open the item's actions). */
function checklistItemRows(t: RowTheme, checklist: Checklist, editing: boolean, onPress: (index: number) => void) {
  return checklist.items.map((item, i) => (
    <ListItem
      key={item.id}
      colors={t.listColors}
      leading={
        <RowIcon
          name={item.is_checked ? 'checked' : 'unchecked'}
          color={item.is_checked ? undefined : t.colors.secondary}
        />
      }
      trailing={editing ? <Icon name={icons.edit} size={18} color={t.colors.secondary} /> : undefined}
      onPress={() => onPress(i)}>
      {item.name}
    </ListItem>
  ));
}
