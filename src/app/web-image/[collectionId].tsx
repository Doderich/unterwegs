import { FieldGroup, ListItem, RNHostView } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { MediaOwnerKind } from '@/api/client';
import type { WebImage } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useLocationAction } from '@/data/useLocation';
import { getLanguage, tr } from '@/i18n';
import { wikimediaThumb } from '@/ui/format';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Host } from '@/ui/Host';
import { TextInput } from '@/ui/TextInput';

/**
 * Add a photo from the web to a location, lodging or transportation: Wikipedia images found by the object's name,
 * or any public image address. The server downloads the image. Online only.
 */
export default function WebImageScreen() {
  const { collectionId, kind, objectId, name, library } = useLocalSearchParams<{
    collectionId: string;
    kind: MediaOwnerKind;
    objectId: string;
    name?: string;
    /** A place in the library, not a location opened from a collection. */
    library?: string;
  }>();
  const standalone = library === '1';
  const client = useClient();
  const { view } = useCollectionView(standalone ? '' : collectionId);
  const edits = useCollectionEdits(standalone ? null : view);
  const placeWrite = useLocationAction(objectId);
  const rt = useRowTheme();
  const { width } = useWindowDimensions();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const canImport = standalone ? placeWrite.online : edits.can('importImages');

  const wiki = useQuery({
    queryKey: ['wikipedia-images', name, getLanguage()],
    queryFn: () => client.wikipediaImages(name!, getLanguage()),
    enabled: !!name && canImport,
    gcTime: 0,
    retry: false,
  });

  const add = async (address: string, source: 'wikipedia' | 'url') => {
    if (adding || !address) return;
    setAdding(address);
    const result = standalone
      ? await placeWrite.run(() => client.edit.importImages(kind, objectId, [address], source))
      : await edits.importImages(kind, objectId, [address], source);
    setAdding(null);
    if (result) router.back();
  };

  const typed = url.trim();
  const validUrl = /^https?:\/\/\S+$/i.test(typed);
  const columns = 2;
  const size = Math.floor((width - 32 - (columns - 1) * 8) / columns);

  return (
    <>
      <Stack.Screen options={{ title: tr('common.photoFromWeb') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('webImage.imageAddress')}>
            <TextInput
              defaultValue={url}
              onChangeText={setUrl}
              placeholder={tr('webImage.httpsLinkImage')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => validUrl && void add(typed, 'url')}
            />
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="add" />}
              onPress={validUrl && canImport ? () => void add(typed, 'url') : undefined}>
              {adding === typed && typed ? tr('common.adding') : tr('webImage.addImage')}
            </ListItem>
          </FieldGroup.Section>

          {name ? (
            <FieldGroup.Section
              title={
                !canImport
                  ? tr('common.onlyWithInternet')
                  : wiki.isPending
                    ? tr('common.loading')
                    : wiki.isError
                      ? tr('common.notReachableRightNowTry')
                      : wiki.data?.length
                        ? tr('webImage.wikipediaTapImageAddIt')
                        : tr('webImage.wikipediaHasNoImageOf', { name })
              }>
              {wiki.data?.length ? (
                <RNHostView matchContents>
                  <View style={styles.grid}>
                    {wiki.data.map((img: WebImage) => (
                      <Pressable
                        key={img.source}
                        accessibilityLabel={img.title ?? tr('common.photo')}
                        onPress={() => void add(img.source, 'wikipedia')}
                        style={{ width: size, height: size * 0.75 }}>
                        <Image
                          source={{ uri: wikimediaThumb(img.source) }}
                          contentFit="cover"
                          style={[styles.photo, adding === img.source && styles.dim]}
                        />
                        {adding === img.source ? (
                          <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </RNHostView>
              ) : null}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  dim: { opacity: 0.4 },
});
