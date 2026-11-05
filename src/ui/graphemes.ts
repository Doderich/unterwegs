/**
 * UTF-16 offsets (JavaScript strings, Android's text field, `formatMarkdown`) ↔ grapheme offsets (iOS: the
 * SwiftUI text field reports and sets its selection in Swift `Character`s). Without the conversion, formatting
 * after an emoji splits it (#11).
 */

type SegmenterLike = { segment(text: string): Iterable<{ index: number }> };

function segmenter(): SegmenterLike | null {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => SegmenterLike }).Segmenter;
  return Seg ? new Seg(undefined, { granularity: 'grapheme' }) : null;
}

const isRegional = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;
/** Code points that attach to the previous one: combining marks, variation selectors, skin tones, keycap, tags. */
const isExtend = (cp: number) =>
  (cp >= 0x0300 && cp <= 0x036f) ||
  (cp >= 0x1ab0 && cp <= 0x1aff) ||
  (cp >= 0x1dc0 && cp <= 0x1dff) ||
  (cp >= 0x20d0 && cp <= 0x20ff) ||
  (cp >= 0xfe00 && cp <= 0xfe0f) ||
  (cp >= 0xfe20 && cp <= 0xfe2f) ||
  (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
  (cp >= 0xe0020 && cp <= 0xe007f) ||
  (cp >= 0xe0100 && cp <= 0xe01ef);
const ZWJ = 0x200d;

/** Approximation of the Unicode rules for the cases people type: emoji sequences, flags, accents, keycaps. */
function fallbackBoundaries(text: string): number[] {
  const out = [0];
  const cps = Array.from(text);
  let at = 0;
  let prev = -1;
  let regionalRun = 0;
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i].codePointAt(0)!;
    const joins =
      i > 0 &&
      (isExtend(cp) || cp === ZWJ || prev === ZWJ || (isRegional(cp) && isRegional(prev) && regionalRun % 2 === 1));
    if (i > 0 && !joins) out.push(at);
    regionalRun = isRegional(cp) ? (joins && isRegional(prev) ? regionalRun + 1 : 1) : 0;
    at += cps[i].length;
    prev = cp;
  }
  if (text.length > 0) out.push(text.length);
  return out;
}

/** UTF-16 offsets of every grapheme boundary, including 0 and `text.length`. */
export function graphemeBoundaries(text: string, forceFallback = false): number[] {
  const seg = forceFallback ? null : segmenter();
  if (!seg) return fallbackBoundaries(text);
  const out = Array.from(seg.segment(text), (s) => s.index);
  if (out.length === 0 || out[0] !== 0) out.unshift(0);
  if (text.length > 0) out.push(text.length);
  return out;
}

/** UTF-16 offset → number of graphemes before it (an offset inside a cluster counts from the cluster's start). */
export function toGraphemeOffset(text: string, utf16: number, forceFallback = false): number {
  const b = graphemeBoundaries(text, forceFallback);
  let n = 0;
  while (n + 1 < b.length && b[n + 1] <= utf16) n++;
  return n;
}

/** Grapheme count → UTF-16 offset, clamped to the text. */
export function fromGraphemeOffset(text: string, graphemes: number, forceFallback = false): number {
  const b = graphemeBoundaries(text, forceFallback);
  return b[Math.max(0, Math.min(graphemes, b.length - 1))];
}
