/**
 * The one reading model for AdventureLog Markdown (descriptions, day text, notes, editor preview).
 * Paragraphs become text blocks of lines with inline runs; links and bare URLs become separate link blocks,
 * so they open through the shared link rows (booking-link handling included). Parsing is display-only:
 * the stored source is never rewritten, and syntax we don't support stays readable as text.
 */

import { markdownInline, type InlineRun } from './markdownEditing';

export type { InlineRun };

export type MdLine = { kind: 'heading' | 'bullet' | 'text'; runs: InlineRun[] };
export type MdBlock = { type: 'text'; lines: MdLine[] } | { type: 'link'; label: string; url: string };

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)]+/g;
const HEADING = /^\s{0,3}#{1,6}\s+/;
const BULLET = /^\s*[-*+]\s+/;

/** Inline runs of one line: `__bold__` reads like `**bold**`, inline code as its plain content. */
function inlineRuns(text: string): InlineRun[] {
  const normalised = text.replace(/__(.+?)__/g, '**$1**').replace(/`([^`]+)`/g, '$1');
  return markdownInline(normalised).filter((run) => run.text);
}

function plainLabel(label: string): string {
  return inlineRuns(label)
    .map((run) => run.text)
    .join('');
}

export function parseMarkdown(source: string | null | undefined): MdBlock[] {
  if (!source?.trim()) return [];
  const blocks: MdBlock[] = [];
  const paragraphs = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const para of paragraphs) {
    const lines: MdLine[] = [];
    const flush = () => {
      if (lines.length) blocks.push({ type: 'text', lines: lines.splice(0) });
    };
    for (const rawLine of para.split('\n')) {
      const links: MdBlock[] = [];
      let line = rawLine.replace(LINK, (_, label: string, url: string) => {
        links.push({ type: 'link', label: plainLabel(label), url });
        return '';
      });
      line = line.replace(BARE_URL, (url: string) => {
        links.push({ type: 'link', label: url.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0], url });
        return '';
      });
      const kind: MdLine['kind'] = HEADING.test(line) ? 'heading' : BULLET.test(line) ? 'bullet' : 'text';
      const text = line
        .replace(HEADING, '')
        .replace(BULLET, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      // A line that only held a link ("Tickets: [x](…)" → "Tickets:") keeps its words; bare punctuation goes.
      if (text && !/^[:\-–]$/.test(text)) lines.push({ kind, runs: inlineRuns(text) });
      if (links.length) {
        flush();
        blocks.push(...links);
      }
    }
    flush();
  }
  return blocks;
}

/** A line as plain text, bullets included (accessibility labels, summaries). */
export function lineText(line: MdLine): string {
  return (line.kind === 'bullet' ? '• ' : '') + line.runs.map((run) => run.text).join('');
}

/** One-line plain summary, e.g. for a collapsed form row. */
export function markdownSummary(source: string | null | undefined): string {
  return parseMarkdown(source)
    .map((block) => (block.type === 'text' ? block.lines.map(lineText).join(' ') : block.label))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
