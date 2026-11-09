import { ListItem } from '@expo/ui';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { ReactElement } from 'react';
import { Alert, Linking } from 'react-native';

import type { MediaOwnerKind, UploadFile } from '@/api/client';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';

import type { useActionSheet } from './ActionSheet';
import { RowIcon, type RowTheme } from './rows';

/** Long edge of uploaded photos: a phone photo of several MB becomes a few hundred KB (roaming data). */
const MAX_EDGE = 2048;

/** File name without its extension, for the attachment title. */
export function attachmentDisplayName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * A shared or picked image, measured and then shrunk. The original file is the one that is resized; the render is
 * only how we learn its size.
 */
export async function shrinkImageFile(uri: string): Promise<UploadFile> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  return shrinkPhoto({ uri, width: image.width, height: image.height });
}

/**
 * Turns one local file into a Pending-edit upload: photos are measured and shrunk, other files keep their name
 * without the extension. The share screen sends every file through this.
 */
export async function enqueueLocalFile(
  edits: Pick<CollectionEdits, 'uploadImage' | 'uploadAttachment'>,
  kind: MediaOwnerKind,
  objectId: string,
  item: { media: string; file: UploadFile },
) {
  if (item.media === 'image') return edits.uploadImage(kind, objectId, await shrinkImageFile(item.file.uri));
  return edits.uploadAttachment(kind, objectId, item.file, attachmentDisplayName(item.file.name));
}

/** One photo from the camera, already shrunk. Null when the person cancels or the camera is unavailable. */
export async function takePhoto(): Promise<UploadFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(tr('media.noAccessCamera'), tr('common.allowAccessInSettings'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('common.settings'), onPress: () => void Linking.openSettings() },
    ]);
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  return shrinkPhoto(result.assets[0]);
}

/** Up to five photos from the library, already shrunk. Empty when the person cancels. */
export async function choosePhotos(): Promise<UploadFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 5,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.map(shrinkPhoto));
}

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
 * "Foto hinzufügen" and "Datei anhängen" for a location, lodging or transportation. A picked photo or file shows at
 * once and waits in the outbox until it is uploaded (ADR 0016); only images from the web need a connection.
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
  const uploadPhotos = (files: UploadFile[]) => {
    // Shown in the gallery at once (the outbox overlay); waiting and failed uploads are the outbox's to report.
    for (const file of files) void edits.uploadImage(kind, objectId, file);
  };

  const fromCamera = async () => {
    const file = await takePhoto();
    if (file) uploadPhotos([file]);
  };

  const fromLibrary = async () => uploadPhotos(await choosePhotos());

  const attachFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const file = { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' };
      void edits.uploadAttachment(kind, objectId, file, attachmentDisplayName(asset.name));
    }
  };

  const addPhoto = () =>
    sheet.open(tr('media.addPhoto'), [
      { label: tr('media.takePhoto'), icon: 'camera', onPress: () => void fromCamera() },
      { label: tr('media.fromLibrary'), icon: 'library', onPress: () => void fromLibrary() },
      ...(edits.can('importImage') ? [webImage()] : []),
    ]);

  const webImage = () => ({
    label: webName ? tr('media.fromWikipediaOrWeb') : tr('media.fromImageAddress'),
    icon: 'world' as const,
    onPress: () =>
      router.push({
        pathname: '/web-image/[collectionId]',
        params: { collectionId: edits.collectionId, kind, objectId, ...(webName ? { name: webName } : {}) },
      }),
  });

  // Photos and files work offline too (ADR 0016); only images from the web need a connection.
  const photoRows: ReactElement[] = edits.canEdit
    ? [
        <ListItem key="add-photo" colors={t.listColors} leading={<RowIcon name="addPhoto" />} onPress={addPhoto}>
          {tr('media.addPhoto')}
        </ListItem>,
      ]
    : [];

  const fileRows: ReactElement[] = edits.canEdit
    ? [
        <ListItem
          key="attach-file"
          colors={t.listColors}
          leading={<RowIcon name="uploadFile" />}
          onPress={() => void attachFile()}>
          {tr('media.attachFile')}
        </ListItem>,
      ]
    : [];

  return { photoRows, fileRows, uploadPhotos };
}
