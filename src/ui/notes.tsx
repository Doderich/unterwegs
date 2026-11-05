import type { ReactElement } from 'react';

import type { Note } from '@/api/schemas';
import { tr } from '@/i18n';

import { linkRows, markdownRows, type RowTheme } from './rows';

/** A note's body as native rows: Markdown text + one link row per entry in `links`. */
export function noteRows(t: RowTheme, note: Note): ReactElement[] {
  return [
    ...markdownRows(t, note.content, `note-${note.id}`),
    ...(note.links ?? []).flatMap((url, i, all) =>
      linkRows(t, {
        key: `note-${note.id}-link-${i}`,
        label: all.length === 1 ? tr('notes.openLink') : tr('notes.linkN', { n: i + 1 }),
        url,
      }),
    ),
  ];
}
