import type { CalendarEvent } from '@/api/schemas';
import { formatTime, localDate } from '@/time/tz';

const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Local calendar date of an event boundary. Dates stay as they are; datetimes are UTC and shown in the event's
 * own zone. All-day visits are stored as midnight UTC of their date (SERVER.md → Writes), so they keep the UTC date.
 */
export function eventDate(e: CalendarEvent, which: 'start' | 'end', fallbackZone: string): string {
  const value = which === 'start' ? e.start : (e.end ?? e.start);
  if (isDateOnly(value)) return value;
  if (e.all_day && e.type === 'visit') return value.slice(0, 10);
  return localDate(value, e.timezone || fallbackZone);
}

/** `13:00`, or null for all-day events and plain dates. */
export function eventTime(e: CalendarEvent, fallbackZone: string): string | null {
  if (e.all_day || isDateOnly(e.start)) return null;
  return formatTime(e.start, e.timezone || fallbackZone);
}

export type AgendaEvent = CalendarEvent & { date: string; endDate: string; time: string | null };
export type AgendaDay = { date: string; events: AgendaEvent[] };

const TYPE_ORDER: Record<string, number> = { collection: 0, transportation: 1, lodging: 2, visit: 3, note: 4 };

/**
 * Events grouped by their local start date, in date order; within a day collections first, then by time.
 * `upcoming`: days with events that haven't ended before `today`; `past`: the rest, most recent first.
 */
export function agenda(events: CalendarEvent[], today: string, fallbackZone: string) {
  const enriched: AgendaEvent[] = events.map((e) => ({
    ...e,
    date: eventDate(e, 'start', fallbackZone),
    endDate: eventDate(e, 'end', fallbackZone),
    time: eventTime(e, fallbackZone),
  }));
  const group = (list: AgendaEvent[]): AgendaDay[] => {
    const byDate = new Map<string, AgendaEvent[]>();
    for (const e of list) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEvents]) => ({
        date,
        events: dayEvents.sort(
          (a, b) =>
            (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) ||
            (a.time ?? '').localeCompare(b.time ?? '') ||
            a.title.localeCompare(b.title),
        ),
      }));
  };
  return {
    upcoming: group(enriched.filter((e) => e.endDate >= today)),
    past: group(enriched.filter((e) => e.endDate < today)).reverse(),
  };
}
