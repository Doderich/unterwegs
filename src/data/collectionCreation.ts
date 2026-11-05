export type CreationKind = 'location' | 'lodging' | 'transportation' | 'note' | 'checklist';
const ALL: CreationKind[] = ['location', 'lodging', 'transportation', 'note', 'checklist'];
type CreationContext = { kinds: CreationKind[]; chooseDay: boolean; day: string | undefined };

/** The toolbar follows the tab; only a day view supplies an itinerary date. */
export function collectionCreation(
  tab: string | undefined,
  dates: string[],
  selectedDay: string | null,
  today: string,
): CreationContext {
  if (tab === 'map') return { kinds: ['location'], chooseDay: false, day: undefined };
  if (tab === 'lodgings') return { kinds: ['lodging', 'transportation'], chooseDay: false, day: undefined };
  if (tab === 'notes') return { kinds: ['note', 'checklist'], chooseDay: false, day: undefined };
  if (tab === 'days') return { kinds: ALL, chooseDay: dates.length > 0, day: undefined };
  const day = selectedDay && dates.includes(selectedDay) ? selectedDay : dates.includes(today) ? today : dates[0];
  return { kinds: ALL, chooseDay: false, day };
}
