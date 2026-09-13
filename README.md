# OccasionalSites

Small static sites hosted on Netlify. The MCU Watch Log is the only dynamic site; its checklist data stays in JSONStorage behind one Netlify Edge Function. It is intentionally public and collaboratively editable without accounts or login.

## Structure

```text
index.html                  Collection landing page
image-b.png                 Light-page wordmark icon
image-w.png                 Dark-footer wordmark icon
mcu-watch-log/              MCU site source
  index.html
  movie.png                 MCU favicon
netlify/edge-functions/checklist.js
scripts/build-sites.js
dist/                       Generated Netlify publish output
```

## Add a site

1. Create a top-level folder, for example `reading-list/`.
2. Add `reading-list/index.html` with a useful `<title>`.
3. Run the build or deploy.

`scripts/build-sites.js` discovers top-level folders with an `index.html`, copies deployable static files into `dist/`, extracts declared favicons, then creates `dist/sites.json`. The root page uses that one catalog for cards, site count, and footer links. Each card loads its site's page in a lazy, visual-only iframe preview.

## Build and Deploy

```powershell
node scripts/build-sites.js
```

Netlify runs the same command and publishes only `dist/`. It does not publish `.env*`, `netlify/`, `scripts/`, `node_modules/`, source documentation, or `dist/` recursively.

Set these Netlify environment variables with the `Functions` scope:

```text
JSONSTORAGE_URL=https://api.jsonstorage.net/v1/json/YOUR_USER_ID/YOUR_ITEM_ID
JSONSTORAGE_API_KEY=YOUR_SECRET_API_KEY
```

Never commit real environment files or storage credentials. Visitors never receive either JSONStorage credential.

## Checklist API

`GET /.netlify/functions/checklist` is public and returns the stored checklist.

`PUT /.netlify/functions/checklist` is public. Anyone can toggle an existing checklist entry anonymously:

```json
{
  "id": "p2-05",
  "done": true
}
```

Success response:

```json
{
  "ok": true,
  "item": { "id": "p2-05", "done": true }
}
```

Only exactly `id` and `done` are accepted. The server requires a non-empty existing string ID and a real boolean `done`. It mutates only `item.done`; `id`, `phase`, `title`, `year`, `optional`, and `poster` remain authoritative storage metadata. IDs are stable opaque strings, gaps are valid, `year` remains display text, optional items remain optional, and source array order is preserved.

Failures return `{ "ok": false, "error": "..." }`: `INVALID_REQUEST` (400), `ITEM_NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `RATE_LIMITED` (429), or a storage error (500).

The function applies a small in-memory per-IP rate limit: 60 GETs or 30 PUTs per minute per warm function instance. This protects normal bursts but is not a global distributed limit. Public editing is intentional; validation only permits the `done` boolean of an existing ID, so visitors cannot modify checklist metadata through this endpoint.

## Concurrency

Each write reads the latest checklist, changes only one existing item's `done`, then writes it back. This removes stale full-checklist browser updates, so normal different-item updates do not send unrelated state.

JsonStorage's documented API exposes GET, PUT, and PATCH but no documented revision, ETag, conditional write, or compare-and-swap mechanism. Two function executions can still read the same revision then perform competing whole-document writes. Same-item writes are last successful write wins; different-item writes retain a residual race. Solve that completely only by using storage with conditional writes or atomic item updates.
