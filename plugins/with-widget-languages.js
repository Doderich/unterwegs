const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

/*
 * Widget names and descriptions in the system's language (docs/GLANCES.md). `expo-widgets` takes one string per
 * widget; `app.json` holds the English one, which is also what other languages fall back to, like the app. This
 * plugin adds German and Japanese from `widget-languages.json`, keyed by that English text:
 * - iOS: `Localizable.strings` per language in the widget extension. SwiftUI and App Intents look the generated
 *   string literals up there.
 * - Android: `values-de` / `values-ja` copies of the widget string resources.
 * List it before `expo-widgets` in `app.json`: mods run in reverse order, so it then runs after the widget target
 * and its files exist.
 */

const TARGET = 'ExpoWidgetsTarget';
const LANGUAGES = require('./widget-languages.json');

function widgetOptions(config) {
  const entry = (config.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-widgets');
  if (!entry) throw new Error('with-widget-languages: expo-widgets is not configured');
  return entry[1] ?? {};
}

/** Every user-visible string the widget plugin generates, in English. */
function englishStrings(options) {
  const out = new Set();
  for (const w of options.widgets ?? []) {
    out.add(w.displayName);
    out.add(w.description);
    const c = w.ios?.configuration;
    if (c) {
      out.add(`${c.title ?? w.displayName} Configuration`);
      out.add(c.description);
      for (const p of Object.values(c.parameters ?? {})) out.add(p.title);
    }
  }
  return [...out].filter(Boolean);
}

/** Fails the build when a widget string has no German or Japanese text, so nothing ships half translated. */
function assertTranslated(strings) {
  for (const lang of ['de', 'ja']) {
    const missing = strings.filter((s) => !(s in LANGUAGES[lang]));
    if (missing.length) throw new Error(`with-widget-languages: no ${lang} text for ${JSON.stringify(missing)}`);
  }
}

const escape = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'").replace(/"/g, '\\"');

/** Same rule as expo-widgets' `toAndroidResourceName`. */
function resourceName(name) {
  const r = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return /^[a-z]/.test(r) ? r : `widget_${r}`;
}

function withIosStrings(config, strings) {
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, TARGET);
      for (const lang of ['en', 'de', 'ja']) {
        const table = LANGUAGES[lang] ?? {};
        const lines = strings.map((s) => `"${escape(s)}" = "${escape(table[s] ?? s)}";`);
        fs.mkdirSync(path.join(dir, `${lang}.lproj`), { recursive: true });
        fs.writeFileSync(path.join(dir, `${lang}.lproj`, 'Localizable.strings'), lines.join('\n') + '\n');
      }
      return mod;
    },
  ]);
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const objects = project.hash.project.objects;
    const targetEntry = Object.entries(objects.PBXNativeTarget).find(
      ([key, t]) => !key.endsWith('_comment') && t.name === TARGET,
    );
    if (!targetEntry) throw new Error(`with-widget-languages: target ${TARGET} not found`);
    const [targetKey, target] = targetEntry;
    const groupEntry = Object.entries(objects.PBXGroup).find(
      ([key, g]) => !key.endsWith('_comment') && g.path === TARGET,
    );
    if (!groupEntry) throw new Error(`with-widget-languages: group ${TARGET} not found`);
    const [, group] = groupEntry;

    objects.PBXVariantGroup = objects.PBXVariantGroup ?? {};
    const existing = group.children.find((c) => c.comment === 'Localizable.strings');
    if (existing) return mod;

    const variantKey = project.generateUuid();
    const refs = ['en', 'de', 'ja'].map((lang) => {
      const key = project.generateUuid();
      objects.PBXFileReference[key] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'text.plist.strings',
        name: lang,
        path: `${lang}.lproj/Localizable.strings`,
        sourceTree: '"<group>"',
      };
      objects.PBXFileReference[`${key}_comment`] = lang;
      return { value: key, comment: lang };
    });
    objects.PBXVariantGroup[variantKey] = {
      isa: 'PBXVariantGroup',
      children: refs,
      name: 'Localizable.strings',
      sourceTree: '"<group>"',
    };
    objects.PBXVariantGroup[`${variantKey}_comment`] = 'Localizable.strings';
    group.children.push({ value: variantKey, comment: 'Localizable.strings' });

    const buildFileKey = project.generateUuid();
    objects.PBXBuildFile[buildFileKey] = {
      isa: 'PBXBuildFile',
      fileRef: variantKey,
      fileRef_comment: 'Localizable.strings',
    };
    objects.PBXBuildFile[`${buildFileKey}_comment`] = 'Localizable.strings in Resources';

    // The widget target has no Resources phase of its own.
    let phaseKey = target.buildPhases.find((p) => objects.PBXResourcesBuildPhase?.[p.value])?.value;
    if (!phaseKey) {
      phaseKey = project.generateUuid();
      objects.PBXResourcesBuildPhase = objects.PBXResourcesBuildPhase ?? {};
      objects.PBXResourcesBuildPhase[phaseKey] = {
        isa: 'PBXResourcesBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        runOnlyForDeploymentPostprocessing: 0,
      };
      objects.PBXResourcesBuildPhase[`${phaseKey}_comment`] = 'Resources';
      target.buildPhases.push({ value: phaseKey, comment: 'Resources' });
    }
    objects.PBXResourcesBuildPhase[phaseKey].files.push({
      value: buildFileKey,
      comment: 'Localizable.strings in Resources',
    });
    objects.PBXNativeTarget[targetKey] = target;

    for (const lang of ['de', 'ja']) project.addKnownRegion(lang);
    return mod;
  });
}

function withAndroidStrings(config, options) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const res = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const lang of ['de', 'ja']) {
        const table = LANGUAGES[lang];
        const lines = (options.widgets ?? [])
          .filter((w) => w.android !== null)
          .flatMap((w) => [
            `  <string name="${resourceName(w.name)}_display_name">${escapeXml(table[w.displayName])}</string>`,
            `  <string name="${resourceName(w.name)}_description">${escapeXml(table[w.description])}</string>`,
          ]);
        fs.mkdirSync(path.join(res, `values-${lang}`), { recursive: true });
        fs.writeFileSync(
          path.join(res, `values-${lang}`, 'expo_widgets_languages.xml'),
          `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join('\n')}\n</resources>\n`,
        );
      }
      return mod;
    },
  ]);
}

module.exports = function withWidgetLanguages(config) {
  const options = widgetOptions(config);
  const strings = englishStrings(options);
  assertTranslated(strings);
  config = withIosStrings(config, strings);
  return withAndroidStrings(config, options);
};
