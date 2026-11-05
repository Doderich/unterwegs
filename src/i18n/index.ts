import { createInstance } from 'i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

/*
 * UI text is looked up by key: `tr('settings.signOut')`. Keys are English, grouped by the screen or module that
 * uses them (`common` when several do); every language has its full text in `locales/` (one JSON file each,
 * loaded by i18next), and a missing entry falls back to English. Placeholders use single braces:
 * `tr('dayEdit.editDayN', { n })`. Counts use i18next plurals: pass `count` and the file has `_one` / `_other`
 * variants (`tr('staySummary.nights', { count: 3 })`). The language is module state, so plain helpers (row
 * builders, formatters) can translate too; the root navigator remounts when it changes.
 */

export type Language = 'de' | 'en' | 'ja';

const i18n = createInstance();
void i18n.init({
  resources: { de: { translation: de }, en: { translation: en }, ja: { translation: ja } },
  lng: 'de',
  fallbackLng: 'en',
  // Synchronous: resources are bundled, and `tr()` runs during the first render.
  initAsync: false,
  // Keys are nested by screen (`settings.signOut`); there is one namespace.
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { prefix: '{', suffix: '}', escapeValue: false },
});

let language: Language = 'de';

export function setLanguage(next: Language) {
  language = next;
  void i18n.changeLanguage(next);
}

export function getLanguage(): Language {
  return language;
}

/** `system` → German on German phones, Japanese on Japanese ones, English everywhere else. */
export function resolveLanguage(setting: 'system' | Language, deviceLocale = deviceLanguageTag()): Language {
  if (setting !== 'system') return setting;
  const tag = deviceLocale.toLowerCase();
  return tag.startsWith('de') ? 'de' : tag.startsWith('ja') ? 'ja' : 'en';
}

function deviceLanguageTag(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? 'de';
  } catch {
    return 'de';
  }
}

/** BCP 47 tag for `Intl` formatting. */
export function locale(): string {
  return language === 'de' ? 'de-DE' : language === 'ja' ? 'ja-JP' : 'en-GB';
}

/** The text for `key` in the current language; `count` picks the plural form. */
export function tr(key: string, vars?: Record<string, string | number>): string {
  return i18n.t(key, vars);
}
