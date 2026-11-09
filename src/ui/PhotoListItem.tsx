import { FieldGroup, ListItem } from '@expo/ui';
import { Children, Fragment, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { Image } from '@/api/schemas';
import { firstImage } from '@/data/images';

import type { PhotoRowProps } from './PhotoCard';
import { PhotoRow } from './PhotoRow';
import { useRegularWidth } from './regularWidth';
import { Sub } from './Sub';

export type PhotoListItemProps = {
  key: string;
  /** The list's row colours (`useRowTheme().listColors`), for the row without a photo. */
  colors: ComponentProps<typeof ListItem>['colors'];
  images?: Image[] | null;
  /** A photo URL that isn't an `Image` (search hits). */
  imageUrl?: string | null;
  icon: ReactElement;
  title: string;
  subtitle?: string | null;
  subtitleColor?: string;
  onPress?: () => void;
};

/**
 * A list row for something that may have a photo: with one, a card with the photo across the top and the name and
 * details below (DESIGN.md → Photo Row), because the photo is what makes a place somewhere to go. Without one it is
 * the usual row with its tinted type icon. The primary photo, else the first (`firstImage`).
 *
 * A function, not a component: list sections style the rows they are given by their type (Android's `FieldGroup`
 * only gives a `ListItem` its row shape), so the section must receive the `ListItem` or `PhotoRow` itself.
 */
export function photoListItem({
  key,
  colors,
  images,
  imageUrl,
  icon,
  title,
  subtitle,
  subtitleColor,
  onPress,
}: PhotoListItemProps) {
  const url = imageUrl ?? firstImage(images)?.image;
  if (url) return <PhotoRow key={key} cards={[{ url, title, subtitle, subtitleColor, onPress }]} />;
  return (
    <ListItem
      key={key}
      colors={colors}
      leading={icon}
      supportingText={subtitle ? <Sub color={subtitleColor}>{subtitle}</Sub> : undefined}
      onPress={onPress}>
      {title}
    </ListItem>
  );
}

/** How many photo cards share a row: two in a regular-width iPad window, else one. */
export function usePhotoColumns(): number {
  return useRegularWidth() ? 2 : 1;
}

/**
 * The rows of a list section, with consecutive photo rows paired into `columns` columns (two on iPad). A row
 * without a photo (a note, "Edit day") ends the run, so the order still reads top to bottom; an odd card keeps its
 * share of the width. With one column the rows pass through unchanged.
 */
export function photoGrid(children: ReactNode, columns: number): ReactNode[] {
  const rows = Children.toArray(children);
  if (columns < 2) return rows;
  const out: ReactNode[] = [];
  let run: { key: string; card: PhotoRowProps }[] = [];
  const flush = () => {
    for (let i = 0; i < run.length; i += columns) {
      const group = run.slice(i, i + columns);
      out.push(<PhotoRow key={group.map((g) => g.key).join('|')} cards={group.map((g) => g.card)} columns={columns} />);
    }
    run = [];
  };
  for (const row of rows) {
    const single =
      isValidElement<{ cards: PhotoRowProps[]; columns?: number }>(row) &&
      row.type === PhotoRow &&
      row.props.cards.length === 1 &&
      !row.props.columns;
    if (single) run.push({ key: String(row.key), card: row.props.cards[0] });
    else {
      flush();
      out.push(row);
    }
  }
  flush();
  return out;
}

/** The section's children, with fragments (and the arrays in them) opened up. */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

const isPhotoRow = (node: ReactNode) => isValidElement(node) && node.type === PhotoRow;
const isSlot = (node: ReactNode) =>
  isValidElement(node) && (node.type === FieldGroup.SectionHeader || node.type === FieldGroup.SectionFooter);

/**
 * A list section that may hold photo cards (DESIGN.md → Photo Row). On iOS it is one section, the cards in it as
 * rows. On Android a Material section draws every row that isn't a plain `ListItem` inside a padded row of its own,
 * so the section is split around the cards: plain rows stay in sections, cards sit between them in the page's list
 * (`RefreshableFieldGroup`, which leaves them alone). The title or header goes with the first piece; a run of cards
 * at the start gets a section with only the title.
 */
export function photoSection(
  { key, title }: { key: string; title?: string },
  children: ReactNode,
  columns: number,
): ReactNode[] {
  const all = flatten(children);
  const rows = photoGrid(
    all.filter((c) => !isSlot(c)),
    columns,
  );
  const header = all.filter((c) => isValidElement(c) && c.type === FieldGroup.SectionHeader);
  const footer = all.filter((c) => isValidElement(c) && c.type === FieldGroup.SectionFooter);
  if (Platform.OS !== 'android' || !rows.some(isPhotoRow))
    return [
      <FieldGroup.Section key={key} title={title}>
        {header}
        {rows}
        {footer}
      </FieldGroup.Section>,
    ];
  const out: ReactNode[] = [];
  let plain: ReactNode[] = [];
  let first = true;
  const flush = (force = false) => {
    if (!plain.length && !(force && first && (title || header.length))) return;
    out.push(
      <FieldGroup.Section key={`${key}-${out.length}`} title={first ? title : undefined}>
        {first ? header : null}
        {plain}
      </FieldGroup.Section>,
    );
    first = false;
    plain = [];
  };
  for (const row of rows) {
    if (isPhotoRow(row)) {
      flush(true);
      out.push(row);
    } else plain.push(row);
  }
  flush();
  if (footer.length) out.push(<FieldGroup.Section key={`${key}-footer`}>{footer}</FieldGroup.Section>);
  return out;
}
