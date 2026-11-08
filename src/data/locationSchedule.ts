import type { Visit } from '@/api/schemas';
import { tr } from '@/i18n';
import { formatDayLabel, visitTime } from '@/time/tz';

import type { CollectionView, Day } from './selectors';

/** The website's placeholder for a Visit it creates from the itinerary. Never shown, never written back. */
export const GENERATED_VISIT_NOTE = 'Created from itinerary planning';

/** The note a person wrote. The generated itinerary placeholder is not one. */
export function shownVisitNote(notes: string | null | undefined): string | null {
  if (!notes || notes === GENERATED_VISIT_NOTE) return null;
  return notes;
}

export type ScheduleRow = {
  date: string;
  label: string;
  value: string;
  offItinerary: boolean;
  visitId: string | null;
};

/**
 * One row per date: itinerary Days the Location is on, plus Visits on any other date. A Visit on a planned Day
 * replaces that row. Times stay in the Visit's own zone.
 */
export function locationSchedule(view: CollectionView, plannedDays: Day[], visits: Visit[]): ScheduleRow[] {
  const rows = new Map<string, ScheduleRow>();
  for (const d of plannedDays) {
    rows.set(d.date, {
      date: d.date,
      label: tr('common.dayN', { n: d.number }),
      value: [formatDayLabel(d.date), d.name].filter(Boolean).join(' · '),
      offItinerary: false,
      visitId: null,
    });
  }
  for (const v of visits) {
    if (!v.start_date) continue;
    const t = visitTime(v.start_date, v.end_date, v.timezone ?? view.timeZone);
    const day = view.days.find((d) => d.date === t.date);
    const note = shownVisitNote(v.notes);
    const when = [formatDayLabel(t.date), t.endDate ? `– ${formatDayLabel(t.endDate)}` : null, t.time]
      .filter(Boolean)
      .join(' ');
    rows.set(t.date, {
      date: t.date,
      label: [day ? tr('common.dayN', { n: day.number }) : tr('common.visit'), note].filter(Boolean).join(' · '),
      value: [when, day?.name].filter(Boolean).join(' · '),
      offItinerary: !day,
      visitId: v.id,
    });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}
