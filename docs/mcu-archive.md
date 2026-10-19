# MCU Archive maintenance

## Current catalog

As audited on 19 October 2026, `mcuarchive/checklist.json` contains 69 titles, including 26 series/seasons with 186 episodes. Two titles carry `upcoming`: Avengers: Doomsday and Avengers: Secret Wars. These counts describe stored data, not independently rechecked release announcements.

Cards are grouped by phase and preserve catalog order within each phase. Series expand into episode checkboxes; a season is complete only when every episode is watched. Overall progress counts titles/seasons, not individual episodes, and includes upcoming titles in the denominator. The hero selects the first unwatched available title with an available unwatched episode where applicable.

The recovered baseline contains 61 entries, 24 true. It is not current production progress. Keep stable title and episode IDs: changing an ID disconnects that entry from existing progress. Preserve the baseline for entries that have never been individually saved. A legacy completed season is inherited by its episodes until each episode is overridden.

## Checklist API

Endpoint: `/.netlify/functions/checklist`. Anonymous shared editing is intentional; there are no user accounts or separate personal checklists.

- `GET`: returns catalog metadata plus saved title and episode states.
- `PUT`: accepts exactly `{ "id": "p2-05", "done": true }` and returns `{ "ok": true, "item": { "id": "p2-05", "done": true } }`.
- `OPTIONS`: returns 204 and allowed methods.

Only existing IDs and real booleans are accepted. For a series, use an episode ID such as `p4-02-e01`; direct season writes return `USE_EPISODE_CHECKLIST`. `upcoming` entries and entries whose `releaseDate` is after today's Asia/Manila calendar date return `NOT_RELEASED`. An explicit `upcoming` flag remains blocking until removed, even after its date passes.

| HTTP | Error |
|---|---|
| 400 | `INVALID_REQUEST`, `USE_EPISODE_CHECKLIST`, `NOT_RELEASED` |
| 404 | `ITEM_NOT_FOUND` |
| 405 | `METHOD_NOT_ALLOWED` |
| 429 | `RATE_LIMITED` |
| 502 | `STORAGE_READ_FAILED` or `STORAGE_WRITE_FAILED` |

Errors use `{ "ok": false, "error": "..." }`. The per-IP, per-method in-memory limit is 60 GETs or 30 PUTs per minute per warm handler instance; it is not a distributed limit. Frontend saves are optimistic and revert on failure. Failed loading falls back to the static catalog with disabled checkboxes and unavailable progress.

## Editing and research

Edit `mcuarchive/checklist.json` for metadata, stable IDs, phase, display dates, posters, optional flags and episodes. New IDs default to unchecked unless explicitly represented in the baseline. The historical research record is [catalog sources](mcu-catalog-sources.md); per-entry fields retain provenance even where card source links are omitted.

Audience strips display Rotten Tomatoes All Audience liked and not-liked counts. Missing/unreleased data shows N/A. These are catalog snapshots, not visitor votes, critic scores or live totals.

From the repository root:

```powershell
node scripts/refresh-audience-ratings.mjs
```

Review `.migration/audience-research.json`, including title and season identity, before applying:

```powershell
node scripts/refresh-audience-ratings.mjs --apply
```

`--missing` retries failed entries. The importer refuses incomplete or unverified snapshots. Run tests and rebuild after applying.

`node scripts/research-episodes.mjs` fetches TVmaze names into `.migration/episode-research.json` without editing the catalog. `node scripts/research-release-dates.mjs` writes `.migration/release-dates.json` for year-only labels; create `.migration/` first if absent. Neither script automatically applies those results. Review matches manually. Series premiere dates use Season Info rather than the review module date. Source dates do not necessarily represent Philippine release dates.

Normal builds do not contact research providers. Keep the TVmaze/CC BY-SA footer attribution when using episode data. `.migration/checklist-backup.json`, when present, is an ignored historical JSONStorage recovery copy; production no longer reads JSONStorage.
