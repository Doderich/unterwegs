import { Storage } from 'expo-sqlite/kv-store';
import type { TimelineEntry, travelActivity } from './compute';
import type { NextWidgetProps, WidgetExtras } from './types';
import TravelActivity from './TravelActivity.ios';
import DepartureWidget from './widgets/DepartureWidget.ios';
import NextWidget from './widgets/NextWidget.ios';
import StayWidget from './widgets/StayWidget.ios';
import TodayWidget from './widgets/TodayWidget.ios';

/** iOS: widgets get a timeline, the travel day a Live Activity. Importing this file registers the layouts. */

type Travel = ReturnType<typeof travelActivity>;

export function updateWidgets(timeline: TimelineEntry[], { focusId, covers, choices }: WidgetExtras) {
  const withCover = (next: NextWidgetProps, id: string | undefined) => ({ ...next, cover: (id && covers[id]) || '' });
  try {
    NextWidget.updateTimeline(
      timeline.map(({ date, glances, byCollection }) => ({
        date,
        props: {
          ...withCover(glances.next, focusId ?? undefined),
          byCollection: Object.fromEntries(Object.entries(byCollection).map(([id, g]) => [id, withCover(g.next, id)])),
        },
      })),
    );
    TodayWidget.updateTimeline(
      timeline.map(({ date, glances, byCollection }) => ({
        date,
        props: {
          ...glances.today,
          byCollection: Object.fromEntries(Object.entries(byCollection).map(([id, g]) => [id, g.today])),
        },
      })),
    );
    StayWidget.updateTimeline(timeline.map(({ date, glances }) => ({ date, props: glances.stay })));
    DepartureWidget.updateTimeline(timeline.map(({ date, glances }) => ({ date, props: glances.departure })));
    NextWidget.setConfigurationParameterEnum('collection', choices);
    TodayWidget.setConfigurationParameterEnum('collection', choices);
  } catch {
    // No widget extension (development client without the target): nothing to update.
  }
}

/** Which transportation the running activity shows; there is at most one. */
const SHOWN_KEY = 'unterwegs.glances.travel-activity';

/**
 * Starts, updates or ends the travel-day Live Activity. iOS lets an app start one only while it is in the
 * foreground, which is when this runs. A different transportation ends the old activity and starts a new one.
 */
export async function syncTravelActivity(travel: Travel, link: (path: string) => string) {
  try {
    const running = TravelActivity.getInstances();
    const shown = Storage.getItemSync(SHOWN_KEY);
    if (!travel) {
      await Promise.all(running.map((a) => a.end('default')));
      Storage.removeItemSync(SHOWN_KEY);
      return;
    }
    const staleDate = new Date(travel.endsAt);
    if (running.length > 0 && shown === travel.transportationId) {
      await Promise.all(running.map((a) => a.update(travel.props, staleDate)));
      return;
    }
    await Promise.all(running.map((a) => a.end('immediate')));
    TravelActivity.start(travel.props, link(travel.path), staleDate);
    Storage.setItemSync(SHOWN_KEY, travel.transportationId);
  } catch {
    // Live Activities turned off for the app, or not supported on this device.
  }
}

/** Sign-out: nothing personal stays on the lock screen. */
export async function endTravelActivity() {
  try {
    await Promise.all(TravelActivity.getInstances().map((a) => a.end('immediate')));
    Storage.removeItemSync(SHOWN_KEY);
  } catch {
    // Nothing running.
  }
}
