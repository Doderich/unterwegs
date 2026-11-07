import type { TimelineEntry, travelActivity } from './compute';
import type { WidgetExtras } from './types';
import DepartureWidget from './widgets/DepartureWidget.android';
import NextWidget from './widgets/NextWidget.android';
import StayWidget from './widgets/StayWidget.android';
import TodayWidget from './widgets/TodayWidget.android';

/** Android: widgets get a snapshot of now (no timelines); there is no Live Activity. */

/** The picker is iOS only, so Android widgets always follow the focus collection. */
export function updateWidgets(timeline: TimelineEntry[], { focusId, covers }: WidgetExtras) {
  const now = timeline[0]?.glances;
  if (!now) return;
  try {
    NextWidget.updateSnapshot({ ...now.next, cover: (focusId && covers[focusId]) || '' });
    TodayWidget.updateSnapshot(now.today);
    StayWidget.updateSnapshot(now.stay);
    DepartureWidget.updateSnapshot(now.departure);
  } catch {
    // Widgets not built into this binary.
  }
}

export async function syncTravelActivity(_travel: ReturnType<typeof travelActivity>, _link: (path: string) => string) {}

export async function endTravelActivity() {}
