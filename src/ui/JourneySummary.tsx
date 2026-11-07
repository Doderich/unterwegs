import { Column, Icon, Row } from '@expo/ui';
import type { ReactElement } from 'react';

import type { Transportation } from '@/api/schemas';
import { tr } from '@/i18n';

import { icons, transportIcon } from './icons';
import { dayShiftLabel, journey, type JourneyEnd } from './journey';
import type { RowTheme } from './rows';
import { Text } from './Text';
import { typeScale } from './typeScale';

/**
 * Departure and arrival as one journey: each end with its time, place, date and own zone, the travel time
 * between. Stacked vertically so it holds up at the largest text sizes. Returns FieldGroup section children.
 */
export function journeyRows(t: RowTheme, j: Transportation, collectionZone: string): ReactElement[] {
  const { from, to, dayShift, duration } = journey(j, collectionZone);

  const end = (key: string, e: JourneyEnd, extra: string | null) => (
    <Column key={key} spacing={4} alignment="start">
      <Text textStyle={{ ...typeScale.figure, color: t.colors.text }}>{extra ? `${e.time} ${extra}` : e.time}</Text>
      {e.place ? <Text textStyle={{ ...typeScale.bodyStrong, color: t.colors.text }}>{e.place}</Text> : null}
      {e.context ? <Text textStyle={{ ...typeScale.supporting, color: t.colors.secondary }}>{e.context}</Text> : null}
    </Column>
  );

  // One child: Android would otherwise draw each part as its own card.
  return [
    <Column key="journey" spacing={12} alignment="start">
      {end('from', from, null)}
      <Row key="via" spacing={8} alignment="center">
        <Icon name={icons[transportIcon(j.type)]} size={20} color={t.colors.tint} />
        <Text textStyle={{ ...typeScale.supporting, color: t.colors.secondary }}>
          {duration || tr('journeySummary.journey')}
        </Text>
      </Row>
      {end('to', to, dayShiftLabel(dayShift))}
    </Column>,
  ];
}
