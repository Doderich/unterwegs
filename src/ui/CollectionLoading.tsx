import { FieldGroup, ListItem } from '@expo/ui';
import type { ReactNode } from 'react';

import { isNotFound, requestErrorText } from '@/api/errors';

import { useCollectionContext } from '@/data/CollectionContext';
import type { useCollectionView } from '@/data/queries';
import { tr } from '@/i18n';
import { GoneScreen } from './GoneScreen';
import { Host } from './Host';
import { LoadingRows } from './LoadingRows';
import { RowIcon, useRowTheme } from './rows';
import { Sub } from './Sub';
import { Text } from './Text';
import { useColors } from './theme';

type CollectionQuery = ReturnType<typeof useCollectionView>;

/**
 * While a collection or one of its items is not on screen yet: placeholders, a retry for a temporary failure,
 * or the gone page when the server says it does not exist.
 */
export function missingCollection(query: CollectionQuery, found: boolean): ReactNode {
  if (isNotFound(query.error)) return <GoneScreen kind="collection" />;
  if (query.view && !found) return <GoneScreen kind="item" />;
  return <CollectionStatus query={query} />;
}

/** A real first collection request gets placeholders; restored data renders directly in every list tab. */
export function CollectionLoading() {
  const { query } = useCollectionContext();
  return <CollectionStatus query={query} />;
}

function CollectionStatus({ query }: { query: CollectionQuery }) {
  const colors = useColors();
  const rt = useRowTheme();
  const failed = query.isError && query.fetchStatus !== 'paused' && !isNotFound(query.error);
  if (isNotFound(query.error)) return <GoneScreen kind="collection" />;
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
