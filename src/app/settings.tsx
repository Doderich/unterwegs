import { router } from 'expo-router';
import { Button, FieldGroup, ListItem } from '@expo/ui';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useCredentials, useSession } from '@/auth/session';
import { useUser } from '@/data/queries';
import { requestRemindersPermission } from '@/glances/notifications';
import { tr } from '@/i18n';
import { cacheSizeBytes, clearFileCache, formatBytes } from '@/offline/fileCache';
import { privacyPolicyUrl } from '@/legal/links';
import { settingsSchema, updateSettings, useSettings, type Settings } from '@/settings/store';
import { healthReportsAvailable } from '@/telemetry/health';
import { deviceTimeZone, formatDateTime } from '@/time/tz';
import { useSelect } from '@/ui/Select';
import { infoRow, linkRow, RowIcon, switchRow, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function SettingsScreen() {
  const { signOut } = useSession();
  const credentials = useCredentials();
  const user = useUser();
  const queryClient = useQueryClient();
  const colors = useColors();
  const rt = useRowTheme();
  const settings = useSettings();
  const [cacheBytes, setCacheBytes] = useState(() => cacheSizeBytes());

  const name = [user.data?.first_name, user.data?.last_name].filter(Boolean).join(' ') || user.data?.username;

  const languageSelect = useSelect(rt, {
    title: tr('settings.language'),
    label: tr('settings.language'),
    value: settings.language,
    onChange: (v) => updateSettings({ language: v as Settings['language'] }),
    options: [
      { value: 'system', label: tr('common.system') },
      { value: 'de', label: 'Deutsch' },
      { value: 'en', label: 'English' },
      { value: 'ja', label: '日本語' },
    ],
  });
  const themeSelect = useSelect(rt, {
    title: tr('settings.theme'),
    label: tr('settings.theme'),
    value: settings.theme,
    onChange: (v) => updateSettings({ theme: v as Settings['theme'] }),
    options: [
      { value: 'system', label: tr('common.system') },
      { value: 'light', label: tr('settings.light') },
      { value: 'dark', label: tr('settings.dark') },
    ],
  });
  const textSizeSelect = useSelect(rt, {
    title: tr('settings.textSize'),
    label: tr('settings.textSize'),
    value: settings.textSize,
    onChange: (v) => updateSettings({ textSize: v as Settings['textSize'] }),
    options: [
      { value: 'system', label: tr('common.system') },
      { value: 'small', label: tr('settings.small') },
      { value: 'default', label: tr('settings.default') },
      { value: 'large', label: tr('settings.large') },
      { value: 'xlarge', label: tr('settings.extraLarge') },
      { value: 'xxlarge', label: tr('settings.huge') },
    ],
  });
  const mapAppSelect = useSelect(rt, {
    title: tr('settings.mapApp'),
    label: tr('settings.mapApp'),
    value: settings.mapApp,
    onChange: (value) => updateSettings({ mapApp: settingsSchema.shape.mapApp.parse(value) }),
    options: [
      { value: 'system', label: Platform.OS === 'ios' ? tr('settings.appleMapsDefault') : tr('common.system') },
      ...(Platform.OS === 'ios' ? [{ value: 'apple', label: tr('settings.appleMaps') }] : []),
      { value: 'google', label: tr('settings.googleMaps') },
      { value: 'organic', label: tr('settings.organicMaps') },
      { value: 'osmand', label: tr('settings.osmand') },
    ],
  });

  /** Turning reminders on asks for the permission; when the system refuses, its settings are the only way. */
  async function toggleReminders(on: boolean) {
    if (!on) return updateSettings({ reminders: false });
    if (await requestRemindersPermission()) return updateSettings({ reminders: true });
    Alert.alert(tr('settings.remindersDenied'), tr('settings.remindersDeniedHint'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('settings.openSystemSettings'), onPress: () => void Linking.openSettings() },
    ]);
  }

  function confirmClearCache() {
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
  }

  function confirmSignOut() {
    Alert.alert(tr('settings.signOutConfirm'), tr('settings.youllNeedNewQrCode'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('settings.signOutOnDeviceOnly'), onPress: () => askKeepDownloads(false) },
      { text: tr('settings.signOutDeleteKey'), style: 'destructive', onPress: () => askKeepDownloads(true) },
    ]);
  }

  /** Downloads are only useful for the same server again; on a shared or handed-on phone they should go. */
  function askKeepDownloads(revoke: boolean) {
    Alert.alert(tr('settings.keepDownloadsConfirm'), tr('settings.keepDownloadsExplanation'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('settings.keepDownloads'), onPress: () => void signOut({ revoke }) },
      {
        text: tr('settings.deleteDownloads'),
        style: 'destructive',
        onPress: () => void signOut({ revoke, wipe: true }),
      },
    ]);
  }

  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('settings.account')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="settings" />}
              onPress={() => router.push('/account')}>
              {tr('common.manageAccount')}
            </ListItem>
            {infoRow(rt, {
              icon: 'settings',
              label: tr('settings.signedInAs'),
              value: name ?? (user.isPending ? '…' : tr('settings.unknown')),
            })}
            {infoRow(rt, {
              icon: 'link',
              label: tr('common.server'),
              value: credentials?.serverUrl.replace(/^https?:\/\//, '') ?? '–',
            })}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.integrations')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="link" />}
              onPress={() => router.push('/integrations')}>
              {tr('common.manageIntegrations')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.appearance')}>
            {languageSelect.row}
            {themeSelect.row}
            {Platform.OS === 'ios'
              ? switchRow(rt, {
                  label: tr('settings.showTabLabels'),
                  hint: tr('settings.showTabLabelsHint'),
                  value: settings.showTabLabels,
                  onChange: (showTabLabels) => updateSettings({ showTabLabels }),
                })
              : null}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.maps')}>
            {mapAppSelect.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('settings.mapAppHint')}</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.reminders')}>
            {switchRow(rt, {
              label: tr('settings.remindersOn'),
              value: settings.reminders,
              onChange: (on) => void toggleReminders(on),
            })}
            {settings.reminders
              ? reminderRows().map(({ kind, label }) =>
                  switchRow(rt, {
                    label,
                    value: settings.reminderKinds[kind],
                    onChange: (value) =>
                      updateSettings({ reminderKinds: { ...settings.reminderKinds, [kind]: value } }),
                  }),
                )
              : null}
            {Platform.OS === 'ios'
              ? switchRow(rt, {
                  label: tr('settings.travelActivity'),
                  hint: tr('settings.travelActivityHint'),
                  value: settings.travelActivity,
                  onChange: (travelActivity) => updateSettings({ travelActivity }),
                })
              : null}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('settings.remindersHint')}</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.accessibility')}>
            {textSizeSelect.row}
            {switchRow(rt, {
              label: tr('settings.boldText'),
              value: settings.boldText,
              onChange: (boldText) => updateSettings({ boldText }),
            })}
            {switchRow(rt, {
              label: tr('settings.increaseContrast'),
              value: settings.highContrast,
              onChange: (highContrast) => updateSettings({ highContrast }),
            })}
            {switchRow(rt, {
              label: tr('settings.reduceMotion'),
              hint: tr('settings.noTransitionsOrFades'),
              value: settings.reduceMotion,
              onChange: (reduceMotion) => updateSettings({ reduceMotion }),
            })}
            {switchRow(rt, {
              label: tr('settings.hapticFeedback'),
              value: settings.haptics,
              onChange: (haptics) => updateSettings({ haptics }),
            })}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                {tr('settings.systemUsesPhonesSettings')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.offline')}>
            {infoRow(rt, {
              icon: 'offline',
              label: tr('settings.savedImagesPdfs'),
              value: formatBytes(cacheBytes),
            })}
            <Button label={tr('settings.deleteOfflineData')} variant="text" onPress={confirmClearCache} />
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('settings.tripYouOpenSavedFor')}</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.privacy')}>
            {healthReportsAvailable
              ? switchRow(rt, {
                  label: tr('settings.healthReports'),
                  hint: tr('settings.healthReportsHint'),
                  value: settings.healthReports,
                  onChange: (healthReports) => updateSettings({ healthReports }),
                })
              : null}
            {linkRow(rt, { icon: 'file', label: tr('settings.privacyPolicy'), url: privacyPolicyUrl() })}
            <ListItem colors={rt.listColors} leading={<RowIcon name="file" />} onPress={() => router.push('/licenses')}>
              {tr('settings.openSourceLicenses')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section>
            <Button label={tr('settings.signOut')} variant="text" onPress={confirmSignOut} />
          </FieldGroup.Section>

          <FieldGroup.Section>
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary, textAlign: 'center' }}>
                {appVersionLabel()}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {languageSelect.sheet}
      {themeSelect.sheet}
      {textSizeSelect.sheet}
      {mapAppSelect.sheet}
    </>
  );
}

/** The reminder kinds in the order of a collection: before it, travel, stays, the day. */
function reminderRows(): { kind: keyof Settings['reminderKinds']; label: string }[] {
  return [
    { kind: 'collectionStart', label: tr('settings.reminderCollectionStart') },
    { kind: 'offlineReadiness', label: tr('settings.reminderOfflineReadiness') },
    { kind: 'departure', label: tr('settings.reminderDeparture') },
    { kind: 'checkIn', label: tr('settings.reminderCheckIn') },
    { kind: 'checkOut', label: tr('settings.reminderCheckOut') },
    { kind: 'visit', label: tr('settings.reminderVisit') },
    { kind: 'endOfDay', label: tr('settings.reminderEndOfDay') },
  ];
}

/** `Unterwegs 1.0.0`, plus the over-the-air update's date while one is running instead of the built-in code. */
function appVersionLabel(): string {
  const base = `Unterwegs ${Constants.expoConfig?.version ?? ''}`;
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return base;
  return tr('settings.baseUpdateOfDate', {
    base,
    date: formatDateTime(Updates.createdAt.toISOString(), deviceTimeZone()),
  });
}
