import type { TimelineEntry, travelActivity } from './compute';
import type { WidgetExtras } from './types';

/** Web and tests: no widgets, no Live Activities. The platform files (`.ios.ts`, `.android.ts`) do the work. */

export function updateWidgets(_timeline: TimelineEntry[], _extras: WidgetExtras) {}

export async function syncTravelActivity(_travel: ReturnType<typeof travelActivity>, _link: (path: string) => string) {}

export async function endTravelActivity() {}
