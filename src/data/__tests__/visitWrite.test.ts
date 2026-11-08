import { visitInstants, visitPort, type VisitFields } from '../visitWrite';

const timed: VisitFields = {
  start_date: '2026-11-04T08:00:00Z',
  end_date: '2026-11-04T09:00:00Z',
  timezone: 'Europe/Berlin',
  notes: '',
};

describe('visitInstants', () => {
  it('stores an all-day visit as midnight UTC of that date', () => {
    expect(visitInstants(true, '2026-11-04', timed.start_date, timed.end_date)).toEqual({
      start_date: '2026-11-04T00:00:00Z',
      end_date: '2026-11-04T00:00:00Z',
    });
  });

  it('keeps a timed visit whose end is after its start', () => {
    expect(visitInstants(false, '2026-11-04', timed.start_date, timed.end_date)).toEqual({
      start_date: timed.start_date,
      end_date: timed.end_date,
    });
  });

  it('refuses a timed visit that ends first', () => {
    expect(visitInstants(false, '2026-11-04', timed.end_date, timed.start_date)).toBeNull();
  });
});

describe('visitPort', () => {
  it('writes a collection visit through the collection port and a world visit through the online one', async () => {
    const collection = { save: jest.fn(async () => 'collection'), remove: jest.fn(async () => true) };
    const online = { save: jest.fn(async () => 'online'), remove: jest.fn(async () => true) };

    const inCollection = visitPort(true, collection, online);
    await inCollection.save(timed);
    await inCollection.remove();

    const inWorld = visitPort(false, collection, online);
    await inWorld.save(timed);

    expect(collection.save).toHaveBeenCalledTimes(1);
    expect(collection.remove).toHaveBeenCalledTimes(1);
    expect(online.save).toHaveBeenCalledTimes(1);
    expect(online.remove).not.toHaveBeenCalled();
  });
});
