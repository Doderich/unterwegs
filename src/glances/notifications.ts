import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { tr } from '@/i18n';

import { REMINDER_CHANNEL, type Reminder, type ReminderPlace } from './compute';

/*
 * Reminders are local notifications (docs/GLANCES.md). Nothing is pushed: the app schedules what the offline copy
 * says and reconciles the schedule on every recompute. Only identifiers with our prefix are touched.
 */

const PREFIX = 'glance:';

/** Foreground: still show the banner, a departure reminder matters while the app is open too. */
export function configureForegroundHandling() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android 13+ shows the permission prompt only once a channel exists. */
async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  const names = {
    collections: tr('reminders.channelCollections'),
    travel: tr('reminders.channelTravel'),
    stays: tr('reminders.channelStays'),
    visits: tr('reminders.channelVisits'),
  };
  await Promise.all(
    Object.entries(names).map(([id, name]) =>
      Notifications.setNotificationChannelAsync(id, {
        name,
        importance: id === 'travel' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
      }),
    ),
  );
}

export async function remindersPermitted(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Asks once, when the user turns reminders on. False when denied (then only the system settings can change it). */
export async function requestRemindersPermission(): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Category ids → their buttons. The button titles are set again on every sync, so they follow the language. */
const CATEGORY = { place: 'glance-place', offline: 'glance-offline' } as const;
export const ACTION = { maps: 'maps', download: 'download' } as const;

async function ensureCategories() {
  await Promise.all([
    Notifications.setNotificationCategoryAsync(CATEGORY.place, [
      { identifier: ACTION.maps, buttonTitle: tr('reminders.openInMaps'), options: { opensAppToForeground: true } },
    ]),
    Notifications.setNotificationCategoryAsync(CATEGORY.offline, [
      {
        identifier: ACTION.download,
        buttonTitle: tr('reminders.downloadNow'),
        options: { opensAppToForeground: true },
      },
    ]),
  ]);
}

/**
 * Makes the schedule match `reminders`: cancels ours that are gone or whose text changed (language, renamed
 * lodging), schedules the missing ones. A changed time is a new id, so it is cancelled and rescheduled too.
 */
export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!(await remindersPermitted())) return;
  await ensureChannels();
  await ensureCategories();
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
    n.identifier.startsWith(PREFIX),
  );
  const wanted = new Map(reminders.map((r) => [PREFIX + r.id, r]));
  const keep = new Set<string>();
  await Promise.all(
    scheduled.map((n) => {
      const r = wanted.get(n.identifier);
      if (r && n.content.title === r.title && n.content.body === r.body) {
        keep.add(n.identifier);
        return undefined;
      }
      return Notifications.cancelScheduledNotificationAsync(n.identifier);
    }),
  );
  for (const [identifier, r] of wanted) {
    if (keep.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: r.title,
        body: r.body,
        data: { path: r.path, ...(r.place && { place: r.place }) },
        ...(r.category && { categoryIdentifier: CATEGORY[r.category] }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
        channelId: REMINDER_CHANNEL[r.kind],
      },
    });
  }
}

/** Sign-out, or reminders turned off. */
export async function clearReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // Nothing scheduled, or the module is unavailable (tests, web).
  }
}

export type ReminderResponse = { path: string; action: 'open' | 'maps' | 'download'; place: ReminderPlace | null };

/** What a tap on one of our reminders asks for: open its object, open its place in maps, or download. */
export function reminderResponse(
  response: Notifications.NotificationResponse | null | undefined,
): ReminderResponse | null {
  if (!response?.notification.request.identifier.startsWith(PREFIX)) return null;
  const data = response.notification.request.content.data ?? {};
  const path = data.path;
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  const raw = data.place as Partial<ReminderPlace> | undefined;
  const place =
    raw && typeof raw.latitude === 'number' && typeof raw.longitude === 'number'
      ? { label: String(raw.label ?? ''), latitude: raw.latitude, longitude: raw.longitude }
      : null;
  const id = response.actionIdentifier;
  const action = id === ACTION.maps && place ? 'maps' : id === ACTION.download ? 'download' : 'open';
  return { path, action, place };
}
