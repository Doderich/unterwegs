import { markdownSummary, parseMarkdown } from '../markdown';

const text = (...runs: { text: string; bold?: boolean; italic?: boolean }[]) => ({ kind: 'text' as const, runs });

it('splits text and links', () => {
  expect(parseMarkdown('PIN:XXXX\n\n[Buchungsbestätigung](https://secure.booking.com/x?y=1)')).toEqual([
    { type: 'text', lines: [text({ text: 'PIN:XXXX' })] },
    { type: 'link', label: 'Buchungsbestätigung', url: 'https://secure.booking.com/x?y=1' },
  ]);
});

it('keeps emphasis, headings and bullets as styled lines', () => {
  expect(parseMarkdown('## Anreise\n**Wichtig:** Check-in ab *15 Uhr*\n- Schlüssel im Kasten')).toEqual([
    {
      type: 'text',
      lines: [
        { kind: 'heading', runs: [{ text: 'Anreise' }] },
        text({ text: 'Wichtig:', bold: true }, { text: ' Check-in ab ' }, { text: '15 Uhr', italic: true }),
        { kind: 'bullet', runs: [{ text: 'Schlüssel im Kasten' }] },
      ],
    },
  ]);
});

it('reads __bold__ like **bold** and inline code as plain text', () => {
  expect(parseMarkdown('__Code__: `1234`')).toEqual([
    { type: 'text', lines: [text({ text: 'Code', bold: true }, { text: ': 1234' })] },
  ]);
});

it('turns bare URLs into link rows and keeps surrounding text', () => {
  expect(parseMarkdown('Tickets: https://www.jreast.co.jp/de/ bitte ausdrucken')).toEqual([
    { type: 'text', lines: [text({ text: 'Tickets: bitte ausdrucken' })] },
    { type: 'link', label: 'jreast.co.jp', url: 'https://www.jreast.co.jp/de/' },
  ]);
  expect(parseMarkdown('')).toEqual([]);
  expect(parseMarkdown(null)).toEqual([]);
});

it('leaves unsupported syntax readable and unsafe links as text', () => {
  expect(parseMarkdown('> Zitat\n- [ ] Pass\n[x](javascript:alert(1))')).toEqual([
    {
      type: 'text',
      lines: [
        text({ text: '> Zitat' }),
        { kind: 'bullet', runs: [{ text: '[ ] Pass' }] },
        text({ text: '[x](javascript:alert(1))' }),
      ],
    },
  ]);
});

it('keeps emoji intact and strips link-only punctuation lines', () => {
  expect(parseMarkdown('🚆 **Zug** 🎫\n- [Ticket](https://example.org/t)')).toEqual([
    { type: 'text', lines: [text({ text: '🚆 ' }, { text: 'Zug', bold: true }, { text: ' 🎫' })] },
    { type: 'link', label: 'Ticket', url: 'https://example.org/t' },
  ]);
});

it('summarises to one plain line', () => {
  expect(markdownSummary('# Tag 1\n\n- **Zug** nach Kyoto\n[Ticket](https://example.org/t)')).toBe(
    'Tag 1 • Zug nach Kyoto Ticket',
  );
});
