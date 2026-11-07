import { tr } from '@/i18n';
import { haptics } from '@/settings/haptics';
import { Icon, ListItem, Switch } from '@expo/ui';
import { Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import type { Attachment } from '@/api/schemas';
import { useCredentials } from '@/auth/session';
import { download } from '@/offline/fileCache';

import { bookingListUrl } from './bookingLinks';
import { formatUpdatedAt } from './format';
import { openInMaps } from './mapLinks';

import { icons, type IconKey } from './icons';
import { isWebLink } from './links';
import { parseMarkdown } from './markdown';
import { MarkdownText } from './MarkdownText';
import { Sub } from './Sub';
import { useColors, useListColors, type Colors } from './theme';

export { openInMaps } from './mapLinks';

/*
 * Row builders return `<ListItem>` elements directly (not wrapper components): Android's FieldGroup only
 * styles a row as a rounded Material list item when the child *is* a ListItem; a wrapper component gets
 * nested in a second surface (white square inside the card).
 */

export type RowTheme = { colors: Colors; listColors: ReturnType<typeof useListColors> };

export function useRowTheme(): RowTheme {
  const colors = useColors();
  const listColors = useListColors();
  return useMemo(() => ({ colors, listColors }), [colors, listColors]);
}

/** Every leading icon sits in the same slot, so row text starts on one line however wide the symbol is. */
export const ROW_ICON_SLOT = 28;

/** Leading icon for list rows, tinted with the app accent. */
export function RowIcon({ name, color }: { name: IconKey; color?: string }) {
  const colors = useColors();
  return <Icon name={icons[name]} size={22} color={color ?? colors.tint} style={{ width: ROW_ICON_SLOT }} />;
}

const trailingIcon = (name: IconKey, color: string, size = 16) => <Icon name={icons[name]} size={size} color={color} />;

/** The top-of-screen offline line: reassurance first ("everything saved is here"), then how fresh it is. */
export function offlineNoticeRow(t: RowTheme, updatedAt: number, key = 'offline-notice'): ReactElement {
  return (
    <ListItem
      key={key}
      colors={t.listColors}
      leading={<RowIcon name="offline" />}
      supportingText={<Sub>{tr('statusRows.updatedTime', { time: formatUpdatedAt(updatedAt) })}</Sub>}>
      {tr('common.offlineAllSaved')}
    </ListItem>
  );
}

/** Label below, value as headline. Tappable when `onPress` is set. */
export function infoRow(
  t: RowTheme,
  {
    key,
    icon,
    label,
    value,
    onPress,
  }: { key?: string; icon?: IconKey; label: string; value: string; onPress?: () => void },
): ReactElement {
  return (
    <ListItem
      key={key}
      colors={t.listColors}
      leading={icon ? <RowIcon name={icon} /> : undefined}
      supportingText={<Sub>{label}</Sub>}
      onPress={onPress}>
      {value}
    </ListItem>
  );
}

/** Clipboard copy with haptic + "Kopiert" feedback on the row that was tapped. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    haptics.success();
    setCopied(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

/** Tap to copy (booking numbers, codes). */
export function copyRow(
  t: RowTheme,
  c: ReturnType<typeof useCopy>,
  { key, icon = 'key', label, value }: { key?: string; icon?: IconKey; label: string; value: string },
): ReactElement {
  return (
    <ListItem
      key={key}
      colors={t.listColors}
      leading={<RowIcon name={icon} />}
      supportingText={<Sub>{c.copied === value ? tr('rows.copied') : label}</Sub>}
      trailing={trailingIcon('copy', t.colors.secondary)}
      onPress={() => void c.copy(value)}>
      {value}
    </ListItem>
  );
}

/**
 * Hands the link to the OS so a verified app link / universal link opens the installed app
 * (Booking.com, Airbnb, DB Navigator, …); otherwise it opens in the default browser. Links come from server
 * data that collaborators can edit, so only web links open: no `tel:`, `intent:` or other app schemes.
 */
export function openUrl(url: string) {
  const link = url.trim();
  if (!isWebLink(link)) return;
  void Linking.openURL(link).catch(() => WebBrowser.openBrowserAsync(link));
}

export function linkRow(
  t: RowTheme,
  { key, label, url, icon = 'link' }: { key?: string; label: string; url: string; icon?: IconKey },
): ReactElement {
  return (
    <ListItem
      key={key}
      colors={t.listColors}
      leading={<RowIcon name={icon} />}
      supportingText={<Sub>{url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0]}</Sub>}
      trailing={trailingIcon('external', t.colors.secondary)}
      onPress={() => openUrl(url)}>
      {label}
    </ListItem>
  );
}

