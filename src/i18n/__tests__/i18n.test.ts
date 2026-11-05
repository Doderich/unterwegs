import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

import de from '../locales/de.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import { resolveLanguage, setLanguage, tr } from '..';

type Tree = { [key: string]: string | Tree };

/** `{ settings: { signOut: '…' } }` → `{ 'settings.signOut': '…' }` */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([k, v]) =>
      typeof v === 'string' ? [[prefix + k, v]] : Object.entries(flatten(v, `${prefix}${k}.`)),
    ),
  );
}

/** Plural variants (`nights_one`, `nights_other`) are one key (`nights`) in the code. */
const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseKey = (k: string) => k.replace(PLURAL, '');

const languages: [string, Record<string, string>][] = [
  ['German', flatten(de)],
  ['English', flatten(en)],
  ['Japanese', flatten(ja)],
];
const german = languages[0][1];

const SRC = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || path === join(SRC, 'i18n') ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path: relative(SRC, path), text: readFileSync(path, 'utf8') }));
const keys = new Set(files.flatMap(({ text }) => [...text.matchAll(/\btr\(\s*'([^']*)'/g)].map((m) => m[1])));
const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

describe('tr() calls', () => {
  it('finds the tr() calls', () => {
    expect(keys.size).toBeGreaterThan(200);
  });

  it('only calls tr() with a string literal, so every key is found here', () => {
    const dynamic = files.flatMap(({ path, text }) =>
      [...text.matchAll(/\btr\((?!\s*')/g)].map((m) => `${path}: ${text.slice(m.index, m.index + 40)}`),
    );
    expect(dynamic).toEqual([]);
  });

  it('uses keys, not sentences', () => {
    expect([...keys].filter((k) => !/^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/.test(k))).toEqual([]);
  });
});

describe.each(languages)('%s translation file', (_name, table) => {
  const present = new Set(Object.keys(table).map(baseKey));

  it('has every key', () => {
    expect([...keys].filter((k) => !present.has(k))).toEqual([]);
  });

  it('has no leftover entries', () => {
    expect([...present].filter((k) => !keys.has(k))).toEqual([]);
  });

  it('has the same keys as German, with every plural form its language needs', () => {
    const germanKeys = new Set(Object.keys(german).map(baseKey));
    expect([...present].filter((k) => !germanKeys.has(k))).toEqual([]);
    // Every language needs `_other`; German and English also `_one` (Japanese has no singular form).
    const plurals = Object.keys(german).filter((k) => k.endsWith('_other'));
    expect(plurals.filter((k) => !(k in table))).toEqual([]);
  });

  it('only uses placeholders the German text has', () => {
    const wrong = Object.entries(table).filter(([key, text]) => {
      const source = german[key] ?? german[`${baseKey(key)}_other`] ?? '';
      const allowed = placeholders(source);
      // `count` is always passed to plural keys, even where a form doesn't show it.
      if (PLURAL.test(key)) allowed.add('count');
      return [...placeholders(text)].some((p) => !allowed.has(p));
    });
    expect(wrong).toEqual([]);
  });
});

describe('tr', () => {
  afterEach(() => setLanguage('de'));

  it('returns German and fills placeholders', () => {
    expect(tr('dayEdit.editDayN', { n: 3 })).toBe('Tag 3 bearbeiten');
  });

  it('translates to English', () => {
    setLanguage('en');
    expect(tr('dayEdit.editDayN', { n: 3 })).toBe('Edit day 3');
  });

  it('translates to Japanese', () => {
    setLanguage('ja');
    expect(tr('common.dayN', { n: 3 })).toBe('3日目');
  });

  it('picks the plural form per language', () => {
    expect([tr('staySummary.nights', { count: 1 }), tr('staySummary.nights', { count: 3 })]).toEqual([
      '1 Nacht',
      '3 Nächte',
    ]);
    setLanguage('en');
    expect([tr('staySummary.nights', { count: 1 }), tr('staySummary.nights', { count: 3 })]).toEqual([
      '1 night',
      '3 nights',
    ]);
    setLanguage('ja');
    expect([tr('staySummary.nights', { count: 1 }), tr('staySummary.nights', { count: 3 })]).toEqual(['1泊', '3泊']);
  });

  it('does not escape values', () => {
    setLanguage('en');
    expect(tr('collectionHero.todayName', { name: 'A & B <C>' })).toBe('Today: A & B <C>');
  });

  it('resolves "system" from the device locale', () => {
    expect(resolveLanguage('system', 'de-AT')).toBe('de');
    expect(resolveLanguage('system', 'en-US')).toBe('en');
    expect(resolveLanguage('system', 'ja-JP')).toBe('ja');
    expect(resolveLanguage('system', 'fr-FR')).toBe('en');
    expect(resolveLanguage('de', 'en-US')).toBe('de');
  });
});
