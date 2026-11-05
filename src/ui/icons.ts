import { tr } from '@/i18n';
import { Icon } from '@expo/ui';
import type { ComponentProps } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';

/**
 * One semantic icon set: SF Symbols on iOS, Material Symbols (XML vector drawables) on Android.
 * `icons.x` is for @expo/ui `<Icon name>`; `toolbarIcon(x)` for `Stack.Toolbar.Button icon`.
 */
const defs = {
  today: ['sun.max', require('@expo/material-symbols/today.xml')],
  sun: ['sunrise', require('@expo/material-symbols/wb_twilight.xml')],
  nearby: ['binoculars', require('@expo/material-symbols/travel_explore.xml')],
  days: ['calendar', require('@expo/material-symbols/calendar_month.xml')],
  map: ['map', require('@expo/material-symbols/map.xml')],
  lodgings: ['bed.double', require('@expo/material-symbols/hotel.xml')],
  lodging: ['bed.double.fill', require('@expo/material-symbols/hotel.xml')],
  plane: ['airplane', require('@expo/material-symbols/flight.xml')],
  train: ['tram.fill', require('@expo/material-symbols/train.xml')],
  boat: ['ferry.fill', require('@expo/material-symbols/directions_boat.xml')],
  bus: ['bus.fill', require('@expo/material-symbols/directions_bus.xml')],
  car: ['car.fill', require('@expo/material-symbols/directions_car.xml')],
  walk: ['figure.walk', require('@expo/material-symbols/directions_walk.xml')],
  location: ['mappin.circle.fill', require('@expo/material-symbols/location_on.xml')],
  pin: ['mappin.and.ellipse', require('@expo/material-symbols/home_pin.xml')],
  copy: ['doc.on.doc', require('@expo/material-symbols/content_copy.xml')],
  share: ['square.and.arrow.up', require('@expo/material-symbols/share.xml')],
  external: ['arrow.up.right.square', require('@expo/material-symbols/open_in_new.xml')],
  qr: ['qrcode.viewfinder', require('@expo/material-symbols/qr_code_scanner.xml')],
  settings: ['gearshape', require('@expo/material-symbols/settings.xml')],
  logout: ['rectangle.portrait.and.arrow.right', require('@expo/material-symbols/logout.xml')],
  pdf: ['doc.richtext', require('@expo/material-symbols/picture_as_pdf.xml')],
  file: ['doc', require('@expo/material-symbols/description.xml')],
  attachment: ['paperclip', require('@expo/material-symbols/attach_file.xml')],
  chevron: ['chevron.right', require('@expo/material-symbols/chevron_right.xml')],
  time: ['clock', require('@expo/material-symbols/schedule.xml')],
  key: ['key', require('@expo/material-symbols/key.xml')],
  price: ['eurosign', require('@expo/material-symbols/payments.xml')],
  link: ['link', require('@expo/material-symbols/link.xml')],
  offline: ['icloud.slash', require('@expo/material-symbols/cloud_off.xml')],
  refresh: ['arrow.clockwise', require('@expo/material-symbols/refresh.xml')],
  delete: ['trash', require('@expo/material-symbols/delete.xml')],
  luggage: ['suitcase.rolling', require('@expo/material-symbols/luggage.xml')],
  event: ['calendar.badge.clock', require('@expo/material-symbols/event.xml')],
  expand: ['chevron.up.chevron.down', require('@expo/material-symbols/unfold_more.xml')],
  check: ['checkmark', require('@expo/material-symbols/check.xml')],
  note: ['note.text', require('@expo/material-symbols/sticky_note_2.xml')],
  notes: ['list.bullet.clipboard', require('@expo/material-symbols/notes.xml')],
  checklist: ['checklist', require('@expo/material-symbols/checklist.xml')],
  checked: ['checkmark.square.fill', require('@expo/material-symbols/check_box.xml')],
  unchecked: ['square', require('@expo/material-symbols/check_box_outline_blank.xml')],
  visit: ['calendar.badge.checkmark', require('@expo/material-symbols/event_available.xml')],
  star: ['star.fill', require('@expo/material-symbols/star.xml')],
  add: ['plus.circle', require('@expo/material-symbols/add_circle.xml')],
  edit: ['pencil', require('@expo/material-symbols/edit.xml')],
  up: ['arrow.up', require('@expo/material-symbols/arrow_upward.xml')],
  down: ['arrow.down', require('@expo/material-symbols/arrow_downward.xml')],
  moveDay: ['calendar.badge.plus', require('@expo/material-symbols/move_down.xml')],
  remove: ['minus.circle', require('@expo/material-symbols/event_busy.xml')],
  addToPlan: ['text.badge.plus', require('@expo/material-symbols/playlist_add.xml')],
  close: ['xmark', require('@expo/material-symbols/close.xml')],
  more: ['ellipsis.circle', require('@expo/material-symbols/more_horiz.xml')],
  camera: ['camera', require('@expo/material-symbols/photo_camera.xml')],
  library: ['photo.on.rectangle', require('@expo/material-symbols/photo_library.xml')],
  addPhoto: ['camera.badge.ellipsis', require('@expo/material-symbols/add_a_photo.xml')],
  search: ['magnifyingglass', require('@expo/material-symbols/search.xml')],
  myLocation: ['location', require('@expo/material-symbols/my_location.xml')],
  personAdd: ['person.badge.plus', require('@expo/material-symbols/person_add.xml')],
  personRemove: ['person.badge.minus', require('@expo/material-symbols/person_remove.xml')],
  group: ['person.2', require('@expo/material-symbols/group.xml')],
  archive: ['archivebox', require('@expo/material-symbols/archive.xml')],
  unarchive: ['tray.and.arrow.up', require('@expo/material-symbols/unarchive.xml')],
  uploadFile: ['doc.badge.plus', require('@expo/material-symbols/upload_file.xml')],
  cover: ['photo', require('@expo/material-symbols/wallpaper.xml')],
  image: ['photo', require('@expo/material-symbols/image.xml')],
  world: ['globe.europe.africa', require('@expo/material-symbols/public.xml')],
  flag: ['flag', require('@expo/material-symbols/flag.xml')],
  stats: ['chart.bar', require('@expo/material-symbols/bar_chart.xml')],
  category: ['tag', require('@expo/material-symbols/category.xml')],
  bold: ['bold', require('@expo/material-symbols/format_bold.xml')],
  warning: ['exclamationmark.triangle', require('@expo/material-symbols/warning.xml')],
  italic: ['italic', require('@expo/material-symbols/format_italic.xml')],
  heading: ['textformat.size', require('@expo/material-symbols/title.xml')],
  bulletList: ['list.bullet', require('@expo/material-symbols/format_list_bulleted.xml')],
} as const satisfies Record<string, readonly [string, ImageSourcePropType]>;

