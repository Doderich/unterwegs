import { ListItem } from '@expo/ui';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import type { Attachment } from '@/api/schemas';
import type { CollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';

import type { useActionSheet } from './ActionSheet';
import { RowIcon, switchRow, type RowTheme } from './rows';
import { Sub } from './Sub';
import type { useTextPrompt } from './TextPrompt';

import { starsLabel } from './formValues';

export {
  currencyOptions,
  defaultCurrency,
  nextDate,
  parsePrice,
  parseTags,
  ratingStars,
  starsLabel,
} from './formValues';

/** Options for a rating select: "Keine Bewertung" (`'0'`) and 1–5 stars. Call at render time. */
export function ratingOptions() {
  return [
    { value: '0', label: tr('forms.noRating') },
    ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: starsLabel(n)! })),
  ];
}

/** Attachments in an edit form: tap for rename / delete. */
export function attachmentEditRows(
  t: RowTheme,
  attachments: Attachment[],
  sheet: ReturnType<typeof useActionSheet>,
  prompt: ReturnType<typeof useTextPrompt>,
  edits: CollectionEdits,
): ReactElement[] {
  return attachments.map((a) => {
    const name = a.name || a.file.split('/').pop() || tr('common.attachment');
    return (
      <ListItem
        key={a.id}
        colors={t.listColors}
        leading={<RowIcon name={a.extension === 'pdf' ? 'pdf' : 'file'} />}
        supportingText={a.extension ? <Sub>{a.extension.toUpperCase()}</Sub> : undefined}
        onPress={() =>
          sheet.open(name, [
            {
              label: tr('common.rename'),
              icon: 'edit',
              onPress: () =>
                prompt.open({
                  title: tr('forms.renameAttachment'),
                  value: a.name ?? '',
                  onSave: (v) => edits.renameAttachment(a.id, v),
                }),
            },
            {
              label: tr('common.delete'),
              icon: 'delete',
              destructive: true,
              onPress: () =>
                Alert.alert(tr('common.deleteNameConfirm', { name }), tr('common.cantUndone'), [
                  { text: tr('common.cancel'), style: 'cancel' },
                  { text: tr('common.delete'), style: 'destructive', onPress: () => void edits.deleteAttachment(a.id) },
                ]),
            },
          ])
        }>
        {name}
      </ListItem>
    );
  });
}

/** "Öffentlich" switch for one object; the collection's own setting is passed on to its objects when it changes. */
export function publicRow(t: RowTheme, value: boolean, onChange: (v: boolean) => void): ReactElement {
  return switchRow(t, {
    label: tr('common.public'),
    hint: tr('forms.visibleOnWebsiteWithoutSigning'),
    value,
    onChange,
  });
}
