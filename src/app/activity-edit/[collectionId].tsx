import { FieldGroup, ListItem } from '@expo/ui';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { ActivityInput, UploadFile } from '@/api/client';
import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { parseServerDuration, parseTypedDuration } from '@/ui/formValues';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { sportOptions } from '@/ui/sports';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { TextInput } from '@/ui/TextInput';

/** `5400` → `1:30` for the duration field. */
const typedDuration = (seconds: number | null) =>
  seconds == null ? '' : `${Math.floor(seconds / 3600)}:${String(Math.round((seconds % 3600) / 60)).padStart(2, '0')}`;
/** Typed number with `,` or `.`; '' → null, invalid → undefined. */
const typedNumber = (text: string): number | null | undefined => {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Create (`activityId` missing) or edit an activity of a visit; a new one can bring a GPX track. Online only. */
export default function ActivityEditScreen() {
  const { collectionId, locationId, visitId, activityId } = useLocalSearchParams<{
    collectionId: string;
    locationId: string;
    visitId: string;
    activityId?: string;
  }>();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const colors = useColors();
  const visit = view?.collection.locations.find((l) => l.id === locationId)?.visits.find((v) => v.id === visitId);
  const activity = activityId ? visit?.activities.find((a) => a.id === activityId) : undefined;

  const focus = useInitialInputFocus(!activity);
  const [name, setName] = useState(activity?.name ?? '');
  const [sport, setSport] = useState(activity?.sport_type ?? 'Hike');
  const [distance, setDistance] = useState(activity?.distance ? String(Math.round(activity.distance / 100) / 10) : '');
  const [duration, setDuration] = useState(typedDuration(parseServerDuration(activity?.moving_time)));
  const [elevation, setElevation] = useState(
    activity?.elevation_gain ? String(Math.round(activity.elevation_gain)) : '',
  );
  const [gpx, setGpx] = useState<UploadFile | null>(null);
  const [saving, setSaving] = useState(false);
  const sportSelect = useSelect(rt, {
    title: tr('common.type'),
    label: tr('common.type'),
    value: sport,
    onChange: setSport,
    options: sportOptions(),
  });

  if (!view || !visit || (activityId && !activity)) return null;

  const pickGpx = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    if (!/\.gpx$/i.test(asset.name)) {
      Alert.alert(tr('activityEdit.notGpxFile'), tr('activityEdit.pleaseChooseFileEndingIn'));
      return;
    }
    setGpx({ uri: asset.uri, name: asset.name, type: 'application/gpx+xml' });
    if (!name.trim()) setName(asset.name.replace(/\.gpx$/i, ''));
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    const km = typedNumber(distance);
    const metres = typedNumber(elevation);
    const time = parseTypedDuration(duration);
    if (km === undefined || metres === undefined || time === undefined) {
      Alert.alert(tr('activityEdit.checkInput'), tr('activityEdit.distanceClimbAsNumbersDuration'));
      return;
    }
    const input: ActivityInput = {
      name: name.trim(),
      sport_type: sport,
      distance: km == null ? null : Math.round(km * 1000),
      moving_time: time,
      elevation_gain: metres,
    };
    setSaving(true);
    const saved = await edits.saveActivity(visit.id, activity?.id ?? null, input, gpx ?? undefined);
    setSaving(false);
    if (saved) router.back();
  };

  const confirmDelete = () =>
    activity &&
    Alert.alert(tr('common.deleteNameConfirm', { name: activity.name }), tr('activityEdit.withGpxTrack'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (await edits.deleteActivity(activity.id)) router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: activity ? tr('activityEdit.editActivity') : tr('activityEdit.newActivity') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!name.trim() || saving || !edits.canEdit}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section title={tr('common.name')}>
            <TextInput
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('activityEdit.eGLoopAroundLake')}
              {...focus}
            />
            {sportSelect.row}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('activityEdit.figures')}>
            <TextInput
              defaultValue={distance}
              onChangeText={setDistance}
              placeholder={tr('activityEdit.distanceInKm')}
              keyboardType="decimal-pad"
            />
            <TextInput
              defaultValue={duration}
              onChangeText={setDuration}
              placeholder={tr('activityEdit.duration130OrMinutes')}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              defaultValue={elevation}
              onChangeText={setElevation}
              placeholder={tr('activityEdit.climbInMetres')}
              keyboardType="number-pad"
            />
          </FieldGroup.Section>
          {activity ? null : (
            <FieldGroup.Section title={tr('activityEdit.gpxTrack')}>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="uploadFile" />}
                supportingText={<Sub>{gpx ? gpx.name : tr('activityEdit.serverReadsElevationStartEnd')}</Sub>}
                onPress={() => void pickGpx()}>
                {gpx ? tr('activityEdit.anotherGpxFile') : tr('activityEdit.chooseGpxFile')}
              </ListItem>
            </FieldGroup.Section>
          )}
          {activity ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={confirmDelete}>
                <Text textStyle={{ color: colors.danger }}>{tr('activityEdit.deleteActivity')}</Text>
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {sportSelect.sheet}
    </>
  );
}