export type IconKey = keyof typeof defs;

type IconName = ComponentProps<typeof Icon>['name'];

// Not `Icon.select`: its Babel plugin inlines the call and leaves TS casts in the bundle.
const pickIcon = (sf: string, md: ImageSourcePropType): unknown => (Platform.OS === 'ios' ? sf : md);

export const icons = Object.fromEntries(Object.entries(defs).map(([k, [sf, md]]) => [k, pickIcon(sf, md)])) as Record<
  IconKey,
  IconName
>;

/** For native toolbar buttons and tabs: SF Symbol name on iOS, drawable on Android. */
export function toolbarIcon(key: IconKey): string | ImageSourcePropType {
  const [sf, md] = defs[key];
  return Platform.OS === 'ios' ? sf : md;
}

/** For text toolbar buttons: Android toolbar buttons are icon-only, iOS keeps the text. */
export function androidToolbarIcon(key: IconKey): ImageSourcePropType | undefined {
  return Platform.OS === 'android' ? defs[key][1] : undefined;
}

export function sfSymbol(key: IconKey): string {
  return defs[key][0];
}

export function materialIcon(key: IconKey): ImageSourcePropType {
  return defs[key][1];
}

/** AdventureLog transportation `type` → icon. */
export function transportIcon(type: string | null | undefined): IconKey {
  switch (type) {
    case 'plane':
      return 'plane';
    case 'train':
      return 'train';
    case 'boat':
      return 'boat';
    case 'bus':
      return 'bus';
    case 'car':
    case 'taxi':
      return 'car';
    case 'walking':
    case 'bike':
      return 'walk';
    default:
      return 'train';
  }
}

const TRANSPORT_LABELS: Record<string, () => string> = {
  plane: () => tr('icons.flight'),
  train: () => tr('icons.train'),
  boat: () => tr('icons.ferry'),
  bus: () => tr('icons.bus'),
  car: () => tr('icons.car'),
  taxi: () => tr('icons.taxi'),
  walking: () => tr('icons.onFoot'),
  bike: () => tr('icons.bike'),
};

const LODGING_LABELS: Record<string, () => string> = {
  hotel: () => tr('icons.hotel'),
  hostel: () => tr('icons.hostel'),
  resort: () => tr('icons.resort'),
  bnb: () => tr('icons.bB'),
  campground: () => tr('icons.campground'),
  cabin: () => tr('icons.cabin'),
  apartment: () => tr('icons.apartment'),
  house: () => tr('icons.house'),
  villa: () => tr('icons.villa'),
  motel: () => tr('icons.motel'),
};

/** `Flug`, `Zug`, … (translated); `Verbindung` for unknown types. */
export function transportLabel(type: string | null | undefined): string {
  return TRANSPORT_LABELS[type ?? '']?.() ?? tr('common.transport');
}

/** `Hotel`, `Hütte`, … (translated), or null for unknown types. */
export function lodgingTypeLabel(type: string | null | undefined): string | null {
  return LODGING_LABELS[type ?? '']?.() ?? null;
}

export const lodgingLabel = (type: string | null | undefined): string =>
  lodgingTypeLabel(type) ?? tr('common.accommodation');
