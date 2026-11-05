import { collectionCreation } from '../collectionCreation';

const dates = ['2027-03-01', '2027-03-02', '2027-03-03'];

it('adds to the selected day on Today, including after paging away from today', () => {
  expect(collectionCreation('index', dates, dates[2], dates[0])).toMatchObject({ day: dates[2], chooseDay: false });
  expect(collectionCreation('[id]', dates, null, dates[1])).toMatchObject({ day: dates[1] });
  expect(collectionCreation('index', dates, 'old date', 'outside trip')).toMatchObject({ day: dates[0] });
});

it('asks which day in the itinerary overview instead of silently choosing today', () => {
  expect(collectionCreation('days', dates, dates[2], dates[0])).toMatchObject({ chooseDay: true, day: undefined });
  expect(collectionCreation('days', [], null, dates[0])).toMatchObject({ chooseDay: false, day: undefined });
});

it.each([
  ['map', ['location']],
  ['lodgings', ['lodging', 'transportation']],
  ['notes', ['note', 'checklist']],
])('offers relevant items in %s without assigning an unrelated day', (tab, kinds) => {
  expect(collectionCreation(tab, dates, dates[2], dates[0])).toEqual({ kinds, chooseDay: false, day: undefined });
});