/** Original link plus an explicit general bookings shortcut for secure confirmation pages. */
export function linkRows(
  t: RowTheme,
  options: { key?: string; label: string; url: string; icon?: IconKey },
): ReactElement[] {
  const bookings = bookingListUrl(options.url);
  return [
    linkRow(t, { ...options, key: options.key ?? 'website' }),
    ...(bookings
      ? [
          <ListItem
            key={`${options.key ?? 'website'}-bookings`}
            colors={t.listColors}
            leading={<RowIcon name="link" />}
            supportingText={<Sub>{tr('rows.allBookingsNotSpecificReservation')}</Sub>}
            trailing={trailingIcon('external', t.colors.secondary)}
            onPress={() => openUrl(bookings)}>
            {tr('rows.openBookingComBookings')}
          </ListItem>,
        ]
      : []),
  ];
}

export function mapsRow(
  t: RowTheme,
  {
    key,
    label,
    address,
    latitude,
    longitude,
  }: {
    key?: string;
    label: string;
    address: string | null | undefined;
    latitude?: number | null;
    longitude?: number | null;
  },
): ReactElement {
  return (
    <ListItem
      key={key}
      colors={t.listColors}
      leading={<RowIcon name="pin" />}
      supportingText={<Sub>{tr('common.openInMaps')}</Sub>}
      trailing={trailingIcon('external', t.colors.secondary)}
      onPress={() => openInMaps(address || label, latitude, longitude)}>
      {address || label}
    </ListItem>
  );
}

/** Description as native rows: text paragraphs + link rows. Returns an array so FieldGroup sees each row. */
export function markdownRows(
  t: RowTheme,
  source: string | null | undefined,
  keyPrefix: string,
  reading = false,
): ReactElement[] {
  return parseMarkdown(source).flatMap((block, i) =>
    block.type === 'text' ? (
      <MarkdownText
        key={`${keyPrefix}-${i}`}
        lines={block.lines}
        color={t.colors.text}
        tint={t.colors.tint}
        reading={reading}
      />
    ) : (
      linkRows(t, { key: `${keyPrefix}-${i}`, label: block.label, url: block.url })
    ),
  );
}

/** Downloads (or reuses the offline copy) and opens the system viewer: Quick Look on iOS, an app on Android. */
export function useOpenAttachment() {
  const credentials = useCredentials();
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = async (attachment: Attachment) => {
    if (!credentials) return;
    setBusyId(attachment.id);
    try {
      // A file attached offline is still only on the phone: `download` opens it from there.
      const file: File = await download(attachment.file, credentials);
      const title = attachment.name || tr('common.attachment');
      try {
        await file.preview({ title });
      } catch {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { dialogTitle: title, mimeType: file.type || undefined });
        }
      }
    } catch {
      Alert.alert(tr('rows.attachmentNotAvailable'), tr('rows.itIsntSavedOfflineYet'));
    } finally {
      setBusyId(null);
    }
  };
  return { open, busyId };
}

export function attachmentRows(t: RowTheme, attachments: Attachment[], opener: ReturnType<typeof useOpenAttachment>) {
  return attachments.map((attachment) => {
    const ext = (attachment.extension || attachment.file.split('.').pop() || '').toLowerCase();
    return (
      <ListItem
        key={attachment.id}
        colors={t.listColors}
        leading={<RowIcon name={ext === 'pdf' ? 'pdf' : 'file'} />}
        supportingText={
          <Sub>{opener.busyId === attachment.id ? tr('rows.opening') : ext.toUpperCase() || tr('rows.file')}</Sub>
        }
        onPress={() => void opener.open(attachment)}>
        {attachment.name || attachment.file.split('/').pop() || tr('common.attachment')}
      </ListItem>
    );
  });
}

/**
 * iOS: native labelled toggle row. Android: rounded list row with a display-only switch, so a tap anywhere
 * (including on the switch) toggles exactly once.
 */
export function switchRow(
  t: RowTheme,
  { label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void },
): ReactElement {
  if (Platform.OS === 'ios') {
    return <Switch key={label} label={label} value={value} onValueChange={onChange} />;
  }
  return (
    <ListItem
      key={label}
      colors={t.listColors}
      supportingText={hint ? <Sub>{hint}</Sub> : undefined}
      trailing={<ComposeSwitch value={value} />}
      onPress={() => onChange(!value)}>
      {label}
    </ListItem>
  );
}
