import { tr } from '@/i18n';

/** The server's sport types (`adventures/utils/sports_types.py`) that matter on a family trip, in app language. */
export function sportOptions(): { value: string; label: string }[] {
  return [
    { value: 'Walk', label: tr('sports.walk') },
    { value: 'Hike', label: tr('sports.hike') },
    { value: 'Run', label: tr('sports.run') },
    { value: 'TrailRun', label: tr('sports.trailRun') },
    { value: 'Ride', label: tr('sports.ride') },
    { value: 'MountainBikeRide', label: tr('sports.mountainBike') },
    { value: 'EBikeRide', label: tr('sports.ebike') },
    { value: 'Swim', label: tr('sports.swim') },
    { value: 'Kayaking', label: tr('sports.kayak') },
    { value: 'Canoeing', label: tr('sports.canoe') },
    { value: 'StandUpPaddling', label: tr('sports.standupPaddling') },
    { value: 'Surfing', label: tr('sports.surf') },
    { value: 'Sailing', label: tr('sports.sail') },
    { value: 'AlpineSki', label: tr('sports.alpineSki') },
    { value: 'NordicSki', label: tr('sports.crosscountrySki') },
    { value: 'Snowboard', label: tr('sports.snowboard') },
    { value: 'Snowshoe', label: tr('sports.snowshoe') },
    { value: 'IceSkate', label: tr('sports.iceSkate') },
    { value: 'General', label: tr('sports.other') },
  ];
}

/** Label for a sport type; types the app doesn't list show as the server sends them. */
export function sportLabel(value: string | null | undefined): string {
  if (!value) return tr('sports.other');
  return sportOptions().find((o) => o.value === value)?.label ?? value;
}
