export type TextSelection = { start: number; end: number };
export type MarkdownCommand = 'bold' | 'italic' | 'heading' | 'list' | 'link';

/** UTF-16 offsets match the native text input, including emoji and selected ranges. */
export function formatMarkdown(
  source: string,
  range: TextSelection,
  command: MarkdownCommand,
  placeholder: string,
): { text: string; selection: TextSelection } {
  const start = Math.max(0, Math.min(range.start, source.length));
  const end = Math.max(start, Math.min(range.end, source.length));
  const selected = source.slice(start, end);
  if (command === 'heading' || command === 'list') {
    const lineStart = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1;
    const last = end > start && source[end - 1] === '\n' ? end - 1 : end;
    const nextBreak = source.indexOf('\n', last);
    const lineEnd = nextBreak === -1 ? source.length : nextBreak;
    const prefix = command === 'heading' ? '## ' : '- ';
    const lines = source.slice(lineStart, lineEnd).split('\n');
    const remove = lines.every((line) => line.startsWith(prefix));
    const replacement = lines.map((line) => (remove ? line.slice(prefix.length) : prefix + line)).join('\n');
    return {
      text: source.slice(0, lineStart) + replacement + source.slice(lineEnd),
      selection:
        start === end
          ? {
              start: Math.max(lineStart, start + (remove ? -prefix.length : prefix.length)),
              end: Math.max(lineStart, start + (remove ? -prefix.length : prefix.length)),
            }
          : { start: lineStart, end: lineStart + replacement.length },
    };
  }
  const content = selected || placeholder;
  if (command === 'link') {
    const replacement = `[${content}](https://)`;
    const urlStart = start + content.length + 3;
    return {
      text: source.slice(0, start) + replacement + source.slice(end),
      selection: { start: urlStart, end: urlStart + 'https://'.length },
    };
  }
  const marker = command === 'bold' ? '**' : '*';
  if (
    start >= marker.length &&
    source.slice(start - marker.length, start) === marker &&
    source.slice(end, end + marker.length) === marker
  ) {
    return {
      text: source.slice(0, start - marker.length) + selected + source.slice(end + marker.length),
      selection: { start: start - marker.length, end: end - marker.length },
    };
  }
  return {
    text: source.slice(0, start) + marker + content + marker + source.slice(end),
    selection: { start: start + marker.length, end: start + marker.length + content.length },
  };
}

export type InlineRun = { text: string; bold?: boolean; italic?: boolean; url?: string };

/** Small inline renderer for the formatting controls. Other Markdown remains readable as source. */
export function markdownInline(source: string): InlineRun[] {
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*\*(.+?)\*\*\*|\*\*((?:\*[^*]+\*|[^*])+?)\*\*(?!\*)|\*(?!\*)((?:\*\*[^*]+\*\*|[^*])+?)\*(?!\*)/g;
  const runs: InlineRun[] = [];
  let at = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > at) runs.push({ text: source.slice(at, match.index) });
    // Positional captures also work in Hermes matchAll after Metro transforms the regular expression.
    const [, label, url, both, bold, italic] = match;
    const content = label ?? both ?? bold ?? italic;
    runs.push(
      ...markdownInline(content).map((run) => ({
        ...run,
        ...(url ? { url: url } : {}),
        ...(both || bold ? { bold: true } : {}),
        ...(both || italic ? { italic: true } : {}),
      })),
    );
    at = match.index + match[0].length;
  }
  if (at < source.length) runs.push({ text: source.slice(at) });
  return runs;
}
