# site/

Static pages for the app stores: privacy policy, support and account deletion, each in German (source wording), English and Japanese. Plain HTML and one CSS file; no build step, no scripts, no external fonts.

- `index.html`: language chooser
- `de/`, `en/`, `ja/`: `privacy.html`, `support.html`, `delete-account.html`
- `style.css`: shared, light and dark through `prefers-color-scheme`

Published with GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that changes `site/`. Base URL: `https://doderich.github.io/unterwegs/`. URLs for the store forms:

| Form field                               | URL                                 |
| ---------------------------------------- | ----------------------------------- |
| Privacy policy (Play, App Store Connect) | `<base>/en/privacy.html` (+ de, ja) |
| Support URL (App Store Connect)          | `<base>/en/support.html`            |
| Account deletion link (Play Data safety) | `<base>/en/delete-account.html`     |

## Contact placeholders

The pages carry three literal tokens instead of personal details, because the repository is anonymous. The `pages` workflow replaces them in the published copy from GitHub repository variables:

| Token                    | Repository variable  | Content                                                                  |
| ------------------------ | -------------------- | ------------------------------------------------------------------------ |
| `__CONTROLLER_NAME__`    | `CONTROLLER_NAME`    | Name of the person responsible (privacy policy, section 1)               |
| `__CONTROLLER_ADDRESS__` | `CONTROLLER_ADDRESS` | Postal address on one line, for example "street, postcode city, Germany" |
| `__CONTACT_EMAIL__`      | `CONTACT_EMAIL`      | One address for privacy requests and private support matters (`mailto:`) |

Never write the real values into the repository. Public support goes through [GitHub Issues](https://github.com/Doderich/unterwegs/issues).

## Keeping the pages true

Keep the privacy policy in line with [docs/TELEMETRY.md](../docs/TELEMETRY.md) and the App Privacy / Data safety forms. All three languages change together; German is the source.

Server-side account deletion (`POST /auth/delete-account`) was verified from the AdventureLog source code only, not against a real account ([docs/SERVER.md](../docs/SERVER.md)). The update server (xprem) documents no automatic retention for device records, so the privacy policy states manual review and deletion on request; if that changes, update section 3 of the policy.
