import type { CategoryWithCount } from '@/api/schemas';
import { locale } from '@/i18n';

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

export function categoryLabel(c: Pick<CategoryWithCount, 'name' | 'display_name' | 'icon'>): string {
  return `${c.icon ?? ''} ${c.display_name || c.name}`.trim();
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
