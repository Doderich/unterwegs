import { Text as ComposeText } from '@expo/ui/jetpack-compose';

import { padding } from '@expo/ui/jetpack-compose/modifiers';

import type { MdLine } from './markdown';

/**
 * One Markdown text block as a single native text with styled spans (Compose sp sizes follow the
 * system / app text size). Headings are larger and bold; bullets get a "•".
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
  return (
    <ComposeText
      color={color}
      style={reading ? { fontSize: 17, lineHeight: 26 } : undefined}
      modifiers={reading ? [padding(4, 8, 4, 8)] : undefined}>
      {lines.map((line, i) => (
        <ComposeText
          key={i}
          style={line.kind === 'heading' ? { fontSize: 22, fontWeight: '600' } : undefined}
          color={color}>
          {i > 0 ? '\n' : ''}
          {line.kind === 'bullet' ? '• ' : ''}
          {line.runs.map((run, j) => (
            <ComposeText
              key={j}
              style={{
                fontWeight: run.bold || line.kind === 'heading' ? '600' : 'normal',
                fontStyle: run.italic ? 'italic' : 'normal',
              }}
              color={run.url ? tint : color}>
              {run.text}
            </ComposeText>
          ))}
        </ComposeText>
      ))}
    </ComposeText>
  );
}
