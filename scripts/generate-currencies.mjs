// Bundle ICU reference data so currency names work offline without Hermes Intl.DisplayNames support.
// Source: Node's bundled ICU / Unicode CLDR; https://nodejs.org/api/intl.html
import { writeFileSync } from 'node:fs';

const languages = ['de', 'en', 'ja'];
const names = Object.fromEntries(
  languages.map((language) => [language, new Intl.DisplayNames(language, { type: 'currency' })]),
);
// Use the active fiat-currency catalogue, excluding legacy currencies, metals and crypto assets.
const response = await fetch('https://api.frankfurter.dev/v2/currencies');
if (!response.ok) throw new Error(`Currency catalogue: HTTP ${response.status}`);
const active = await response.json();
const currencies = active
  .filter((entry) => entry.type === 'currency' && /^[A-Z]{3}$/.test(entry.iso_code))
  .map((entry) => entry.iso_code)
  .sort()
  .map((code) => ({
    code,
    names: Object.fromEntries(
      languages.map((language) => [
        language,
        // The code already identifies the currency; its short German name reads better here.
        language === 'de' && code === 'GTQ' ? 'Quetzal' : names[language].of(code),
      ]),
    ),
  }));
writeFileSync(new URL('../src/utilities/currencies.json', import.meta.url), JSON.stringify(currencies, null, 2) + '\n');
