import PagerView from '@expo/ui/community/pager-view';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useCollectionView } from '@/data/queries';
import { isOwner } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { useActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { AuthImage } from '@/ui/AuthImage';
import { androidToolbarIcon } from '@/ui/icons';
import { useRowTheme } from '@/ui/rows';

/** Full-screen photo pager. With `collectionId` (and online): make a photo the cover, or delete it. */
export default function GalleryScreen() {
  const params = useLocalSearchParams<{ urls: string; index?: string; title?: string; collectionId?: string }>();
  const urls: string[] = JSON.parse(params.urls ?? '[]');
  const [index, setIndex] = useState(Number(params.index ?? 0));
  const { view } = useCollectionView(params.collectionId ?? '');
  const edits = useCollectionEdits(params.collectionId ? view : null);
  const rt = useRowTheme();
  const sheet = useActionSheet(rt);

  const collection = params.collectionId ? view?.collection : undefined;
  const owners = collection ? [...collection.locations, ...collection.lodging, ...collection.transportations] : [];
  const owner = owners.find((o) => o.images.some((i) => i.image === urls[index]));
  const image = owner?.images.find((i) => i.image === urls[index]);
  const isLocationImage = !!collection?.locations.some((l) => l.id === owner?.id);

  const openActions = () => {
    if (!image || !collection) return;
    const actions: SheetAction[] = [
      {
        label: tr('gallery.setAsCover'),
        hint: owner?.name ?? undefined,
        icon: 'cover',
        disabled: !!image.is_primary,
        onPress: () => void edits.setPrimaryImage(image.id),
      },
    ];
    if (isOwner(collection) && isLocationImage && (!image.user || image.user === collection.user)) {
      actions.push({
        label: tr('gallery.setAsTripCover'),
        icon: 'cover',
        onPress: () => void edits.setCover(image.id),
      });
    }
    actions.push({
      label: tr('gallery.deletePhoto'),
      icon: 'delete',
      destructive: true,
      onPress: () =>
        Alert.alert(tr('gallery.deletePhotoConfirm'), tr('common.cantUndone'), [
          { text: tr('common.cancel'), style: 'cancel' },
          {
            text: tr('common.delete'),
            style: 'destructive',
            onPress: () => {
              router.back();
              void edits.deleteImage(image.id);
            },
          },
        ]),
    });
    sheet.open(tr('common.photo'), actions);
  };

  return (
    <View style={styles.container}>
      {/* Black header and background in both themes. */}
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          title: urls.length > 1 ? tr('gallery.nOfTotal', { n: index + 1, total: urls.length }) : (params.title ?? ''),
        }}
      />
      {image && edits.canEdit ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('more')}
            accessibilityLabel={tr('gallery.editPhoto')}
            onPress={openActions}>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <PagerView style={{ flex: 1 }} initialPage={index} onPageSelected={(e) => setIndex(e.nativeEvent.position)}>
        {urls.map((url) => (
          <View key={url} style={styles.page}>
            <AuthImage url={url} style={styles.image} contentFit="contain" />
          </View>
        ))}
      </PagerView>
      {sheet.sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  page: { flex: 1 },
  image: { flex: 1 },
});
