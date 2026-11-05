import { FieldGroup, ListItem } from '@expo/ui';
import * as Clipboard from 'expo-clipboard';
import { useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import { compatIssues, compatReport, subscribeCompatIssues, TESTED_SERVER_VERSION } from '@/api/compat';
import { tr } from '@/i18n';

import { RowIcon, useRowTheme } from './rows';
import { Sub } from './Sub';

export function useCompatIssues() {
  return useSyncExternalStore(subscribeCompatIssues, compatIssues);
}

/**
 * Shown when this server sent data the app couldn't (fully) read: what's missing, that the rest stays usable, and a
 * way to copy the details for a bug report. Nothing while everything fits.
 */
export function CompatNotice() {
  const issues = useCompatIssues();
  const rt = useRowTheme();
  if (!issues.length) return null;
  const skipped = issues.filter((i) => i.kind === 'skipped').reduce((n, i) => n + i.count, 0);
  const unreadable = issues.some((i) => i.kind === 'unreadable');
  const lines = [
    skipped ? tr('compat.entriesSkipped', { count: skipped }) : null,
    unreadable ? tr('compat.someDataUnreadable') : null,
    tr('compat.newerServerHint', { version: TESTED_SERVER_VERSION }),
  ].filter(Boolean);
  const details = () =>
    Alert.alert(tr('compat.title'), compatReport(), [
      { text: tr('compat.copyDetails'), onPress: () => void Clipboard.setStringAsync(compatReport()) },
      { text: tr('common.done'), style: 'cancel' },
    ]);
  return (
    <FieldGroup.Section>
      <ListItem
        colors={rt.listColors}
        leading={<RowIcon name="warning" />}
        supportingText={<Sub>{lines.join('\n')}</Sub>}
        onPress={details}>
        {tr('compat.title')}
      </ListItem>
    </FieldGroup.Section>
  );
}
