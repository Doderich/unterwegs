import type { CategoryInput } from '@/api/client';
import type { CategoryWithCount } from '@/api/schemas';
import { locale } from '@/i18n';

type NamedCategory = { name: string; display_name?: string | null; icon?: string | null };

/** The server keeps one undeletable fallback category under this name. */
export const GENERAL_CATEGORY = 'general';

/**
 * Internal name for a new category, like the website's (`Sehenswürdigkeit` → `sehenswuerdigkeit`), made unique
 * among the user's categories: the server answers a duplicate name with a 500.
 */
export function categoryName(displayName: string, existing: Pick<CategoryWithCount, 'name'>[]): string {
  const base =
    displayName
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[^a-z0-9]/g, '') || 'kategorie';
  const taken = new Set(existing.map((c) => c.name));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

export function categoryLabel(c: NamedCategory): string {
  return `${c.icon ?? ''} ${c.display_name || c.name}`.trim();
}

/** Categories of this Collection first, then the user's others, then the one currently chosen. */
export function categoryChoices(
  fromCollection: NamedCategory[],
  userCategories: NamedCategory[],
  current: NamedCategory | null,
): CategoryInput[] {
  const known = new Map<string, CategoryInput>();
  const add = (c: NamedCategory) => {
    if (!known.has(c.name))
      known.set(c.name, { name: c.name, display_name: c.display_name || c.name, icon: c.icon ?? undefined });
  };
  for (const c of fromCollection) add(c);
  for (const c of userCategories) add(c);
  if (current) add(current);
  return [...known.values()];
}

/**
 * A Category typed into the Location editor. A leading emoji becomes the icon (`🍜 Essen` → 🍜, Essen). The internal
 * name is the same unique slug account settings use. Blank text is not a Category.
 */
export function categoryDraft(text: string, existing: Pick<CategoryWithCount, 'name'>[]): CategoryInput | null {
  const m = text.match(/^(\p{Extended_Pictographic}️?)\s*(.+)$/u);
  const display = (m ? m[2] : text).trim();
  if (!display) return null;
  return { name: categoryName(display, existing), display_name: display, icon: m?.[1] ?? '📍' };
}

/** Alphabetical by the shown name, "general" last. */
export function sortCategories<T extends Pick<CategoryWithCount, 'name' | 'display_name'>>(categories: T[]): T[] {
  const collator = new Intl.Collator(locale());
  return [...categories].sort((a, b) => {
    if (a.name === GENERAL_CATEGORY) return 1;
    if (b.name === GENERAL_CATEGORY) return -1;
    return collator.compare(a.display_name || a.name, b.display_name || b.name);
  });
}
