import { ListItem } from '@expo/ui';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { ReactElement } from 'react';
import { Alert, Linking } from 'react-native';

import type { MediaOwnerKind, UploadFile } from '@/api/client';
import { discardUpload, trackUpload, usePendingUploads, type PendingUpload } from '@/data/uploads';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';

import type { useActionSheet } from './ActionSheet';
import { RowIcon, type RowTheme } from './rows';
import { Sub } from './Sub';

/** Long edge of uploaded photos: a phone photo of several MB becomes a few hundred KB (roaming data). */
const MAX_EDGE = 2048;

/** Shrinks a picked photo to JPEG with at most `MAX_EDGE` px on the long side. */
export async function shrinkPhoto(asset: { uri: string; width: number; height: number }): Promise<UploadFile> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, name: `foto-${Date.now()}.jpg`, type: 'image/jpeg' };
}

type ActionSheet = ReturnType<typeof useActionSheet>;

/**
 * "Foto hinzufügen" and "Datei anhängen" for a location, lodging or transportation, plus rows for uploads that are
 * running or failed. Online only (the rows are hidden offline).
 */
export function useMediaUploads(
  t: RowTheme,
  edits: CollectionEdits,
  sheet: ActionSheet,
  kind: MediaOwnerKind,
  objectId: string,
  /** The object's name, to look for Wikipedia images (locations). */
  webName?: string,
) {
  const pending = usePendingUploads(objectId);

  const uploadPhotos = (files: UploadFile[]) => {
    for (const file of files) trackUpload(objectId, 'image', file, (f) => edits.uploadImage(kind, objectId, f));
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tr('media.noAccessCamera'), tr('common.allowAccessInSettings'), [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('common.settings'), onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    uploadPhotos(await Promise.all(result.assets.map(shrinkPhoto)));
  };

  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
    });
    if (result.canceled) return;
    uploadPhotos(await Promise.all(result.assets.map(shrinkPhoto)));
  };

  const attachFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const file = { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' };
      const name = asset.name.replace(/\.[^.]+$/, '');
      trackUpload(objectId, 'file', file, (f) => edits.uploadAttachment(kind, objectId, f, name));
    }
  };

  const addPhoto = () =>
    sheet.open(tr('media.addPhoto'), [
      { label: tr('media.takePhoto'), icon: 'camera', onPress: () => void fromCamera() },
      { label: tr('media.fromLibrary'), icon: 'library', onPress: () => void fromLibrary() },
      {
        label: webName ? tr('media.fromWikipediaOrWeb') : tr('media.fromImageAddress'),
        icon: 'world',
        onPress: () =>
          router.push({
            pathname: '/web-image/[collectionId]',
            params: { collectionId: edits.collectionId, kind, objectId, ...(webName ? { name: webName } : {}) },
          }),
      },
    ]);

  const pendingRow = (p: PendingUpload): ReactElement => (
    <ListItem
      key={p.key}
      colors={p.status === 'failed' ? { ...t.listColors, contentColor: t.colors.danger } : t.listColors}
      leading={<RowIcon name={p.media === 'image' ? 'image' : 'attachment'} />}
      supportingText={<Sub>{p.status === 'failed' ? tr('media.tapRetryOrDiscard') : p.file.name}</Sub>}
      onPress={
        p.status === 'failed'
          ? () =>
              sheet.open(tr('media.uploadFailed'), [
                { label: tr('common.tryAgain'), icon: 'refresh', onPress: () => p.retry() },
                {
                  label: tr('media.discard'),
                  icon: 'delete',
                  destructive: true,
                  onPress: () => discardUpload(p.key),
                },
              ])
          : undefined
      }>
      {p.status === 'failed'
        ? tr('media.uploadFailed')
        : p.media === 'image'
          ? tr('media.uploadingPhoto')
          : tr('media.uploadingFile')}
    </ListItem>
  );

  const photoRows: ReactElement[] = edits.online
    ? [
        ...pending.filter((p) => p.media === 'image').map(pendingRow),
        <ListItem key="add-photo" colors={t.listColors} leading={<RowIcon name="addPhoto" />} onPress={addPhoto}>
          {tr('media.addPhoto')}
        </ListItem>,
      ]
    : pending.filter((p) => p.media === 'image').map(pendingRow);

  const fileRows: ReactElement[] = edits.online
    ? [
        ...pending.filter((p) => p.media === 'file').map(pendingRow),
        <ListItem
          key="attach-file"
          colors={t.listColors}
          leading={<RowIcon name="uploadFile" />}
          onPress={() => void attachFile()}>
          {tr('media.attachFile')}
        </ListItem>,
      ]
    : pending.filter((p) => p.media === 'file').map(pendingRow);

  return { photoRows, fileRows, uploadPhotos };
}
