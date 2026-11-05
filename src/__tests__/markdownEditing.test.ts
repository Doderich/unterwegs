import { formatMarkdown, markdownInline } from '@/ui/markdownEditing';

const apply = (text: string, start: number, end: number, command: Parameters<typeof formatMarkdown>[2]) =>
  formatMarkdown(text, { start, end }, command, 'Text');

test('formats the selected text without changing surrounding text', () => {
  expect(apply('Bring tickets today', 6, 13, 'bold')).toEqual({
    text: 'Bring **tickets** today',
    selection: { start: 8, end: 15 },
  });
});

test('inserts a selected placeholder at the caret and toggles formatting off', () => {
  const result = apply('', 0, 0, 'bold');
  expect(result).toEqual({ text: '**Text**', selection: { start: 2, end: 6 } });
  expect(formatMarkdown(result.text, result.selection, 'bold', 'Text')).toEqual({
    text: 'Text',
    selection: { start: 0, end: 4 },
  });
});

test('native UTF-16 ranges preserve emoji outside the selection', () => {
  expect(apply('🚂 Train', 3, 8, 'italic').text).toBe('🚂 *Train*');
});

test('formats full selected lines and excludes a trailing newline', () => {
  const result = apply('Tickets\nPassport\nWater', 0, 17, 'list');
  expect(result.text).toBe('- Tickets\n- Passport\nWater');
  expect(formatMarkdown(result.text, result.selection, 'list', 'Text').text).toBe('Tickets\nPassport\nWater');
});

test('heading at an empty first line keeps its caret on that line', () => {
  expect(apply('\nNext', 0, 0, 'heading')).toEqual({ text: '## \nNext', selection: { start: 3, end: 3 } });
});

test('link formatting selects the URL for immediate replacement', () => {
  const result = apply('Tickets', 0, 7, 'link');
  expect(result.text).toBe('[Tickets](https://)');
  expect(result.text.slice(result.selection.start, result.selection.end)).toBe('https://');
});

test('inline preview renders bold, italic, and safe link labels', () => {
  expect(markdownInline('Bring **tickets**, *please*. [Details](https://example.org)')).toEqual([
    { text: 'Bring ' },
    { text: 'tickets', bold: true },
    { text: ', ' },
    { text: 'please', italic: true },
    { text: '. ' },
    { text: 'Details', url: 'https://example.org' },
  ]);
  expect(markdownInline('[Unsafe](javascript:alert(1))')).toEqual([{ text: '[Unsafe](javascript:alert(1))' }]);
});

test('preview retains combined and nested styles produced by consecutive controls', () => {
  expect(markdownInline('***Tickets***')).toEqual([{ text: 'Tickets', bold: true, italic: true }]);
  expect(markdownInline('**Bring *tickets***')).toEqual([
    { text: 'Bring ', bold: true },
    { text: 'tickets', bold: true, italic: true },
  ]);
  expect(markdownInline('*Bring **tickets***')).toEqual([
    { text: 'Bring ', italic: true },
    { text: 'tickets', bold: true, italic: true },
  ]);
});
