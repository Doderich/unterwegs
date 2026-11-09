import { isValidElement, type ReactNode } from 'react';

import { photoGrid, photoListItem } from '../PhotoListItem';

jest.mock('@expo/ui', () => ({ ListItem: 'ListItem' }));
jest.mock('../PhotoRow', () => ({ PhotoRow: function PhotoRow() {} }));
jest.mock('../Sub', () => ({ Sub: 'Sub' }));
jest.mock('../regularWidth', () => ({ useRegularWidth: () => true }));

const icon = <></>;
const photo = (key: string) =>
  photoListItem({
    key,
    colors: {},
    title: key,
    icon,
    images: [{ id: key, image: `https://example.org/${key}.jpg` } as never],
  });
const plain = (key: string) => photoListItem({ key, colors: {}, title: key, icon });
const note = <NoteRow key="note" />;
function NoteRow() {
  return null;
}

/** What each output row shows: the titles of a pair, or the key of a row passed through. */
const shape = (rows: ReactNode[]) =>
  rows.map((row) =>
    isValidElement<{ cards?: { title: string }[] }>(row) && row.props.cards
      ? row.props.cards.map((c) => c.title).join('+')
      : String(isValidElement(row) ? row.key : row).replace(/^\.\$/, ''),
  );

it('gives a section a plain list row when there is no photo', () => {
  expect(isValidElement(plain('e')) && plain('e').type).toBe('ListItem');
});

it('pairs consecutive photo rows and lets other rows end a run', () => {
  const rows = [photo('a'), photo('b'), photo('c'), note, photo('d'), plain('e'), photo('f'), photo('g')];
  expect(shape(photoGrid(rows, 2))).toEqual(['a+b', 'c', 'note', 'd', 'e', 'f+g']);
});

it('keeps a single column untouched', () => {
  expect(shape(photoGrid([photo('a'), photo('b')], 1))).toEqual(['a', 'b']);
});
