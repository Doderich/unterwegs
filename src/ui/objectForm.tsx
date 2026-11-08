import { FieldGroup, ListItem } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';

import type { Attachment } from '@/api/schemas';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';

import type { useActionSheet } from './ActionSheet';
import { attachmentEditRows, currencyOptions, publicRow, ratingOptions } from './forms';
import { RowIcon, type RowTheme } from './rows';
import { useSelect } from './Select';
import type { useTextPrompt } from './TextPrompt';
import type { Colors } from './theme';
import { Text } from './Text';
import { TextInput } from './TextInput';

/** Currency row shared by the Lodging, Transportation and Location editors. */
export function useCurrencySelect(t: RowTheme, currency: string, onChange: (currency: string) => void) {
  return useSelect(t, {
    title: tr('common.currency'),
    label: tr('common.currency'),
    value: currency,
    onChange,
    options: currencyOptions(currency),
  });
}

/** Rating row shared by the Lodging and Transportation editors. `'0'` clears it. */
export function useRatingSelect(t: RowTheme, rating: number, onChange: (rating: number) => void) {
  return useSelect(t, {
    title: tr('common.rating'),
    label: tr('common.rating'),
    value: String(rating),
    onChange: (value) => onChange(Number(value)),
    options: ratingOptions(),
  });
}

/** Price, its currency and a link. `leading` is a booking number or whatever belongs above the price. */
export function priceLinkFields({
  leading,
  price,
  onPrice,
  pricePlaceholder,
  currencyRow,
  link,
  onLink,
}: {
    leading?: ReactNode;
    price: string;
    onPrice: (price: string) => void;
    pricePlaceholder: string;
    currencyRow: ReactElement;
    link: string;
    onLink: (link: string) => void;
  },
) {
  return (
    <>
      {leading}
      <TextInput
        defaultValue={price}
        onChangeText={onPrice}
        placeholder={pricePlaceholder}
        keyboardType="decimal-pad"
      />
      {currencyRow}
      <TextInput
        defaultValue={link}
        onChangeText={onLink}
        placeholder={tr('common.linkHttps')}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </>
  );
}

type Sheet = ReturnType<typeof useActionSheet>;
type Prompt = ReturnType<typeof useTextPrompt>;

/** Attachments of an object that already exists, with the upload row. */
export function attachmentEditSection(
  t: RowTheme,
  title: string,
  attachments: Attachment[],
  sheet: Sheet,
  prompt: Prompt,
  edits: CollectionEdits,
  fileRows: ReactNode,
) {
  return (
    <FieldGroup.Section title={title}>
      {attachmentEditRows(t, attachments, sheet, prompt, edits)}
      {fileRows}
    </FieldGroup.Section>
  );
}

/** The danger row that asks, then deletes the object and leaves its detail screen. */
export function deleteEditRow(t: RowTheme, colors: Colors, label: string, onPress: () => void) {
  return (
    <ListItem
      colors={{ ...t.listColors, contentColor: colors.danger }}
      leading={<RowIcon name="delete" color={colors.danger} />}
      onPress={onPress}>
      <Text textStyle={{ color: colors.danger }}>{label}</Text>
    </ListItem>
  );
}

/**
 * The tail every Collection object editor shares: public, an optional rating, notes, attachments once the object
 * exists, and delete. `extra` sits with delete (duplicating a Location).
 */
export function objectEditorTail(
  t: RowTheme,
  colors: Colors,
  {
    isPublic,
    onPublic,
    ratingRow,
    notes,
    attachments,
    attachmentTitle,
    sheet,
    prompt,
    edits,
    fileRows,
    deleteLabel,
    onDelete,
    extra,
  }: {
    isPublic: boolean;
    onPublic: (value: boolean) => void;
    ratingRow?: ReactNode;
    notes?: ReactNode;
    attachments: Attachment[] | null;
    attachmentTitle: string;
    sheet: Sheet;
    prompt: Prompt;
    edits: CollectionEdits;
    fileRows: ReactNode;
    deleteLabel?: string;
    onDelete?: () => void;
    extra?: ReactNode;
  },
) {
  return (
    <>
      <FieldGroup.Section title={tr('common.visibility')}>{publicRow(t, isPublic, onPublic)}</FieldGroup.Section>
      {ratingRow ? <FieldGroup.Section title={tr('common.rating')}>{ratingRow}</FieldGroup.Section> : null}
      {notes ? <FieldGroup.Section title={tr('common.notes')}>{notes}</FieldGroup.Section> : null}
      {attachments
        ? attachmentEditSection(t, attachmentTitle, attachments, sheet, prompt, edits, fileRows)
        : null}
      {extra || onDelete ? (
        <FieldGroup.Section>
          {extra}
          {onDelete && deleteLabel ? deleteEditRow(t, colors, deleteLabel, onDelete) : null}
        </FieldGroup.Section>
      ) : null}
    </>
  );
}
