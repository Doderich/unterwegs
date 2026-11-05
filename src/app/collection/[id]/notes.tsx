import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';

import { locale, tr } from '@/i18n';
import { useCollectionContext } from '@/data/CollectionContext';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { formatDayLabel } from '@/time/tz';
import { checklistProgress, noteSubtitle, openNote } from '@/ui/entries';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { CollectionLoading } from '@/ui/CollectionLoading';

const byDateThenName = (a: { date?: string | null; name: string }, b: { date?: string | null; name: string }) =>
  (a.date ?? '\uffff').localeCompare(b.date ?? '\uffff') || a.name.localeCompare(b.name, locale());

const dateLabel = (date: string | null | undefined) => (date ? formatDayLabel(date.slice(0, 10)) : null);

export default function NotesScreen() {
  const { view } = useCollectionContext();
  const colors = useColors();
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const [creating, setCreating] = useState(false);
  if (!view) return <CollectionLoading />;

  const collectionId = view.collection.id;
  const notes = [...view.collection.notes].sort(byDateThenName);
  const checklists = [...view.collection.checklists].sort(byDateThenName);

  const newChecklist = async () => {
    setCreating(true);
    const created = await edits.createChecklist(tr('common.newChecklist'), null);
    setCreating(false);
    if (created)
      router.push({
        pathname: '/note/[collectionId]/[itemId]',
        params: { collectionId, itemId: created.id, edit: '1' },
      });
  };

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        {notes.length > 0 ? (
          <FieldGroup.Section title={tr('common.notes')}>
            {notes.map((n) => {
              const sub = [dateLabel(n.date), noteSubtitle(n)].filter(Boolean).join(' · ');
              return (
                <ListItem
                  key={n.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="note" />}
                  supportingText={sub ? <Sub>{sub}</Sub> : undefined}
                  onPress={() => openNote(collectionId, n.id)}>
                  {n.name}
                </ListItem>
              );
            })}
          </FieldGroup.Section>
        ) : null}

        {checklists.length > 0 ? (
          <FieldGroup.Section title={tr('notes.checklists')}>
            {checklists.map((c) => (
              <ListItem
                key={c.id}
                colors={rt.listColors}
                leading={<RowIcon name="checklist" />}
                supportingText={<Sub>{[dateLabel(c.date), checklistProgress(c)].filter(Boolean).join(' · ')}</Sub>}
                onPress={() => openNote(collectionId, c.id)}>
                {c.name}
              </ListItem>
            ))}
          </FieldGroup.Section>
        ) : null}

        {notes.length === 0 && checklists.length === 0 ? (
          <FieldGroup.Section>
            <Text textStyle={{ color: colors.secondary }}>{tr('notes.noNotesOrChecklists')}</Text>
          </FieldGroup.Section>
        ) : null}

        {edits.online ? (
          <FieldGroup.Section title={tr('common.new')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="add" />}
              onPress={() => router.push({ pathname: '/note-edit/[collectionId]', params: { collectionId } })}>
              {tr('common.newNote')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="add" />}
              onPress={creating ? undefined : () => void newChecklist()}>
              {creating ? tr('notes.creating') : tr('common.newChecklist')}
            </ListItem>
          </FieldGroup.Section>
        ) : null}
      </FieldGroup>
    </Host>
  );
}
