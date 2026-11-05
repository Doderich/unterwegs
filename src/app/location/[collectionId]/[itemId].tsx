import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import type { Visit } from '@/api/schemas';
import { useCollectionView, useIntegrations } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { locationZone, viewToday, type Day, type CollectionView } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { sunTimes } from '@/time/sun';
import { formatDayLabel, formatDuration, formatTime, localDate, visitTime } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { formatDistance, formatPrice } from '@/ui/format';
import { ratingOptions, ratingStars } from '@/ui/forms';
import { androidToolbarIcon } from '@/ui/icons';
import { useMediaUploads } from '@/ui/media';
import {
  attachmentRows,
  infoRow,
  linkRows,
  mapsRow,
  openUrl,
  RowIcon,
  useOpenAttachment,
  useRowTheme,
} from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { parseServerDuration } from '@/ui/formValues';
import { sportLabel } from '@/ui/sports';
import { useTextPrompt } from '@/ui/TextPrompt';
import { safeFileName, useServerFile } from '@/ui/serverFile';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { resourceHeaderRows } from '@/ui/ResourceHeader';

export default function LocationScreen() {
  const { collectionId, itemId } = useLocalSearchParams<{ collectionId: string; itemId: string }>();
  const { view } = useCollectionView(collectionId);
  const colors = useColors();
  const rt = useRowTheme();
  const opener = useOpenAttachment();
  const edits = useCollectionEdits(view);
  const sheet = useActionSheet(rt);
  const location = view?.collection.locations.find((l) => l.id === itemId);
  const descriptionRows = useDescriptionRows(rt, location?.description);
  const media = useMediaUploads(rt, edits, sheet, 'location', itemId, location?.name);
  const integrations = useIntegrations();
  const online = useOnline();
  const serverFile = useServerFile();
  const prompt = useTextPrompt(rt);
  const rating = ratingStars(location?.rating);
  const ratingSelect = useSelect(rt, {
    title: tr('common.rating'),
    value: String(rating),
    options: ratingOptions(),
    onChange: (v) => location && void edits.rate(location, v === '0' ? null : Number(v)),
  });
  if (!view || !location) return null;

  const plannedDays = view.days.filter((d) =>
    d.entries.some((e) => e.kind === 'location' && e.location.id === location.id),
  );
  const schedule = locationSchedule(view, plannedDays, location.visits);
  const category = location.category
    ? `${location.category.icon ?? ''} ${location.category.display_name ?? location.category.name}`.trim()
    : null;
  const meta = [category, location.is_visited ? tr('common.visited') : null].filter(Boolean).join(' · ');
  const price = formatPrice(location.price, location.price_currency);
  const today = viewToday(view).date;
  const visitedToday = schedule.some((s) => s.date === today && s.visitId);
  const sun = sunRows(view, location.latitude, location.longitude, schedule, locationZone(view, location));
  const activities = location.visits.flatMap((v) =>
    v.activities.map((a) => ({ ...a, visitId: v.id, visitDate: v.start_date })),
  );

  /** Name, then link: the server needs a link for every trail that isn't from Wanderer. */
  const addTrail = () =>
    prompt.open({
      title: tr('location.newTrail'),
      value: '',
      placeholder: tr('location.eGPhilosophersPath'),
      onSave: (name) => {
        if (!name.trim()) return;
        // Let the first sheet close before the second opens.
        setTimeout(
          () =>
            prompt.open({
              title: tr('location.linkTrail'),
              value: '',
              placeholder: tr('location.httpsKomootAlltrails'),
              onSave: (link) =>
                /^https?:\/\/\S+$/i.test(link.trim())
                  ? edits.saveTrail(location.id, null, { name: name.trim(), link: link.trim() })
                  : Alert.alert(tr('location.linkMissing'), tr('location.trailNeedsLinkEG')),
            }),
          400,
        );
      },
    });

  const trailActions = (t: (typeof location.trails)[number]) => {
    const link = t.link ?? t.wanderer_link;
    if (!edits.online) return link ? openUrl(link) : undefined;
    sheet.open(t.name, [
      ...(link ? [{ label: tr('common.open'), icon: 'external' as const, onPress: () => openUrl(link) }] : []),
      {
        label: tr('common.rename'),
        icon: 'edit',
        onPress: () =>
          prompt.open({
            title: tr('location.renameTrail'),
            value: t.name,
            onSave: (name) => edits.saveTrail(location.id, t.id, { name }),
          }),
      },
      {
        label: link ? tr('location.changeLink') : tr('location.addLink'),
        icon: 'link',
        onPress: () =>
          prompt.open({
            title: tr('location.linkTrail'),
            value: t.link ?? '',
            placeholder: 'https://…',
            onSave: (l) =>
              /^https?:\/\/\S+$/i.test(l.trim())
                ? edits.saveTrail(location.id, t.id, { name: t.name, link: l.trim() })
                : Alert.alert(tr('location.linkMissing'), tr('location.trailNeedsLinkEG')),
          }),
      },
      {
        label: tr('common.delete'),
        icon: 'delete',
        destructive: true,
        onPress: () =>
          Alert.alert(tr('common.deleteNameConfirm', { name: t.name }), tr('common.cantUndone'), [
            { text: tr('common.cancel'), style: 'cancel' },
            { text: tr('common.delete'), style: 'destructive', onPress: () => void edits.deleteTrail(t.id) },
          ]),
      },
    ]);
  };

  const editActivity = (visitId: string, activityId?: string) =>
    router.push({
      pathname: '/activity-edit/[collectionId]',
      params: { collectionId, locationId: location.id, visitId, ...(activityId ? { activityId } : {}) },
    });
  const addActivity = () => {
    const visits = location.visits.filter((v) => v.start_date);
    if (visits.length === 1) return editActivity(visits[0].id);
    sheet.open(
      tr('location.whichVisitConfirm'),
      visits.map((v) => ({
        label: formatDayLabel(visitTime(v.start_date!, v.end_date, v.timezone ?? view.timeZone).date),
        hint: v.notes ?? undefined,
        onPress: () => editActivity(v.id),
      })),
    );
  };

  const editVisit = (visitId?: string) =>
    router.push({
      pathname: '/visit-edit/[collectionId]/[locationId]',
      params: { collectionId, locationId: location.id, ...(visitId ? { visitId } : {}) },
    });

  const plannedSection = (
    <FieldGroup.Section title={tr('location.plannedVisited')}>
      {schedule.map((s) =>
        infoRow(rt, {
          key: s.date,
          icon: s.offItinerary ? 'visit' : 'days',
          label: s.label,
          value: s.value,
          onPress: s.visitId && edits.online ? () => editVisit(s.visitId!) : undefined,
        }),
      )}
      {visitedToday || !edits.online ? null : (
        <ListItem
          colors={rt.listColors}
          leading={<RowIcon name="visit" />}
          onPress={() => void edits.addVisitToday(location)}>
          {tr('location.visitedToday')}
        </ListItem>
      )}
      {edits.online ? (
        <ListItem colors={rt.listColors} leading={<RowIcon name="add" />} onPress={() => editVisit()}>
          {tr('common.addVisit')}
        </ListItem>
      ) : null}
    </FieldGroup.Section>
  );

  return (
    <>
      <Stack.Screen options={{ title: location.category?.display_name ?? tr('common.place') }} />
      {edits.online ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() =>
              router.push({ pathname: '/location-edit/[collectionId]', params: { collectionId, itemId: location.id } })
            }>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {resourceHeaderRows(rt, {
              images: location.images,
              title: location.name,
              subtitle: meta,
              icon: 'location',
              collectionId,
            })}
            {media.photoRows}
          </FieldGroup.Section>

          {integrations.data?.immich?.exists && online ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="library" />}
                onPress={() =>
                  router.push({
                    pathname: '/immich/[collectionId]/[locationId]',
                    params: { collectionId, locationId: location.id },
                  })
                }>
                {tr('location.addPhotoFromImmich')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}

          {plannedSection}

          <FieldGroup.Section title={tr('common.place')}>
            {mapsRow(rt, {
              label: location.name,
              address: location.location,
              latitude: location.latitude,
              longitude: location.longitude,
            })}
            {online && location.latitude != null && location.longitude != null ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="nearby" />}
                onPress={() =>
                  router.push({
                    pathname: '/nearby/[collectionId]',
                    params: {
                      collectionId,
                      lat: String(location.latitude),
                      lon: String(location.longitude),
                      name: location.name,
                    },
                  })
                }>
                {tr('location.discoverNearby')}
              </ListItem>
            ) : null}
            {online ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="share" />}
                onPress={() => {
                  const share = (aspect: string) => () =>
                    void serverFile.share(
                      `/api/locations/${location.id}/share-image/${aspect}`,
                      safeFileName(`${location.name}-${aspect}`, 'png'),
                      'image/png',
                      location.name,
                    );
                  sheet.open(tr('common.shareAsImage'), [
                    { label: tr('common.square'), icon: 'image', onPress: share('square') },
                    { label: tr('common.portraitStory'), icon: 'image', onPress: share('story') },
                    { label: tr('location.landscape'), icon: 'image', onPress: share('landscape') },
                  ]);
                }}>
                {serverFile.busy ? tr('location.creatingImage') : tr('common.shareAsImage')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>

          {location.trails.length || edits.online ? (
            <FieldGroup.Section title={tr('location.trails')}>
              {location.trails.map((t) => (
                <ListItem
                  key={t.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="walk" />}
                  supportingText={
                    t.link || t.provider ? (
                      <Sub>{t.provider || t.link?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</Sub>
                    ) : undefined
                  }
                  onPress={() => trailActions(t)}>
                  {t.name}
                </ListItem>
              ))}
              {edits.online ? (
                <ListItem colors={rt.listColors} leading={<RowIcon name="add" />} onPress={addTrail}>
                  {tr('location.addTrail')}
                </ListItem>
              ) : null}
            </FieldGroup.Section>
          ) : null}

          {activities.length || (edits.online && location.visits.length) ? (
            <FieldGroup.Section title={tr('location.activities')}>
              {activities.map((a) => (
                <ListItem
                  key={a.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="walk" />}
                  supportingText={
                    <Sub>
                      {[
                        sportLabel(a.sport_type),
                        formatDistance(a.distance != null ? a.distance / 1000 : null),
                        parseServerDuration(a.moving_time)
                          ? formatDuration(Math.round(parseServerDuration(a.moving_time)! / 60))
                          : null,
                        a.elevation_gain ? `↑ ${Math.round(a.elevation_gain)} m` : null,
                        a.visitDate ? formatDayLabel(localDate(a.visitDate, view.timeZone)) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Sub>
                  }
                  onPress={() =>
                    sheet.open(a.name, [
                      ...(a.gpx_file
                        ? [
                            {
                              label: tr('location.openGpxTrack'),
                              icon: 'file' as const,
                              onPress: () =>
                                void opener.open({
                                  id: a.id,
                                  file: a.gpx_file!,
                                  name: `${a.name}.gpx`,
                                  extension: 'gpx',
                                }),
                            },
                          ]
                        : []),
                      ...(edits.online
                        ? [
                            {
                              label: tr('common.edit'),
                              icon: 'edit' as const,
                              onPress: () => editActivity(a.visitId, a.id),
                            },
                          ]
                        : []),
                    ])
                  }>
                  {a.name}
                </ListItem>
              ))}
              {edits.online && location.visits.length ? (
                <ListItem colors={rt.listColors} leading={<RowIcon name="add" />} onPress={addActivity}>
                  {tr('location.addActivity')}
                </ListItem>
              ) : null}
            </FieldGroup.Section>
          ) : null}

          {sun.length ? (
            <FieldGroup.Section title={tr('location.sun')}>
              {sun.map((s) => infoRow(rt, { key: s.date, icon: 'sun', label: s.label, value: s.value }))}
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section title={tr('common.rating')}>{ratingSelect.row}</FieldGroup.Section>

          {location.description || location.link || price ? (
            <FieldGroup.Section title={tr('location.info')}>
              {price ? infoRow(rt, { icon: 'price', label: tr('common.price'), value: price }) : null}
              {descriptionRows}
              {location.link ? linkRows(rt, { label: tr('common.website'), url: location.link }) : null}
            </FieldGroup.Section>
          ) : null}

          {location.tags?.length ? (
            <FieldGroup.Section title={tr('location.tags')}>
              <Text textStyle={{ color: colors.secondary }}>{location.tags.join(' · ')}</Text>
            </FieldGroup.Section>
          ) : null}

          {location.attachments.length > 0 || media.fileRows.length > 0 ? (
            <FieldGroup.Section title={tr('common.attachments')}>
              {attachmentRows(rt, location.attachments, opener)}
              {media.fileRows}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {sheet.sheet}
      {ratingSelect.sheet}
      {prompt.sheet}
    </>
  );
}

/** The website's own placeholder for visits it creates from the itinerary. */
const GENERATED_VISIT_NOTE = 'Created from itinerary planning';

/** One row per date: itinerary days the location is on, plus visits (with time / note) on any other date. */
function locationSchedule(view: CollectionView, plannedDays: Day[], visits: Visit[]) {
  const rows = new Map<
    string,
    { date: string; label: string; value: string; offItinerary: boolean; visitId: string | null }
  >();
  for (const d of plannedDays) {
    rows.set(d.date, {
      date: d.date,
      label: tr('common.dayN', { n: d.number }),
      value: [formatDayLabel(d.date), d.name].filter(Boolean).join(' · '),
      offItinerary: false,
      visitId: null,
    });
  }
  for (const v of visits) {
    if (!v.start_date) continue;
    const t = visitTime(v.start_date, v.end_date, v.timezone ?? view.timeZone);
    const day = view.days.find((d) => d.date === t.date);
    const note = v.notes && v.notes !== GENERATED_VISIT_NOTE ? v.notes : null;
    const when = [formatDayLabel(t.date), t.endDate ? `– ${formatDayLabel(t.endDate)}` : null, t.time]
      .filter(Boolean)
      .join(' ');
    rows.set(t.date, {
      date: t.date,
      label: [day ? tr('common.dayN', { n: day.number }) : tr('common.visit'), note].filter(Boolean).join(' · '),
      value: [when, day?.name].filter(Boolean).join(' · '),
      offItinerary: !day,
      visitId: v.id,
    });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Sunrise and sunset for each date the location is planned or visited (else today), computed on the phone and
 * shown in the location's own zone (`locationZone`).
 */
function sunRows(
  view: CollectionView,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  schedule: { date: string }[],
  zone: string,
) {
  if (latitude == null || longitude == null) return [];
  const dates = schedule.length ? schedule.map((s) => s.date) : [localDate(new Date(), zone)];
  return dates.map((date) => {
    const sun = sunTimes(date, latitude, longitude);
    const value =
      sun.kind === 'normal'
        ? tr('location.sunriseRiseSunsetSet', {
            rise: formatTime(sun.sunrise, zone),
            set: formatTime(sun.sunset, zone),
          })
        : sun.kind === 'midnight-sun'
          ? tr('location.midnightSun')
          : tr('location.polarNight');
    return { date, label: formatDayLabel(date), value };
  });
}
