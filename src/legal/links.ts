import { getLanguage } from '@/i18n';

/** The store pages in `site/`, published by `.github/workflows/pages.yml`. */
const SITE = 'https://doderich.github.io/unterwegs';

export function privacyPolicyUrl(): string {
  return `${SITE}/${getLanguage()}/privacy.html`;
}
