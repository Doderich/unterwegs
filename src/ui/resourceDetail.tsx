import { FieldGroup } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';

import type { Attachment } from '@/api/schemas';
import { tr } from '@/i18n';

import { formatPrice } from './format';
import { starsLabel } from './forms';
import { attachmentRows, infoRow, type RowTheme, useOpenAttachment } from './rows';

type Opener = ReturnType<typeof useOpenAttachment>;

/** Price and stars, or nothing when the object has neither. */
export function priceStarsSection(
  t: RowTheme,
  price: { amount: string | number | null | undefined; currency: string | null | undefined },
  rating: number | null | undefined,
) {
  const priceLabel = formatPrice(price.amount, price.currency);
  const stars = starsLabel(rating);
  if (!priceLabel && !stars) return null;
  return (
    <FieldGroup.Section title={tr('common.details')}>
      {stars ? infoRow(t, { icon: 'star', label: tr('common.rating'), value: stars }) : null}
      {priceLabel ? infoRow(t, { icon: 'price', label: tr('common.price'), value: priceLabel }) : null}
    </FieldGroup.Section>
  );
}

/**
 * Attachments, plus the upload row when the reader may add one. Hidden when there is nothing to show and nothing
 * to add, so an empty editable object still offers "Datei anhängen".
 */
export function filesSection(
  t: RowTheme,
  opener: Opener,
  title: string,
  attachments: Attachment[],
  fileRows: ReactElement[] = [],
) {
  if (attachments.length === 0 && fileRows.length === 0) return null;
  return (
    <FieldGroup.Section title={title}>
      {attachmentRows(t, attachments, opener)}
      {fileRows}
    </FieldGroup.Section>
  );
}

/** Price and stars, then notes, then files. The object's own middle stays with the caller. */
export function detailExtras(
  t: RowTheme,
  opener: Opener,
  {
    price,
    rating,
    notes,
    attachments,
    attachmentTitle,
    fileRows,
  }: {
    price: { amount: string | number | null | undefined; currency: string | null | undefined };
    rating: number | null | undefined;
    notes: ReactNode;
    attachments: Attachment[];
    attachmentTitle: string;
    fileRows: ReactElement[];
  },
) {
  return (
    <>
      {priceStarsSection(t, price, rating)}
      {notes ? <FieldGroup.Section title={tr('common.notes')}>{notes}</FieldGroup.Section> : null}
      {filesSection(t, opener, attachmentTitle, attachments, fileRows)}
    </>
  );
}
