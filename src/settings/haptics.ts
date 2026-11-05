import * as Haptics from 'expo-haptics';

import { getSettings } from './store';

/** Haptic feedback, unless switched off in the settings. */
export const haptics = {
  success() {
    if (getSettings().haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error() {
    if (getSettings().haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  selection() {
    if (getSettings().haptics) void Haptics.selectionAsync();
  },
};
