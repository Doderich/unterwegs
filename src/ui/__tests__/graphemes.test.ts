import { fromGraphemeOffset, graphemeBoundaries, toGraphemeOffset } from '../graphemes';

const SAMPLES = [
  'Check-in ab 15 Uhr 🚆',
  'Familie 👨‍👩‍👧‍👦 in Kyoto',
  'Flagge 🇯🇵 und 🇩🇪',
  'Daumen 👍🏽 ok',
  'Cafe\u0301 und Café',
  'Taste 1️⃣ und ❤️',
  '',
];

describe.each([
  ['Intl.Segmenter', false],
  ['fallback', true],
])('%s', (_name, forceFallback) => {
  it('finds one boundary per user-visible character', () => {
    expect(graphemeBoundaries('a🚆b', forceFallback)).toEqual([0, 1, 3, 4]);
    expect(graphemeBoundaries('👨‍👩‍👧‍👦', forceFallback)).toEqual([0, 11]);
    expect(graphemeBoundaries('🇯🇵🇩🇪', forceFallback)).toEqual([0, 4, 8]);
    expect(graphemeBoundaries('👍🏽', forceFallback)).toEqual([0, 4]);
    expect(graphemeBoundaries('e\u0301', forceFallback)).toEqual([0, 2]);
    expect(graphemeBoundaries('1️⃣', forceFallback)).toEqual([0, 3]);
  });

  it.each(SAMPLES)('round-trips every boundary of %j', (text) => {
    graphemeBoundaries(text, forceFallback).forEach((utf16, n) => {
      expect(toGraphemeOffset(text, utf16, forceFallback)).toBe(n);
      expect(fromGraphemeOffset(text, n, forceFallback)).toBe(utf16);
    });
  });
});

it('maps the #11 case: caret after the train emoji', () => {
  const text = '## Anreise\nCheck-in ab 15 Uhr 🚆\n- Schlüssel';
  const afterEmoji = text.indexOf('\n- ');
  expect(toGraphemeOffset(text, afterEmoji)).toBe(afterEmoji - 1);
  expect(fromGraphemeOffset(text, afterEmoji - 1)).toBe(afterEmoji);
});

it('clamps out-of-range offsets and snaps inside a cluster to its start', () => {
  expect(fromGraphemeOffset('a🚆', 99)).toBe(3);
  expect(toGraphemeOffset('a🚆', 2)).toBe(1);
});
