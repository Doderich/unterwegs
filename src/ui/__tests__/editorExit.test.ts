import { leaveAfterSave } from '../editorExit';

function fakeNav() {
  const calls: unknown[][] = [];
  const nav = {
    back: () => calls.push(['back']),
    replace: (to: unknown) => calls.push(['replace', to]),
    dismissTo: (to: unknown) => calls.push(['dismissTo', to]),
    dismiss: (n?: number) => calls.push(['dismiss', n]),
  };
  return { calls, nav: nav as never };
}

it('goes back to the detail screen after an edit', () => {
  const { calls, nav } = fakeNav();
  leaveAfterSave('lodging', { collectionId: 'c1', savedId: 'L1', created: false }, nav);
  expect(calls).toEqual([['back']]);
});

it("opens a new object's detail screen in place of the editor", () => {
  const { calls, nav } = fakeNav();
  leaveAfterSave('transportation', { collectionId: 'c1', savedId: 'T1', created: true }, nav);
  expect(calls).toEqual([
    ['replace', { pathname: '/transport/[collectionId]/[itemId]', params: { collectionId: 'c1', itemId: 'T1' } }],
  ]);
});

it('returns to the share flow it was opened from, created or not', () => {
  const { calls, nav } = fakeNav();
  leaveAfterSave('lodging', { collectionId: 'c1', savedId: 'L1', created: true, fromShare: true }, nav);
  expect(calls).toEqual([
    ['dismissTo', { pathname: '/share', params: { collectionId: 'c1', objectId: 'L1', kind: 'lodging' } }],
  ]);
});
