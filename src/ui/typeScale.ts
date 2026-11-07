import type { TextStyle } from 'react-native';

/**
 * The app's shared text sizes, for `Text` from `@/ui/Text` so they follow the text-size setting. Colours come from
 * the theme at the call site.
 *
 * Four sizes and two weights, nothing else (DESIGN.md → Typography): 28 (`figure`), 22 (`title`), 17 (`body`) and
 * 13 (`supporting`, `label`), each regular (400) or semibold (600). On iOS they are the Dynamic Type styles title,
 * title2, body and footnote. Hierarchy beyond that comes from colour (text, secondary) and placement.
 *
 * - `figure`: the one large value on a screen (journey times, the hero's collection name)
 * - `title`: resource, screen, day and sheet titles
 * - `body` / `bodyStrong`: names and running text
 * - `supporting`: context lines, list row second lines
 * - `label`: section headings and footers
 */
export const typeScale = {
  figure: { fontSize: 28, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 17 },
  bodyStrong: { fontSize: 17, fontWeight: '600' },
  supporting: { fontSize: 13 },
  label: { fontSize: 13 },
} satisfies Record<string, Pick<TextStyle, 'fontSize' | 'fontWeight'>>;
