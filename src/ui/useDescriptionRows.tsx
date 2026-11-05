import { ListItem } from '@expo/ui';
import { useState } from 'react';

import { tr } from '@/i18n';
import { fromGraphemeOffset, graphemeBoundaries } from './graphemes';
import { markdownSummary } from './markdown';
import { MarkdownText } from './MarkdownText';
import { markdownRows, type RowTheme } from './rows';

/** Display-only excerpt. The complete source, formatting and links remain available when expanded. */
export function useDescriptionRows(theme: RowTheme, source: string | null | undefined) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const summary = markdownSummary(source);
  const long = graphemeBoundaries(summary).length - 1 > 500;
  const expanded = expandedSource === source;
  const cutoff = fromGraphemeOffset(summary, 280);
  const excerpt = summary.slice(0, cutoff);
  // Prefer a whole word; scripts without spaces retain a grapheme-safe boundary.
  const space = excerpt.lastIndexOf(' ');
  const preview = (space > excerpt.length * 0.8 ? excerpt.slice(0, space) : excerpt).trimEnd() + '…';
  const rows =
    long && !expanded
      ? [
          <MarkdownText
            key="description-preview"
            lines={[{ kind: 'text', runs: [{ text: preview }] }]}
            color={theme.colors.text}
            tint={theme.colors.tint}
            reading
          />,
        ]
      : markdownRows(theme, source, 'description', true);
  if (long)
    rows.push(
      <ListItem
        key="description-toggle"
        colors={theme.listColors}
        onPress={() => setExpandedSource(expanded ? null : (source ?? null))}>
        {expanded ? tr('description.showLess') : tr('description.readMore')}
      </ListItem>,
    );
  return rows;
}
