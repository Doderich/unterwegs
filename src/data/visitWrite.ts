import { endsAfterStart } from '@/time/zonedInput';

/** The fields a Visit editor saves, in either write path. */
export type VisitFields = {
  start_date: string;
  end_date: string;
  timezone: string;
  notes: string;
};

/**
 * The instants to store. An all-day Visit is midnight UTC of its date, like the website. A timed Visit must end
 * after it starts. Null when the times are in the wrong order.
 */
export function visitInstants(
  allDay: boolean,
  date: string,
  startIso: string,
  endIso: string,
): Pick<VisitFields, 'start_date' | 'end_date'> | null {
  if (allDay) return { start_date: `${date}T00:00:00Z`, end_date: `${date}T00:00:00Z` };
  if (!endsAfterStart(startIso, endIso)) return null;
  return { start_date: startIso, end_date: endIso };
}

type VisitPort = {
  save: (input: VisitFields) => Promise<unknown>;
  remove: () => Promise<unknown>;
};

/**
 * Where a Visit is written. A Collection Visit goes through the outbox; a world Location's Visit is an online
 * write. The editor talks to whichever port this returns.
 */
export function visitPort(inCollection: boolean, collection: VisitPort, online: VisitPort): VisitPort {
  return inCollection ? collection : online;
}
