import { Text as SwiftUIText } from '@expo/ui/swift-ui';
import { bold, font, foregroundStyle, italic, lineSpacing, padding, textSelection } from '@expo/ui/swift-ui/modifiers';

import { useSettings } from '@/settings/store';

import type { MdLine } from './markdown';

/**
 * One Markdown text block as a single SwiftUI text built from concatenated spans: Dynamic Type text
 * styles, selectable, and no `LocalizedStringKey` parsing of the stored source.
 */
export function MarkdownText({
  lines,
  color,
  tint,
  reading = false,
}: {
  lines: MdLine[];
  color: string;
  tint: string;
  reading?: boolean;
}) {
  const { boldText } = useSettings();
  return (
    <SwiftUIText
      modifiers={[
        font({ textStyle: 'body', weight: boldText ? 'semibold' : undefined }),
        foregroundStyle(color),
        textSelection(true),
        ...(reading ? [lineSpacing(4), padding({ vertical: 8, horizontal: 4 })] : []),
      ]}>
      {lines.flatMap((line, i) => [
        ...(i > 0 ? [<SwiftUIText key={`${i}-br`}>{'\n'}</SwiftUIText>] : []),
        ...(line.kind === 'bullet' ? [<SwiftUIText key={`${i}-bullet`}>{'• '}</SwiftUIText>] : []),
        ...line.runs.map((run, j) => (
          <SwiftUIText
            key={`${i}-${j}`}
            modifiers={[
              ...(line.kind === 'heading' ? [font({ textStyle: 'title3', weight: boldText ? 'heavy' : 'bold' })] : []),
              ...(run.bold ? [bold()] : []),
              ...(run.italic ? [italic()] : []),
              ...(run.url ? [foregroundStyle(tint)] : []),
            ]}>
            {run.text}
          </SwiftUIText>
        )),
      ])}
    </SwiftUIText>
  );
}
