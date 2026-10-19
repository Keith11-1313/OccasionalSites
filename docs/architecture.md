# Architecture

## Source map

| Path | Responsibility |
|---|---|
| `index.html` | Collection page, generated site cards, count and footer links |
| `mcuarchive/index.html` | MCU layout, loading, fallback, cards, episodes and optimistic saves |
| `mcuarchive/checklist.json` | Authoritative catalog, episode metadata and audience snapshots |
| `textfix/index.html`, `style.css` | TextFix page structure and responsive styling |
| `textfix/transforms.js` | Pure transformation registry |
| `textfix/app.js` | Editor state and browser interactions |
| `netlify/functions/checklist.mjs` | Netlify entry point and store selection |
| `netlify/lib/checklist.mjs` | Shared API handler, validation and storage operations |
| `netlify/data/initial-progress.json` | Recovered progress baseline |
| `scripts/build-sites.js` | Static publishing and site discovery |
| `scripts/*.test.*` | Automated checks |
| `netlify.toml` | Deployment configuration and legacy redirects |

## Build and landing page

The build deletes and recreates the repository's `dist/`, copies the root page and wordmark images, discovers eligible site folders, and sorts generated catalog entries by title. Each site entry includes its name, route and declared favicon. Root documentation is not copied because it is not a discovered site.

The landing page fetches `/sites.json` and uses it for cards, site counts and footer links. Previews are lazy, visual-only iframes. Loading an MCU preview can also load its checklist API and remote visual assets; the preview is not a static screenshot.

## MCU data flow

The browser requests `GET /.netlify/functions/checklist`. The Function combines bundled catalog metadata with strongly consistent Blobs values. Each title and episode has its own `progress/<id>` key. Absent values inherit the migration baseline, then default to false. An explicit saved false takes precedence.

A checkbox sends only its ID and boolean state. Different entries write different keys; simultaneous writes to the same entry use the last successful write. Other browsers update on refresh, without live subscriptions. GET reads one key per title and episode: currently 255 reads per successful full checklist request.

The store is site-wide and survives deployments. Production uses `mcu-progress`; other deployment contexts use `mcu-progress-preview`. The standalone preview script instead uses `mcu-preview` in `.netlify/preview-blobs`.

## Network and privacy boundaries

MCU Archive loads Google Fonts and remote poster images. Its catalog includes source URLs and cached Rotten Tomatoes audience totals; visitor loads do not fetch Rotten Tomatoes ratings. API responses explicitly use `cache-control: no-store`. If progress fails, the page attempts the static catalog and disables editing rather than presenting fallback states as saved progress.

TextFix's application code performs text processing locally without a backend or external API calls. Favorites, a saved recipe and optional drafts use origin-local browser storage. The collection page itself loads local site previews.

Legacy `.env` files and ignored `.migration/` research or backups are outside the publish output. Files placed inside public site folders are copied unless hidden or explicitly excluded by the build.
