import { Button, FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { clearSharedPayloads, useIncomingShare, type UseIncomingShareResult } from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { MediaOwnerKind } from '@/api/client';
import { sharedFiles, uploadSharedFiles } from '@/data/incomingShare';
import { useCollections, useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { enqueueLocalFile } from '@/ui/media';
import { infoRow, RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

/** Review received files, choose a collection and object, then explicitly upload. */
export default function ShareScreen() {
  const [attempt, setAttempt] = useState(0);
  // Leaving the screen any other way (back gesture, a new start) must not keep the received copies around.
  useEffect(() => () => clearSharedPayloads(), []);
  return <IncomingShare key={attempt} retry={() => setAttempt((a) => a + 1)} />;
}

function IncomingShare({ retry }: { retry: () => void }) {
  const incoming = useIncomingShare();
  const key = incoming.sharedPayloads.map((p) => p.value).join('|');
  return <ShareForm key={key} incoming={incoming} retry={retry} />;
}

function ShareForm({ incoming, retry }: { incoming: UseIncomingShareResult; retry: () => void }) {
  const {
    collectionId = '',
    objectId = '',
    kind = '',
  } = useLocalSearchParams<{
    collectionId?: string;
    objectId?: string;
    kind?: string;
  }>();
  const collections = useCollections();
  const collection = useCollectionView(collectionId);
  const edits = useCollectionEdits(collection.view);
  const rt = useRowTheme();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const completed = useRef(new Set<string>());
  const [done, setDone] = useState(0);
  const files = sharedFiles(incoming.resolvedSharedPayloads);
  const select = useSelect(rt, {
    title: tr('share.chooseTrip'),
    label: tr('common.trip'),
    value: collectionId,
    options: [
      { value: '', label: tr('share.pleaseChoose') },
      ...(collections.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    onChange: (id) => router.setParams({ collectionId: id, objectId: '', kind: '' }),
  });
  const c = collection.view?.collection;
  const groups: {
    title: string;
    kind: MediaOwnerKind;
    icon: 'lodging' | 'plane' | 'location';
    items: { id: string; name: string }[];
  }[] = c
    ? [
        { title: tr('common.stays'), kind: 'lodging', icon: 'lodging', items: c.lodging },
        { title: tr('share.connections'), kind: 'transportation', icon: 'plane', items: c.transportations },
        { title: tr('share.locations'), kind: 'location', icon: 'location', items: c.locations },
      ]
    : [];
  const target = groups.find((g) => g.kind === kind)?.items.find((i) => i.id === objectId);
  const close = () => {
    if (busy.current) return;
    incoming.clearSharedPayloads();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const attach = async () => {
    if (!target || !c || busy.current || !edits.canEdit) return;
    busy.current = true;
    setSaving(true);
    try {
      const ok = await uploadSharedFiles(files, completed.current, async (item) => {
        return enqueueLocalFile(edits, kind as MediaOwnerKind, objectId, item);
      });
      setDone(completed.current.size);
      if (ok) {
        incoming.clearSharedPayloads();
        const pathname =
          kind === 'lodging'
            ? '/lodging/[collectionId]/[itemId]'
            : kind === 'transportation'
              ? '/transport/[collectionId]/[itemId]'
              : '/location/[collectionId]/[itemId]';
        router.replace({ pathname, params: { collectionId, itemId: objectId } });
      }
    } catch {
      setDone(completed.current.size);
      Alert.alert(tr('common.notSaved'), tr('share.fileCouldNotProcessedPlease'));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <Stack.Screen options={{ title: tr('share.attachFiles'), gestureEnabled: !saving, headerBackVisible: !saving }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('share.received')}>
            {incoming.isResolving ? <Text>{tr('common.loading')}</Text> : null}
            {incoming.error ? (
              <Text textStyle={{ color: rt.colors.danger }}>{tr('share.fileCouldNotRead')}</Text>
            ) : null}
            {incoming.error ? <Button label={tr('common.tryAgain')} onPress={retry} /> : null}
            {files.map((f, index) =>
              infoRow(rt, {
                key: f.key,
                icon: f.media === 'image' ? 'image' : 'pdf',
                value: f.file.name,
                label: index < done ? tr('share.saved') : f.file.type,
              }),
            )}
            {!incoming.isResolving && !incoming.error && files.length === 0 ? (
              <Text>{tr('share.sharePdfOrPhotoWith')}</Text>
            ) : null}
            {files.length < incoming.resolvedSharedPayloads.length ? (
              <Text>{tr('share.onlyPdfsPhotosCanAttached')}</Text>
            ) : null}
          </FieldGroup.Section>
          {files.length > 0 && !saving && done === 0 ? <FieldGroup.Section>{select.row}</FieldGroup.Section> : null}
          {collections.isError && !collections.data ? (
            <FieldGroup.Section>
              <Text>{tr('share.tripsCouldNotLoaded')}</Text>
              <Button label={tr('common.tryAgain')} onPress={() => void collections.refetch()} />
            </FieldGroup.Section>
          ) : null}
          {collectionId && !c ? (
            <FieldGroup.Section>
              <Text>{collection.isError ? tr('common.couldntLoadTrip') : tr('common.loading')}</Text>
              <Button label={tr('common.tryAgain')} onPress={() => void collection.refetch()} />
            </FieldGroup.Section>
          ) : null}
          {c && !saving && done === 0 ? (
            <>
              {groups.map((g) => (
                <FieldGroup.Section key={g.kind} title={g.title}>
                  {g.items.map((item) => (
                    <ListItem
                      key={item.id}
                      colors={rt.listColors}
                      leading={<RowIcon name={g.icon} />}
                      trailing={kind === g.kind && objectId === item.id ? <RowIcon name="check" /> : undefined}
                      onPress={() => router.setParams({ kind: g.kind, objectId: item.id })}>
                      {item.name}
                    </ListItem>
                  ))}
                </FieldGroup.Section>
              ))}
              {edits.canEdit ? (
                <FieldGroup.Section>
                  <ListItem
                    colors={rt.listColors}
                    leading={<RowIcon name="add" />}
                    onPress={() =>
                      router.push({
                        pathname: '/lodging-edit/[collectionId]',
                        params: { collectionId, fromShare: '1' },
                      })
                    }>
                    {tr('common.newStay')}
                  </ListItem>
                  <ListItem
                    colors={rt.listColors}
                    leading={<RowIcon name="add" />}
                    onPress={() =>
                      router.push({
                        pathname: '/transport-edit/[collectionId]',
                        params: { collectionId, fromShare: '1' },
                      })
                    }>
                    {tr('common.newConnection')}
                  </ListItem>
                </FieldGroup.Section>
              ) : null}
            </>
          ) : null}
          <FieldGroup.Section>
            {target ? <Text>{tr('share.attachName', { name: target.name })}</Text> : null}
            {done ? <Text>{tr('common.doneOfTotalDone', { done, total: files.length })}</Text> : null}
            {!edits.canEdit ? <Text>{tr('share.youNeedInternetConnectionAttach')}</Text> : null}
            <Button
              label={saving ? tr('share.uploading') : tr('common.attach')}
              disabled={saving || !target || !edits.canEdit || !files.length}
              onPress={() => void attach()}
            />
            <Button label={tr('common.cancel')} variant="text" disabled={saving} onPress={close} />
            <FieldGroup.SectionFooter>
              <Sub>{tr('share.ifUploadFailsFilesStay')}</Sub>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {!saving && done === 0 ? select.sheet : null}
    </>
  );
}
