# OccasionalSites

Small static sites hosted on Netlify. MCU Archive has one public, shared checklist with persistent progress in Netlify Blobs. Anyone can change the shared checkmarks without an account.

## Build and deploy

Use Node.js 22.12 or later:

```powershell
npm ci
npm test
npm run build
```

Netlify builds with `node scripts/build-sites.js` and publishes `dist/`. Deploy the repository through Netlify so it installs dependencies and bundles the Function; uploading only `dist/` does not include the backend. Netlify supplies Blobs credentials automatically. No JSONStorage environment variables are required; old variables may be removed after verifying the deployed migration.

To test the whole site locally, run `npx netlify dev` after installing dependencies. Local Blobs data is separate from production. Opening HTML directly or serving only static files cannot save progress.

## MCU checklist storage

- `mcuarchive/checklist.json`: authoritative catalog with stable IDs, original ordering, phases, titles, years, optional flags and posters. Add new movies here with unique IDs. New movies default to unchecked.
- `netlify/data/initial-progress.json`: recovered JSONStorage snapshot: 61 entries, 24 watched. This is the initial baseline, not a live copy of progress. Keep it so untouched movies retain their migrated state.
- `netlify/functions/checklist.mjs`: opens the site-wide `mcu-progress` store with strong consistency. Preview and local contexts use `mcu-progress-preview`, protecting production progress.
- `netlify/lib/checklist.mjs`: validates requests, reads progress, and saves one boolean per `progress/<movie-id>` key. Missing keys use the recovered baseline. Saved `false` overrides a previously watched baseline. Reads never overwrite saved data; builds and deployments never reset it.

Site-wide stores persist across deployments. Same-entry simultaneous saves use the last successful write; different movies and episodes have independent keys. Other open browsers see changes when refreshed, not in real time. Each checklist GET reads one key per title and episode; consider request volume and your Netlify usage allowance as traffic grows.

`GET /.netlify/functions/checklist` returns the catalog with saved `done` values. `PUT` to the same endpoint accepts exactly:

```json
{ "id": "p2-05", "done": true }
```

Only existing IDs and boolean states are accepted. For a series, send the episode ID (for example `p4-02-e01`). Season-level writes are rejected; season completion is derived from all episodes. A legacy season-level `true` is inherited by episodes until individually overridden. Unreleased entries are rejected by the server as well as disabled in the page. Episode release dates use the Asia/Manila calendar date. Visitors cannot edit catalog metadata. Success returns `{ "ok": true, "item": { "id": "p2-05", "done": true } }`. Validation errors use 400/404, unsupported methods 405, rate limits 429, and storage failures 502. The per-IP in-memory limit is 60 GETs or 30 PUTs per minute per function instance, not a distributed global limit.

## Catalog and community scores

The catalog update of 19 October 2026 adds eight previously missing entries, for 69 titles and 26 series/seasons. Movies, specials, and seasons retain stable IDs. Each series has expandable episode checkboxes and a watched count. Future VisionQuest episodes show their release dates. Upcoming films remain listed but cannot be marked watched.

The display-only audience strip shows Rotten Tomatoes All Audience totals: a red negative count for `notLiked` and a green positive count for `liked`. All 67 released titles/seasons have verified snapshots; the two upcoming films show N/A. Source URLs remain in the catalog; cards show only the red negative count on the left and the green positive count on the right. The tooltip records the snapshot date. These are audience rating totals, not Reddit votes or critic scores. They are stored in the catalog, so visitor page loads do not contact Rotten Tomatoes. Refresh manually with `node scripts/refresh-audience-ratings.mjs`, review `.migration/audience-research.json`, then run `node scripts/refresh-audience-ratings.mjs --apply` and rebuild. The importer refuses to apply incomplete/unverified data. `--missing` retries only failed entries. The catalog note above the checklist has been removed.

If progress cannot load, the page displays the static catalog with checkboxes disabled and progress marked unavailable. Failed saves restore the prior checkbox state. Refresh to retry loading progress.

The migration recovered JSONStorage successfully before removing the runtime dependency. The original recovery backup is in ignored `.migration/checklist-backup.json`; it is not published. No import command or production token is needed: recovered baseline values apply until each movie has a saved Blobs value.

## Add a site

## TextFix

`/textfix/` is a browser-only text workshop with 82 transformations across case, cleanup, lines, indentation, characters, extraction and formatting. It includes selection-aware transformations, undo/redo, find/replace (including regular expressions), favorites, saved recipes, text insights, before/after comparison, text-file import/export, dark mode and an expanded editor. No backend or external requests are used. Draft saving is opt-in and stored only in this browser; disabling it removes the saved draft. Favorites and recipes are also device-local. Imported files are limited to 5 MB.

Use Tool options for separators, line filters, prefixes/suffixes, indentation and wrapping. Search spans all categories. Recipe mode queues tools in order, applies them as one undoable change, and can save one recipe with its options. Case conversions and smart quotes are mechanical; review proper nouns and punctuation. Indentation normalizes whitespace rather than parsing code. Extraction uses patterns and is not a full email or URL validator. JSON formatting uses JavaScript JSON parsing, so numbers beyond JavaScript's safe integer precision need special care.

Implementation: `textfix/index.html`, `style.css`, `transforms.js` (pure transformations) and `app.js` (editor interaction). `npm test` includes transformation checks in `scripts/textfix.test.cjs`.

### Adding another site

Create a top-level folder with an `index.html` and rebuild. The build discovers site folders, copies static assets, and generates `dist/sites.json` for the landing page. It excludes environment files, backend sources, scripts, dependencies, and hidden directories.

Sites needing persistence can have their own Function and separate Blobs store. Static sites need no store.

## Verification

`npm test` uses the Netlify Blobs SDK and its local server to verify recovered progress, concurrent movie and episode changes, persistence across a server restart, legacy season migration, validation, future-release rejection, rate limits, and storage failures. These checks do not deploy or access production. `node scripts/preview-mcu.mjs` serves the built site at port 8890 with a separate local Blobs store for browser checks.

After deploying, check/uncheck a movie, refresh, reopen in another browser, and verify the same state. Verify preview changes leave production untouched. Live deployment and browser checks are separate from local tests.

Release labels show the full movie release date or season premiere date. Dates use the source listed in each catalog entry; older title dates were checked against Rotten Tomatoes on 19 October 2026. Series use the Season Info release date, not the review module date (which can reflect a finale or later season). Existing full-date labels are retained.
