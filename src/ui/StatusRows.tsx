import { FieldGroup, ListItem } from '@expo/ui';

import { requestErrorText } from '@/api/errors';

import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';

import { CompatNotice } from './CompatNotice';
import { useRowTheme, RowIcon } from './rows';
import { Sub } from './Sub';

function formatStand(ms: number): string {
  if (!ms) return tr('statusRows.never');
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}., ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Footer section: data freshness, offline state, offline-download progress and a manual sync button. */
export function useStatusRows({ offline }: { offline: boolean }) {
  const { query, offline: media } = useCollectionContext();
  const rt = useRowTheme();
  const stand = tr('statusRows.updatedTime', { time: formatStand(query.dataUpdatedAt) });
  const mediaLine = media.running
    ? tr('statusRows.savingOfflineDoneTotal', { done: media.progress?.done ?? media.cached, total: media.total })
    : media.total === 0
      ? null
      : media.cached >= media.total
        ? tr('statusRows.imagesPdfsAvailableOfflineTotal', { total: media.total })
        : tr('statusRows.cachedOfTotalImagesPdfs', { cached: media.cached, total: media.total });

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
              {[offline ? tr('statusRows.offlineStand', { stand }) : stand, refreshError, mediaLine]
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
      </FieldGroup.Section>
    </>
  );
}
