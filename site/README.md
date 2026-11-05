# site/

Static pages for the app stores: privacy policy, support and account deletion, each in German (source wording), English and Japanese. Plain HTML and one CSS file; no build step, no scripts, no external fonts.

- `index.html`: language chooser
- `de/`, `en/`, `ja/`: `privacy.html`, `support.html`, `delete-account.html`
- `style.css`: shared, light and dark through `prefers-color-scheme`

Published with GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that changes `site/`. Base URL: `https://<owner>.github.io/<repo>/`. URLs for the store forms:

| Form field                               | URL                                 |
| ---------------------------------------- | ----------------------------------- |
| Privacy policy (Play, App Store Connect) | `<base>/en/privacy.html` (+ de, ja) |
| Support URL (App Store Connect)          | `<base>/en/support.html`            |
| Account deletion link (Play Data safety) | `<base>/en/delete-account.html`     |

Before publishing, resolve every `TODO` HTML comment in the pages (`grep -rn "TODO" site`): controller and postal address, real `privacy@` and `support@` addresses, the GitHub issues URL, and the points marked `TODO verify`. Keep the privacy policy in line with [docs/TELEMETRY.md](../docs/TELEMETRY.md) and the App Privacy / Data safety forms. All three languages change together; German is the source.
