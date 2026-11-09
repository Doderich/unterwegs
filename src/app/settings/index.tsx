import { router, useFocusEffect, type Href } from 'expo-router';
import { FieldGroup, Icon, ListItem } from '@expo/ui';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useCallback, useState, type ReactElement } from 'react';

import { useSession } from '@/auth/session';
import { useUser } from '@/data/queries';
import { usePendingCount } from '@/data/useOutbox';
import { tr } from '@/i18n';
import { cacheSizeBytes, formatBytes } from '@/offline/fileCache';
import { privacyPolicyUrl } from '@/legal/links';
import { settingsSchema, updateSettings, useSettings } from '@/settings/store';
import { healthReportsAvailable } from '@/telemetry/health';
import { deviceTimeZone, formatDateTime } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { useSelect } from '@/ui/Select';
import { languageOptions, mapAppOptions, optionLabel, textSizeOptions, themeOptions } from '@/screens/settings/options';
import { icons, type IconKey } from '@/ui/icons';
import { linkRow, RowIcon, switchRow, useRowTheme, type RowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function SettingsScreen() {
  const { signOut } = useSession();
  const user = useUser();
  const colors = useColors();
  const rt = useRowTheme();
  const settings = useSettings();
  const [cacheBytes, setCacheBytes] = useState(() => cacheSizeBytes());
  useFocusEffect(useCallback(() => setCacheBytes(cacheSizeBytes()), []));
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

          <FieldGroup.Section>
            {mapAppSelect.row}
            {navRow(rt, 'offline', tr('settings.offline'), formatBytes(cacheBytes), '/settings/downloads')}
            {navRow(rt, 'price', tr('utilities.title'), null, '/utilities')}
          </FieldGroup.Section>

          <FieldGroup.Section>
            {navRow(rt, 'settings', tr('common.manageAccount'), name ?? null, '/account')}
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
