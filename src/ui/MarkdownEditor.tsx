import { tr } from '@/i18n';

import { useMarkdownField } from './MarkdownField';
import type { RowTheme } from './rows';

/**
 * The Markdown text of a form (collection, day, location, lodging, transportation, note), edited where it is
 * shown: formatted at rest, a native field with a formatting bar above the keyboard while editing. Typing only
 * changes the form's draft; the form's own save action writes it.
 *
 * Render `row` in the form and pass `keyboardBar` to `<FormHost>`.
 */
export function useMarkdownEditor(t: RowTheme, value: string, onChange: (text: string) => void) {
  const field = useMarkdownField(t, value, onChange, { placeholder: tr('markdownEditor.writeHere') });
  return { row: field.rows, keyboardBar: field.keyboardBar };
}
