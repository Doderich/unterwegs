import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';

import { requestErrorText } from '@/api/errors';

import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';

import { usePendingCount } from '@/data/useOutbox';

import { CompatNotice } from './CompatNotice';
import { formatUpdatedAt } from './format';
import { useRowTheme, RowIcon } from './rows';
import { Sub } from './Sub';

/** Footer section: data freshness, offline state, offline-download progress and a manual sync button. */
export function useStatusRows({ offline }: { offline: boolean }) {
  const { query, offline: media } = useCollectionContext();
  const rt = useRowTheme();
  const stand = tr('statusRows.updatedTime', { time: formatUpdatedAt(query.dataUpdatedAt) });
  const mediaLine = media.running
    ? tr('statusRows.savingOfflineDoneTotal', { done: media.progress?.done ?? media.cached, total: media.total })
    : media.total === 0
      ? null
      : media.cached >= media.total
        ? tr('statusRows.imagesPdfsAvailableOfflineTotal', { total: media.total })
        : tr('statusRows.cachedOfTotalImagesPdfs', { cached: media.cached, total: media.total });

  const pending = usePendingCount(query.data?.id);
  const pendingLine = pending > 0 ? tr('outbox.waiting', { count: pending }) : null;
  const busy = query.isFetching || media.running;
  // The last refresh failed while saved data is shown: say why, the saved trip stays readable.
  const refreshError = !offline && !busy && query.isError ? requestErrorText(query.error) : null;
  return (
    <>
      <CompatNotice />
      <FieldGroup.Section>
        <ListItem
          colors={rt.listColors}
          leading={<RowIcon name={offline ? 'offline' : 'refresh'} />}
          supportingText={
            <Sub>
              {[offline ? tr('statusRows.offlineStand', { stand }) : stand, pendingLine, refreshError]
                .filter(Boolean)
                .join('\n')}
            </Sub>
          }
          onPress={
            !offline && !busy
              ? async () => {
                  await query.refetch();
                  await media.sync();
                }
              : undefined
          }>
          {offline ? tr('statusRows.offline') : busy ? tr('statusRows.updating') : tr('statusRows.updateNow')}
        </ListItem>
        <ListItem
          colors={rt.listColors}
          leading={<RowIcon name="offline" />}
          supportingText={mediaLine ? <Sub>{mediaLine}</Sub> : undefined}
          onPress={() =>
            router.push({ pathname: '/offline-readiness/[collectionId]', params: { collectionId: query.data!.id } })
          }>
          {tr('utilities.readiness')}
        </ListItem>
      </FieldGroup.Section>
    </>
  );
}
