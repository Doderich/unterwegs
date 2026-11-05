import { FieldGroup, ListItem } from '@expo/ui';

import { requestErrorText } from '@/api/errors';

import { useCollectionContext } from '@/data/CollectionContext';
import { tr } from '@/i18n';
import { Host } from './Host';
import { LoadingRows } from './LoadingRows';
import { RowIcon, useRowTheme } from './rows';
import { Sub } from './Sub';
import { Text } from './Text';
import { useColors } from './theme';

/** A real first collection request gets placeholders; restored data renders directly in every list tab. */
export function CollectionLoading() {
  const { query } = useCollectionContext();
  const colors = useColors();
  const rt = useRowTheme();
  const failed = query.isError && query.fetchStatus !== 'paused';
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section>
          {query.isPending && query.isFetching ? (
            <LoadingRows />
          ) : failed ? (
            // What went wrong (unsupported server, server error, …) and a way to try again without leaving.
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="refresh" />}
              supportingText={<Sub>{requestErrorText(query.error)}</Sub>}
              onPress={() => void query.refetch()}>
              {tr('common.couldntLoadTrip')}
            </ListItem>
          ) : (
            <Text textStyle={{ color: colors.secondary }}>
              {query.fetchStatus === 'paused' ? tr('common.offlineNoData') : tr('common.couldntLoadTrip')}
            </Text>
          )}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
