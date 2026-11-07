import { Platform } from 'react-native';

import { tr } from '@/i18n';
import type { Settings } from '@/settings/store';

type Option = { value: string; label: string };

/** Choices shared by the settings overview (its summaries) and the sub-screens (their pickers). Call at render time. */
export function textSizeOptions(): Option[] {
  return [
    { value: 'system', label: tr('common.system') },
    { value: 'small', label: tr('settings.small') },
    { value: 'default', label: tr('settings.default') },
    { value: 'large', label: tr('settings.large') },
    { value: 'xlarge', label: tr('settings.extraLarge') },
    { value: 'xxlarge', label: tr('settings.huge') },
  ];
}

export function languageOptions(): Option[] {
  return [
    { value: 'system', label: tr('common.system') },
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
  ];
}

export function themeOptions(): Option[] {
  return [
    { value: 'system', label: tr('common.system') },
    { value: 'light', label: tr('settings.light') },
    { value: 'dark', label: tr('settings.dark') },
  ];
}

export function mapAppOptions(): Option[] {
  return [
    { value: 'system', label: Platform.OS === 'ios' ? tr('settings.appleMapsDefault') : tr('common.system') },
    ...(Platform.OS === 'ios' ? [{ value: 'apple', label: tr('settings.appleMaps') }] : []),
    { value: 'google', label: tr('settings.googleMaps') },
    { value: 'organic', label: tr('settings.organicMaps') },
    { value: 'osmand', label: tr('settings.osmand') },
  ];
}

/** The reminder kinds in the order of a collection: before it, travel, stays, the day. */
export function reminderRows(): { kind: keyof Settings['reminderKinds']; label: string }[] {
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

export function optionLabel(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
