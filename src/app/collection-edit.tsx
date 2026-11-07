import { FieldGroup, ListItem } from '@expo/ui';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { todayIn } from '@/time/today';
import { daysBetween, deviceTimeZone } from '@/time/tz';
import { useDateTimeRow } from '@/ui/DateTimeRow';
import { nextDate } from '@/ui/formValues';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { TextInput } from '@/ui/TextInput';

/** Create a collection (`collectionId` missing) or edit its name, dates, description and link (owner only). */
export default function CollectionEditScreen() {
  const { collectionId } = useLocalSearchParams<{ collectionId?: string }>();
  const { view } = useCollectionView(collectionId ?? '');
  const edits = useCollectionEdits(collectionId ? view : null);
  const actions = useCollectionsActions();
  const rt = useRowTheme();
  const colors = useColors();
  const collection = collectionId ? view?.collection : undefined;

  const today = todayIn(deviceTimeZone());
  const initialFocus = useInitialInputFocus(!collection);
  const [name, setName] = useState(collection?.name ?? '');
  const [start, setStart] = useState(collection?.start_date?.slice(0, 10) ?? today);
  const [end, setEnd] = useState(collection?.end_date?.slice(0, 10) ?? nextDate(nextDate(today)));
  const [description, setDescription] = useState(collection?.description ?? '');
  const [link, setLink] = useState(collection?.link ?? '');
  const [saving, setSaving] = useState(false);
  const markdown = useMarkdownEditor(rt, description, setDescription);

  const startRow = useDateTimeRow(rt, {
    label: tr('collectionEdit.firstDay'),
    value: start,
    mode: 'date',
    onChange: setStart,
  });
  const endRow = useDateTimeRow(rt, {
    label: tr('collectionEdit.lastDay'),
    value: end,
    mode: 'date',
    onChange: setEnd,
  });

  if (collectionId && !collection) return null;

  const days = daysBetween(start, end) + 1;
  const datesOk = days >= 1 && days <= 366;

  const save = async () => {
    if (!name.trim() || saving) return;
    if (!datesOk) {
      Alert.alert(tr('collectionEdit.checkDates'), tr('collectionEdit.lastDayMustOnOr'));
      return;
    }
    const input = {
      name: name.trim(),
      start_date: start,
      end_date: end,
      description: description.trim() || null,
      link: link.trim() || null,
    };

    if (!collection) {
      setSaving(true);
      const created = await actions.createCollection(input);
      setSaving(false);
      if (created) router.replace({ pathname: '/collection/[id]', params: { id: created.id, name: created.name } });
      return;
    }

    // Like the server: shorter dates delete the plan of the days that drop out. Ask first.
    const outside = (date: string | null | undefined) => !!date && (date < start || date > end);
    const lostItems = collection.itinerary.filter((i) => !i.is_global && outside(i.date)).length;
    const lostDays = collection.itinerary_days.filter((d) => outside(d.date) && (d.name || d.description)).length;
    const run = async () => {
      setSaving(true);
      const saved = await edits.saveCollection(input);
      setSaving(false);
      if (saved) router.back();
    };
    if (lostItems + lostDays > 0) {
      Alert.alert(
        tr('collectionEdit.daysWillDropped'),
        tr('collectionEdit.itemsPlanEntriesDaysDay', {
          items: lostItems,
          days: lostDays,
        }),
        [
          { text: tr('common.cancel'), style: 'cancel' },
          { text: tr('collectionEdit.saveAnyway'), style: 'destructive', onPress: () => void run() },
        ],
      );
    } else await run();
  };

  const online = collection ? edits.online : actions.online;

  /** A new collection from a ZIP export (this app's or the website's). */
  const importZip = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setSaving(true);
    const created = await actions.importCollection({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/zip',
    });
    setSaving(false);
    if (created) router.replace({ pathname: '/collection/[id]', params: { id: created.id, name: created.name } });
  };

  return (
    <>
      <Stack.Screen options={{ title: collection ? tr('common.editTrip') : tr('common.newTrip') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!name.trim() || saving || !online}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section title={tr('common.name')}>
            <TextInput
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('collectionEdit.eGFamilyTripJapan')}
              {...initialFocus}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('collectionEdit.dates')}>
            {startRow.row}
            {endRow.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: datesOk ? colors.secondary : colors.danger }}>
                {datesOk ? tr('common.days', { count: days }) : tr('collectionEdit.lastDayMustOnOr')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('collectionEdit.description')}>
            {markdown.row}
            <TextInput
              testID="collection-link"
              defaultValue={link}
              onChangeText={setLink}
              placeholder={tr('common.linkHttps')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FieldGroup.Section>
          {!collection && online ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} leading={<RowIcon name="uploadFile" />} onPress={() => void importZip()}>
                {saving ? tr('collectionEdit.importing') : tr('collectionEdit.importFromZipFile')}
              </ListItem>
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {tr('collectionEdit.tripSavedWithExportZip')}
                </Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}
          {!online ? (
            <FieldGroup.Section>
              <Text textStyle={{ color: colors.secondary }}>{tr('common.editingNeedsInternetConnection')}</Text>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {startRow.sheet}
      {endRow.sheet}
    </>
  );
}
