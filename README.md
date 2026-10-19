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

Site-wide stores persist across deployments. Same-movie simultaneous saves use the last successful write; different movies have independent keys. Other open browsers see changes when refreshed, not in real time. Each checklist GET currently reads 61 keys; consider request volume and your Netlify usage allowance as traffic grows.

`GET /.netlify/functions/checklist` returns the catalog with saved `done` values. `PUT` to the same endpoint accepts exactly:

```json
{ "id": "p2-05", "done": true }
```

Only existing IDs and boolean states are accepted. Visitors cannot edit catalog metadata. Success returns `{ "ok": true, "item": { "id": "p2-05", "done": true } }`. Validation errors use 400/404, unsupported methods 405, rate limits 429, and storage failures 502. The per-IP in-memory limit is 60 GETs or 30 PUTs per minute per function instance, not a distributed global limit.

If progress cannot load, the page displays the static catalog with checkboxes disabled and progress marked unavailable. Failed saves restore the prior checkbox state. Refresh to retry loading progress.

The migration recovered JSONStorage successfully before removing the runtime dependency. The original recovery backup is in ignored `.migration/checklist-backup.json`; it is not published. No import command or production token is needed: recovered baseline values apply until each movie has a saved Blobs value.

## Add a site

Create a top-level folder with an `index.html` and rebuild. The build discovers site folders, copies static assets, and generates `dist/sites.json` for the landing page. It excludes environment files, backend sources, scripts, dependencies, and hidden directories.

Sites needing persistence can have their own Function and separate Blobs store. Static sites need no store.

## Verification

`npm test` uses the Netlify Blobs SDK and its local server to verify recovered progress, concurrent different-movie changes, persistence across a server restart, validation, rate limits, and storage failures. These checks do not deploy or access production.

After deploying, check/uncheck a movie, refresh, reopen in another browser, and verify the same state. Verify preview changes leave production untouched. Live deployment and browser checks are separate from local tests.
