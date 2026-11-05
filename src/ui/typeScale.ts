import type { TextStyle } from 'react-native';

/**
 * The app's shared text sizes (docs/DESIGN-PLAN.md §3), for `Text` from `@/ui/Text` so they follow the
 * text-size setting. Colours come from the theme at the call site.
 *
 * - `title`: resource and screen titles (detail headers, notes)
 * - `heading`: a day or a journey's service, one step below a title
 * - `figure`: large times in the journey summary
 * - `body`: names and running text
 * - `supporting`: context lines, list row second lines
 * - `label`: section headings and footers
 */
export const typeScale = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 22, fontWeight: '700' },
  figure: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 17 },
  bodyStrong: { fontSize: 17, fontWeight: '600' },
  supporting: { fontSize: 15 },
  label: { fontSize: 13 },
} satisfies Record<string, Pick<TextStyle, 'fontSize' | 'fontWeight'>>;
