import type { CollectionSummary } from '@/api/schemas';
import { tr } from '@/i18n';

import {
  computeReminders,
  focusCollection,
  REMINDER_KINDS,
  reminderCollections,
  travelActivity,
  widgetTimeline,
  type CachedCollection,
  type LinkFn,
  type Reminder,
  type ReminderKind,
  type TimelineEntry,
} from './compute';

export type GlancesSettings = {
  reminders: boolean;
  reminderKinds: Record<ReminderKind, boolean>;
  travelActivity: boolean;
};

export type GlancesInput = {
  summaries: CollectionSummary[];
  /** The offline copies with the waiting edits laid over them (ADR 0016). */
  cached: ReadonlyMap<string, CachedCollection>;
  now: Date;
  settings: GlancesSettings;
  /** The transportation the user put on the Lock Screen, if any. */
  pinned: string | null;
  /** How many of a collection's photos and files are not on the device yet (the offline-readiness reminder). */
  missingFiles: (entry: CachedCollection) => number;
  link: LinkFn;
};

/** What every glance should show now; `surfaces` and `notifications` apply it. */
export type GlancesPlan = {
  widgets: {
    timeline: TimelineEntry[];
    focusId: string | null;
    /** Collections whose cover the widgets need: the focus and every pickable one. */
    coverFor: CachedCollection[];
    choices: { name: string; value: string }[];
  };
  /** null: reminders are off, clear them. */
  reminders: Reminder[] | null;
  travel: {
    activity: ReturnType<typeof travelActivity>;
    /** The pinned transportation is over (arrived or gone): forget the pin. */
    unpin: boolean;
  };
};

/**
 * Decides every glance from the offline copies (ADR 0015): the widgets' focus collection and timeline, the
 * reminders, and the travel-day Live Activity, where a transportation the user pinned wins over the automatic
 * choice (even with the automatic one turned off) until it is over.
 */
export function planGlances({ summaries, cached, now, settings, pinned, missingFiles, link }: GlancesInput): GlancesPlan {
  const focus = focusCollection(summaries, cached, now);
  // The picker offers what reminders cover: every current or upcoming collection on the device.
  const pickable = reminderCollections(summaries, cached, now);

  let reminders: Reminder[] | null = null;
  if (settings.reminders) {
    const enabled = new Set(REMINDER_KINDS.filter((k) => settings.reminderKinds[k]));
    const inputs = pickable.map((entry) => ({ entry, missingFiles: missingFiles(entry) }));
    reminders = computeReminders(inputs, enabled, now);
  }

  const pinnedEntry = pinned
    ? [...cached.values()].find((e) => e.collection.transportations.some((t) => t.id === pinned))
    : undefined;
  const pinnedTrip = pinnedEntry ? travelActivity(pinnedEntry, now, pinned) : null;
  const pinShows = !!pinned && pinnedTrip?.transportationId === pinned;
  const automatic = settings.travelActivity ? travelActivity(focus, now) : null;

  return {
    widgets: {
      timeline: widgetTimeline(focus, now, link, pickable),
      focusId: focus?.collection.id ?? null,
      coverFor: [...new Set([...(focus ? [focus] : []), ...pickable])],
      choices: [
        { name: tr('glances.automatic'), value: 'auto' },
        ...pickable.map((e) => ({ name: e.collection.name, value: e.collection.id })),
      ],
    },
    reminders,
    travel: { activity: pinShows ? pinnedTrip : automatic, unpin: !!pinned && !pinShows },
  };
}
