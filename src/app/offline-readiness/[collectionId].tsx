import { Button, FieldGroup, ListItem } from '@expo/ui';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useCollectionView, useOfflineCopy } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { usePendingCount } from '@/data/useOutbox';
import { collectionMediaUrls } from '@/data/selectors';
import { requestErrorText } from '@/api/errors';
import { tr } from '@/i18n';
import { useOfflineMaps } from '@/maps/useOfflineMaps';
import { collectionReadiness } from '@/offline/readiness';
import { useMediaOffline } from '@/offline/useCollectionOffline';
import { missingCollection } from '@/ui/CollectionLoading';
import { formatUpdatedAt } from '@/ui/format';
import { Host } from '@/ui/Host';
import { infoRow, RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';

export default function ReadinessScreen() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const query = useCollectionView(collectionId);
  const saved = useOfflineCopy(collectionId);
  const mediaUrls = useMemo(() => {
    if (!saved.data) return [];
    const urls = collectionMediaUrls(saved.data);
    return [...urls.images, ...urls.attachments];
  }, [saved.data]);
  // Collection screens already auto-download. Merely inspecting readiness must not start another batch.
  const media = useMediaOffline(mediaUrls, false);
  const maps = useOfflineMaps(collectionId);
  const pending = usePendingCount(collectionId);
  const online = useOnline();
  const rt = useRowTheme();
  const [, refresh] = useState(0);
  // Recheck files when returning from a download screen or after the app comes back to this route.
  useFocusEffect(
    useCallback(() => {
      refresh((n) => n + 1);
      const timer = setInterval(() => refresh((n) => n + 1), 3000);
      return () => clearInterval(timer);
    }, []),
  );
  if (!query.view) return missingCollection(query, false);
  const readiness = collectionReadiness(query.view.collection);
  const busy = query.isFetching || media.running;
  const sync = async () => {
    const result = await saved.refetch();
    const latest = result.data ?? saved.data;
    if (!latest) return;
    const urls = collectionMediaUrls(latest);
    await media.sync([...urls.images, ...urls.attachments]);
  };
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title={query.view.collection.name}>
          {infoRow(rt, {
            icon: 'offline',
            label: tr('utilities.collectionCopy'),
            value: tr('statusRows.updatedTime', { time: formatUpdatedAt(query.dataUpdatedAt) }),
          })}
          {query.isError ? <Text>{requestErrorText(query.error)}</Text> : null}
          {!online ? <Text>{tr('common.offlineAllSaved')}</Text> : null}
          {readiness.images.total
            ? infoRow(rt, {
                icon: 'image',
                label: tr('utilities.images'),
                value: tr('utilities.savedCount', { cached: readiness.images.cached, total: readiness.images.total }),
              })
            : null}
          {readiness.attachments.total
            ? infoRow(rt, {
                icon: 'file',
                label: tr('common.attachments'),
                value: tr('utilities.savedCount', {
                  cached: readiness.attachments.cached,
                  total: readiness.attachments.total,
                }),
              })
            : null}
          {media.running ? (
            <Text>
              {tr('statusRows.savingOfflineDoneTotal', {
                done: media.progress?.done ?? media.cached,
                total: media.total,
              })}
            </Text>
          ) : null}
          {media.progress?.failed ? (
            <Text>{tr('utilities.downloadFailures', { count: media.progress.failed })}</Text>
          ) : null}
          <Button
            label={busy ? tr('statusRows.updating') : tr('utilities.downloadMissing')}
            variant="text"
            disabled={!online || busy}
            onPress={() => void sync()}
          />
        </FieldGroup.Section>
        <FieldGroup.Section>
          <ListItem
            colors={rt.listColors}
            leading={<RowIcon name="map" />}
            supportingText={
              <Sub>
                {[
                  maps.loading
                    ? tr('common.loading')
                    : maps.error
                      ? tr('offlineMaps.couldNotReadSavedMaps')
                      : !maps.regions.length
                        ? tr('offlineMaps.noMapsDownloadedYet')
                        : tr('utilities.savedCount', {
                            cached: maps.regions.filter((r) => r.status.state === 'complete' && !r.error).length,
                            total: maps.regions.length,
                          }),
                  maps.regions.some((r) => r.error) ? tr('offlineMaps.downloadInterruptedTryAgain') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Sub>
            }
            onPress={() => router.push({ pathname: '/offline-maps/[collectionId]', params: { collectionId } })}>
            {tr('common.offlineMaps')}
          </ListItem>
        </FieldGroup.Section>
        {pending ? (
          <FieldGroup.Section title={tr('utilities.pendingEdits')}>
            <Text>{tr('outbox.waiting', { count: pending })}</Text>
          </FieldGroup.Section>
        ) : null}
      </FieldGroup>
    </Host>
  );
}
