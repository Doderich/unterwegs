import { router, type Href } from 'expo-router';
import { Button, FieldGroup, Icon, ListItem } from '@expo/ui';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState, type ReactElement } from 'react';
import { Alert } from 'react-native';

import { useCredentials, useSession } from '@/auth/session';
import { useUser } from '@/data/queries';
import { usePendingCount } from '@/data/useOutbox';
import { tr } from '@/i18n';
import { cacheSizeBytes, clearFileCache, formatBytes } from '@/offline/fileCache';
import { privacyPolicyUrl } from '@/legal/links';
import { settingsSchema, updateSettings, useSettings } from '@/settings/store';
import { healthReportsAvailable } from '@/telemetry/health';
import { deviceTimeZone, formatDateTime } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { useSelect } from '@/ui/Select';
import { languageOptions, mapAppOptions, optionLabel, textSizeOptions, themeOptions } from '@/screens/settings/options';
import { icons, type IconKey } from '@/ui/icons';
import { infoRow, linkRow, RowIcon, switchRow, useRowTheme, type RowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
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
  const sheet = useActionSheet(rt);
  const pendingEdits = usePendingCount();
  const activeReminders = Object.values(settings.reminderKinds).filter(Boolean).length;
  const remindersSummary = settings.reminders
    ? tr('settings.remindersActive', { count: activeReminders })
    : tr('settings.remindersOff');

  const name = [user.data?.first_name, user.data?.last_name].filter(Boolean).join(' ') || user.data?.username;

  const mapAppSelect = useSelect(rt, {
    title: tr('settings.mapApp'),
    label: tr('settings.mapApp'),
    value: settings.mapApp,
    onChange: (value) => updateSettings({ mapApp: settingsSchema.shape.mapApp.parse(value) }),
    options: mapAppOptions(),
  });

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

  /**
   * One choice in plain words. Both revoke this device's key on the server (a new sign-in makes a new one); the only
   * question is whether downloads stay, which matters when the phone is handed on.
   */
  function confirmSignOut() {
    sheet.open(
      pendingEdits > 0 ? tr('outbox.signOutPending', { count: pendingEdits }) : tr('settings.signOutConfirm'),
      [
        {
          label: tr('settings.signOutKeepDownloads'),
          hint: tr('settings.signOutKeepDownloadsHint'),
          icon: 'logout',
          onPress: () => void signOut({ revoke: true }),
        },
        {
          label: tr('settings.signOutEverything'),
          hint: tr('settings.signOutEverythingHint'),
          icon: 'delete',
          destructive: true,
          onPress: () => void signOut({ revoke: true, wipe: true }),
        },
      ],
    );
  }

  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {/* Categories with several settings open their own screen; a single setting stays right here. */}
          <FieldGroup.Section>
            {navRow(
              rt,
              'textSize',
              tr('settings.accessibility'),
              `${tr('settings.textSize')}: ${optionLabel(textSizeOptions(), settings.textSize)}`,
              '/settings/reading',
            )}
            {navRow(
              rt,
              'appearance',
              tr('settings.appearance'),
              `${optionLabel(languageOptions(), settings.language)} · ${optionLabel(themeOptions(), settings.theme)}`,
              '/settings/appearance',
            )}
            {navRow(rt, 'reminders', tr('settings.reminders'), remindersSummary, '/settings/reminders')}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('settings.maps')}>
            {mapAppSelect.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('settings.mapAppHint')}</Text>
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

          <FieldGroup.Section title={tr('settings.account')}>
            {navRow(rt, 'settings', tr('common.manageAccount'), null, '/account')}
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
            {navRow(rt, 'link', tr('common.manageIntegrations'), null, '/integrations')}
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
            {navRow(rt, 'file', tr('settings.openSourceLicenses'), null, '/licenses')}
          </FieldGroup.Section>

          <FieldGroup.Section>
            <ListItem colors={rt.listColors} leading={<RowIcon name="logout" />} onPress={confirmSignOut}>
              {tr('settings.signOut')}
            </ListItem>
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('settings.youllNeedNewQrCode')}</Text>
            </FieldGroup.SectionFooter>
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
      {mapAppSelect.sheet}
      {sheet.sheet}
    </>
  );
}

/** A row that opens another settings screen: icon, name, the current state as its second line, a chevron. */
function navRow(rt: RowTheme, icon: IconKey, label: string, summary: string | null, href: Href): ReactElement {
  return (
    <ListItem
      key={label}
      colors={rt.listColors}
      leading={<RowIcon name={icon} />}
      supportingText={summary ? <Sub>{summary}</Sub> : undefined}
      trailing={<Icon name={icons.chevron} size={16} color={rt.colors.secondary} />}
      onPress={() => router.push(href)}>
      {label}
    </ListItem>
  );
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
