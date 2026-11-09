import type { CollectionView } from '@/data/selectors';

/** Preserve all overlapping lodgings: the person chooses rather than silently showing the first booking. */
export function nightLodgings(view: CollectionView, date: string) {
  return view.lodgings
    .filter((l) => l.checkInDate && l.checkOutDate && l.checkInDate <= date && date < l.checkOutDate)
    .map((l) => l.lodging);
}

/** Quick actions only offer lodgings that have an address to show. */
export function addressLodgings(view: CollectionView, date: string) {
  return nightLodgings(view, date).filter((lodging) => lodging.location?.trim());
}
