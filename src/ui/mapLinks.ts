import { Alert, Linking, Platform } from 'react-native';

import { tr } from '@/i18n';
import { getSettings, type MapApp } from '@/settings/store';

/**
 * Provider links need no API key; HTTPS links can fall back to the provider's website.
 * Organic Maps: https://omaps.app/api
 * OsmAnd iOS: https://github.com/osmandapp/OsmAnd-iOS/blob/master/Sources/Helpers/DeepLinkManager/DeepLinkParser.swift
 * OsmAnd Android registers `osmand.geo` in its AndroidManifest.xml.
 */
export function mapUrl(
  app: MapApp,
  platform: string,
  label: string,
  latitude?: number | null,
  longitude?: number | null,
): string | null {
  const q = encodeURIComponent(label);
  const hasCoords =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180;
  const coords = hasCoords ? `${latitude},${longitude}` : null;
  if (app === 'organic') return coords ? `om://map?v=1&ll=${coords}&n=${q}` : `om://search?query=${q}`;
  if (app === 'osmand') {
    if (platform === 'ios') return coords ? `osmandmaps://?lat=${latitude}&lon=${longitude}&z=16&title=${q}` : null;
    return coords ? `osmand.geo:${coords}?q=${coords}(${q})` : `osmand.geo:0,0?q=${q}`;
  }
  if (app === 'google') return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords ?? label)}`;
  if (app === 'apple' || (app === 'system' && platform === 'ios'))
    return `https://maps.apple.com/?q=${q}${coords ? `&ll=${coords}` : ''}`;
  if (platform === 'android') return coords ? `geo:${coords}?q=${coords}(${q})` : `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords ?? label)}`;
}

/** Read the preference at tap time so every map action follows the latest Settings choice. */
export async function openInMaps(label: string, latitude?: number | null, longitude?: number | null): Promise<void> {
  const url = mapUrl(getSettings().mapApp, Platform.OS, label, latitude, longitude);
  if (!url) {
    Alert.alert(tr('mapLinks.coordinatesNeeded'), tr('mapLinks.coordinatesHint'));
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(tr('mapLinks.couldNotOpen'), tr('mapLinks.chooseAnotherApp'));
  }
}
