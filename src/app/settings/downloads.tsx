import { Button, FieldGroup } from '@expo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

import { tr } from '@/i18n';
import { cacheSizeBytes, clearFileCache, formatBytes } from '@/offline/fileCache';
import { Host } from '@/ui/Host';
import { infoRow, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { typeScale } from '@/ui/typeScale';

/** Download management is separate from everyday preferences. */
export default function DownloadsSettingsScreen() {
  const rt = useRowTheme();
  const queryClient = useQueryClient();
  const [cacheBytes, setCacheBytes] = useState(() => cacheSizeBytes());
  const clear = () =>
    Alert.alert(tr('settings.deleteOfflineDataConfirm'), tr('settings.imagesPdfsDownloadedAgainNext'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: () => {
          clearFileCache();
          void queryClient.invalidateQueries();
          setCacheBytes(cacheSizeBytes());
        },
      },
    ]);
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section>
          {infoRow(rt, { icon: 'offline', label: tr('settings.savedImagesPdfs'), value: formatBytes(cacheBytes) })}
          <Button label={tr('settings.deleteOfflineData')} variant="text" onPress={clear} />
          <FieldGroup.SectionFooter>
            <Text textStyle={{ ...typeScale.supporting, color: rt.colors.secondary }}>
              {tr('settings.tripYouOpenSavedFor')}
            </Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
