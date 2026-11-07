import { FieldGroup, ListItem, RNHostView } from '@expo/ui';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { ImmichAsset } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { queryKeys } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { AuthImage } from '@/ui/AuthImage';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { formatDateRange } from '@/ui/format';
import { Host } from '@/ui/Host';
import { TextInput } from '@/ui/TextInput';

type Source = { kind: 'search'; query: string } | { kind: 'album'; id: string; name: string };

/** Pick a photo from the user's Immich library (search or album) and link it to a location. Online only. */
export default function ImmichPickerScreen() {
  const { collectionId, locationId } = useLocalSearchParams<{ collectionId: string; locationId: string }>();
  const client = useClient();
  const rt = useRowTheme();
  const { run } = useOnlineAction();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [source, setSource] = useState<Source | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const albums = useQuery({ queryKey: ['immich', 'albums'], queryFn: () => client.immich.albums(), gcTime: 0 });
  const assets = useInfiniteQuery({
    queryKey: ['immich', source],
    enabled: !!source,
    gcTime: 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      source!.kind === 'search'
        ? client.immich.search(source!.query, pageParam)
        : client.immich.album(source!.id, pageParam),
    getNextPageParam: (last) => last.next ?? null,
  });
  const photos = (assets.data?.pages ?? []).flatMap((p) => p.results).filter((a) => a.type !== 'VIDEO');

  const add = async (asset: ImmichAsset) => {
    if (adding) return;
    setAdding(asset.id);
    const done = await run(
      () => client.edit.addImmichImage(locationId, asset.id),
      [queryKeys.collection(collectionId)],
    );
    setAdding(null);
    if (done) router.back();
  };

  const columns = 3;
  const size = Math.floor((width - 32 - (columns - 1) * 4) / columns);
  const search = (text: string) => text.trim() && setSource({ kind: 'search', query: text.trim() });

  return (
    <>
      <Stack.Screen options={{ title: source?.kind === 'album' ? source.name : tr('common.photoFromImmich') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <TextInput
              defaultValue={draft}
              onChangeText={setDraft}
              onSubmitEditing={search}
              returnKeyType="search"
              placeholder={tr('immich.searchEGTempleOr')}
            />
            <ListItem colors={rt.listColors} leading={<RowIcon name="library" />} onPress={() => search(draft)}>
              {tr('common.search')}
            </ListItem>
          </FieldGroup.Section>

          {source ? (
            <FieldGroup.Section
              title={
                assets.isPending
                  ? tr('common.loading')
                  : assets.isError
                    ? tr('immich.nothingFoundOrImmichUnreachable')
                    : tr('immich.tapPhotoAddIt')
              }>
              <RNHostView matchContents>
                <View style={styles.grid}>
                  {photos.map((a) => (
                    <Pressable
                      key={a.id}
                      accessibilityLabel={a.originalFileName ?? tr('common.photo')}
                      onPress={() => void add(a)}
                      style={{ width: size, height: size }}>
                      <AuthImage url={a.image_url} style={[styles.photo, adding === a.id && styles.dim]} />
                      {adding === a.id ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" /> : null}
                    </Pressable>
                  ))}
                </View>
              </RNHostView>
              {assets.hasNextPage ? (
                <ListItem colors={rt.listColors} onPress={() => void assets.fetchNextPage()}>
                  {assets.isFetchingNextPage ? tr('common.loading') : tr('immich.loadMore')}
                </ListItem>
              ) : null}
              <ListItem colors={rt.listColors} onPress={() => setSource(null)}>
                {tr('immich.backAlbums')}
              </ListItem>
            </FieldGroup.Section>
          ) : (
            <FieldGroup.Section title={tr('immich.albums')}>
              {albums.isPending ? <ListItem colors={rt.listColors}>{tr('common.loading')}</ListItem> : null}
              {albums.isError ? <ListItem colors={rt.listColors}>{tr('immich.immichUnreachable')}</ListItem> : null}
              {(albums.data ?? [])
                .filter((a) => (a.assetCount ?? 0) > 0)
                .map((a) => (
                  <ListItem
                    key={a.id}
                    colors={rt.listColors}
                    supportingText={
                      <Sub>
                        {[
                          tr('immich.photos', { count: a.assetCount ?? 0 }),
                          formatDateRange(a.startDate?.slice(0, 10), a.endDate?.slice(0, 10)),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Sub>
                    }
                    onPress={() => setSource({ kind: 'album', id: a.id, name: a.albumName })}>
                    {a.albumName || tr('immich.album')}
                  </ListItem>
                ))}
            </FieldGroup.Section>
          )}
        </FieldGroup>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  dim: { opacity: 0.4 },
});
