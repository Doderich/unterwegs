import { Appearance, Platform } from 'react-native';

import TextSize from '../../modules/text-size';

import { resolveLanguage, setLanguage } from '@/i18n';

import { getSettings, subscribeSettings, type Settings, type TextSize as TextSizeSetting } from './store';

/** Android `Configuration.fontScale`; 0 = system. */
const ANDROID_FONT_SCALE: Record<TextSizeSetting, number> = {
  system: 0,
  small: 0.85,
  default: 1,
  large: 1.15,
  xlarge: 1.3,
  xxlarge: 1.6,
};

/** iOS `UIContentSizeCategory` raw values (`L` is the system default). */
const IOS_CATEGORY: Record<TextSizeSetting, string | null> = {
  system: null,
  small: 'UICTContentSizeCategoryS',
  default: 'UICTContentSizeCategoryL',
  large: 'UICTContentSizeCategoryXL',
  xlarge: 'UICTContentSizeCategoryXXXL',
  xxlarge: 'UICTContentSizeCategoryAccessibilityL',
};

/** Body-text ratio of each iOS category to the default (17 pt). */
const IOS_SCALE: Record<TextSizeSetting, number> = {
  system: 1,
  small: 15 / 17,
  default: 1,
  large: 19 / 17,
  xlarge: 23 / 17,
  xxlarge: 28 / 17,
};

/**
 * Multiplier for React Native `<Text>` (native lists scale themselves), or null to keep the system's
 * font scaling. Use with `allowFontScaling={false}`.
 */
export function rnTextScale(size: TextSizeSetting): number | null {
  if (size === 'system') return null;
  return Platform.OS === 'ios' ? IOS_SCALE[size] : ANDROID_FONT_SCALE[size];
}

/** Material toolbar title (sp). */
const ANDROID_HEADER_TITLE_SIZE = 20;

/**
 * Font size for the native Android stack header title, or null to leave it alone. The header ignores the
 * app's font-scale override and still multiplies by the device's scale, so that is divided out.
 */
export function androidHeaderTitleSize(size: TextSizeSetting): number | null {
  if (Platform.OS !== 'android' || size === 'system') return null;
  const systemScale = TextSize?.systemFontScale?.() || 1;
  return Math.round((ANDROID_HEADER_TITLE_SIZE * ANDROID_FONT_SCALE[size]) / systemScale);
}

function apply(s: Settings, prev?: Settings) {
  setLanguage(resolveLanguage(s.language));
  if (s.theme !== prev?.theme) Appearance.setColorScheme(s.theme === 'system' ? 'unspecified' : s.theme);
  if (s.textSize !== prev?.textSize || s.boldText !== prev?.boldText) {
    const size = Platform.OS === 'ios' ? IOS_CATEGORY[s.textSize] : ANDROID_FONT_SCALE[s.textSize];
    void TextSize?.apply(size, s.boldText);
  }
}

let applied = getSettings();
apply(applied);
subscribeSettings((s) => {
  apply(s, applied);
  applied = s;
});

/**
 * Changes that only show up in freshly created views: translated strings (memoized per component) and,
 * on Android, the font scale (read by Compose when a view is created; a theme switch resets it).
 */
export function remountKey(s: Settings): string {
  const parts: (string | boolean)[] = [resolveLanguage(s.language), s.textSize, s.boldText];
  if (Platform.OS === 'android' && (s.textSize !== 'system' || s.boldText)) parts.push(s.theme);
  return parts.join('|');
}
