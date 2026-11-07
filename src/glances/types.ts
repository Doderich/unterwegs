/**
 * Props the widgets and the Live Activity receive (docs/GLANCES.md). The widget runtime can't import app code or
 * translate, so every string is finished text and every time is already formatted in its object's own zone.
 * Instants are epoch milliseconds: props cross the bridge as JSON.
 */

/** One line of a widget: an SF Symbol name (iOS), a formatted time (or ''), the title, and the deep link a tap on it opens. */
export type GlanceRow = { symbol: string; time: string; title: string; done: boolean; url: string };

type Base = {
  /** Deep link the widget opens on iOS (`widgetURL`). */
  url: string;
  /** "As of …" when the offline copy is old, else ''. */
  footer: string;
};

export type NextWidgetProps = Base & {
  /** `file://` URI of the cover photo in the App Group folder, or ''. */
  cover: string;
  state: 'none' | 'upcoming' | 'current';
  /** Collection name, or the empty-state text. */
  name: string;
  /** "in 12 days" · "Day 4 of 10". */
  headline: string;
  /** Lock-screen circular: "12" · "4/10". */
  short: string;
  /** Lock-screen circular caption: "days" · "day". */
  shortCaption: string;
  rows: GlanceRow[];
};

/** One day of the Today widget. */
export type DayPanel = { title: string; rows: GlanceRow[]; night: string };

export type TodayWidgetProps = Base & {
  state: 'none' | 'day';
  /** "Thu, 17 Dec · Kyoto", or the empty-state text. */
  title: string;
  rows: GlanceRow[];
  /** "Tonight: Hotel Sakura", or ''. */
  night: string;
  /** Shown when the day has nothing planned. */
  emptyDay: string;
  /** Tomorrow, when it is a day of the collection; the widget's switch shows it. */
  tomorrow: DayPanel | null;
  /** Set by the switch inside the widget, reset by the app on its next update. */
  showTomorrow: boolean;
  /** Switch labels: "Tomorrow" while today shows, "Today" while tomorrow shows. */
  toTomorrow: string;
  toToday: string;
};

export type StayWidgetProps = Base & {
  state: 'none' | 'stay';
  /** "Tonight" · "Next stay", or the empty-state text. */
  label: string;
  name: string;
  address: string;
  /** "Check-in from 15:00" · "Check-out by 11:00", or ''. */
  detail: string;
};

/** One transportation of the Departure widget. */
export type DepartureItem = {
  symbol: string;
  title: string;
  route: string;
  departs: string;
  arrives: string;
  day: string;
  url: string;
};

export type DepartureWidgetProps = Base & {
  state: 'none' | 'departure';
  symbol: string;
  /** "Departure" label, or the empty-state text. */
  label: string;
  title: string;
  route: string;
  /** "08:42 Kyoto" */
  departs: string;
  /** "10:58" (+ zone when it differs), or ''. */
  arrives: string;
  /** Day label when the departure isn't today, else ''. */
  day: string;
  /** The next few transportations (the first is the one above); the widget's "Next" button steps through them. */
  items: DepartureItem[];
  /** Which item shows; set by the button, reset by the app on its next update. */
  index: number;
  /** "Next" button label. */
  nextLabel: string;
};

export type TravelActivityProps = {
  symbol: string;
  title: string;
  from: string;
  to: string;
  /** "08:42 Kyoto" */
  departs: string;
  /** "10:58 Tokyo", or ''. */
  arrives: string;
  departAt: number;
  /** 0 when unknown. */
  arriveAt: number;
  /** Tonight's lodging name, or ''. */
  lodging: string;
  labels: { departs: string; arrives: string; arrived: string };
};

/**
 * iOS widgets with a collection picker (iOS 17+): the focus collection's props, plus the same props for every
 * collection the picker offers. The widget reads `environment.configuration.collection`; `auto` or an unknown id
 * falls back to the focus collection.
 */
export type Pickable<T> = T & { byCollection: Record<string, T> };
export type CollectionConfiguration = { collection: string };

/** What the app adds to the computed widgets (`useGlances`). */
export type WidgetExtras = {
  /** The focus collection's id, for its cover. */
  focusId: string | null;
  /** Cover photo URI per collection id. */
  covers: Record<string, string>;
  /** The collections the iOS widget picker offers, `auto` first. */
  choices: { name: string; value: string }[];
};
