import { tr } from '@/i18n';

import { utcToZoned, zonedToUtc, type WallTime } from './zonedInput';

/**
 * What a wall-clock time typed in a zone is saved as (UTC), and the hint when that time doesn't exist on that day
 * because the clocks jump forward: it is saved as the same moment after the jump (02:30 → 03:30).
 */
export function zonedMoment(wall: WallTime, zone: string): { iso: string; clockChange: string | null } {
  const { iso, shifted } = zonedToUtc(wall, zone);
  return {
    iso,
    clockChange: shifted
      ? tr('zonedMoment.clockChange', { typed: wall.time, time: utcToZoned(iso, zone).time })
      : null,
  };
}
