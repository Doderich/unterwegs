import { Icon, Row, Column } from '@expo/ui';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';

import type { Image } from '@/api/schemas';

import { icons, type IconKey } from './icons';
import { ResourceGallery } from './ResourceGallery';
import type { RowTheme } from './rows';
import { Text } from './Text';
import { typeScale } from './typeScale';

/**
 * Top of a detail screen: the photos as a gallery, then the title and a short context line on
 * the card's solid surface. Without photos a compact icon + title, never an empty image frame.
 * Returns FieldGroup section children.
 */
export function resourceHeaderRows(
  t: RowTheme,
  {
    images,
    title,
    subtitle,
    icon,
    collectionId,
    ratio,
  }: {
    images: Image[];
    title: string;
    subtitle?: string | null;
    icon: IconKey;
    collectionId?: string;
    /** Fixed width ÷ height; default: the screen-dependent frame. */
    ratio?: number;
  },
): ReactElement[] {
  const titleText = (
    <Text key="title" textStyle={{ ...typeScale.title, color: t.colors.text }}>
      {title}
    </Text>
  );
  const sub = subtitle ? (
    <Text key="subtitle" textStyle={{ ...typeScale.supporting, color: t.colors.secondary }}>
      {subtitle}
    </Text>
  ) : null;

  const caption = (
    <Column key="title" spacing={4} alignment="start">
      {titleText}
      {sub}
    </Column>
  );
  if (images.length > 0) {
    const gallery = (
      <ResourceGallery key="gallery" images={images} title={title} collectionId={collectionId} ratio={ratio} />
    );
    // iOS: gallery edge to edge as its own row of the card. Android wraps every child in its own surface, so
    // photo and title share one child there to stay one card.
    return Platform.OS === 'ios'
      ? [gallery, caption]
      : [
          <Column key="header" spacing={12} alignment="start">
            {gallery}
            {caption}
          </Column>,
        ];
  }

  return [
    <Row key="title" spacing={12} alignment="center">
      <Icon name={icons[icon]} size={28} color={t.colors.tint} />
      <Column spacing={4} alignment="start">
        {titleText}
        {sub}
      </Column>
    </Row>,
  ];
}
