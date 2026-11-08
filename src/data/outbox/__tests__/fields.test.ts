import { changedFields, editOf, foldFields, mergeFields } from '../fields';

describe('editOf', () => {
  const server = { name: 'Ryokan', reservation_number: 'A1', check_in: '2026-12-18T06:00:00Z' };

  it("queues only what the user changed, with the server's values as the base", () => {
    expect(editOf(server, server, { ...server, reservation_number: 'B2' })).toEqual({
      patch: { reservation_number: 'B2' },
      base: { reservation_number: 'A1' },
    });
  });

  it('keeps an edit that undoes a waiting one, so the waiting value is not sent', () => {
    // Offline: A1 → B2 is waiting; the screen shows B2. The user sets A1 again.
    const waiting = { patch: { reservation_number: 'B2' }, base: { reservation_number: 'A1' } };
    const shown = { ...server, reservation_number: 'B2' };
    const undo = editOf(shown, server, { ...shown, reservation_number: 'A1' });
    expect(undo.patch).toEqual({ reservation_number: 'A1' });

    const folded = foldFields(waiting, undo);
    expect(folded).toEqual({ patch: { reservation_number: 'A1' }, base: { reservation_number: 'A1' } });
    // At send time nothing differs from the server: no field has to change.
    expect(mergeFields(server, folded.patch, folded.base).send).toEqual({ reservation_number: 'A1' });
  });

  it('starts from nothing for something not on the server yet', () => {
    expect(editOf({ name: 'New' }, {}, { name: 'Newer' })).toEqual({ patch: { name: 'Newer' }, base: { name: null } });
  });

  it('ignores a price the form wrote differently and an empty list, and still queues a cleared link', () => {
    const shown = { price: '120.00', tags: null, link: null, is_public: false, category: { name: 'food' } };
    const input = { price: 120, tags: [], link: '', is_public: false, category: { name: 'food' } };
    expect(changedFields(shown, input)).toEqual({ link: '' });
    expect(editOf(shown, shown, input)).toEqual({ patch: { link: '' }, base: { link: null } });
  });

  it('does not treat a boolean as the number 0', () => {
    expect(changedFields({ is_public: false }, { is_public: 0 })).toEqual({ is_public: 0 });
  });
});
