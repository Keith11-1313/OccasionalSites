# OccasionalSites

A collection of small sites hosted on Netlify:

| Route | Site | Data |
|---|---|---|
| `/` | Collection landing page with lazy iframe previews | Generated `sites.json` |
| `/mcuarchive/` | MCU Archive: public, shared movie and episode checklist | Catalog JSON + Netlify Blobs progress |
| `/textfix/` | TextFix: 82 browser-based text transformations | Optional device-local storage |

## Setup and build

Use Node.js 22.12 or later and npm. From the repository root:

```powershell
npm ci
npm test
npm run build
```

The build recreates `dist/`. It discovers top-level folders containing `index.html`, copies their static assets, and generates `dist/sites.json`. Edit source folders, not generated files.

For the complete local Netlify environment, run `npx netlify dev`. Local storage is separate from production. Static hosting alone can display the catalog and TextFix but cannot save MCU progress.

An MCU-focused preview is also available after building:

```powershell
node scripts/preview-mcu.mjs
```

Open `http://127.0.0.1:8888/mcuarchive/`. This uses a separate local Blobs server and the shared checklist handler; it does not reproduce Netlify deployment routing or credentials. Stop it with Ctrl+C.

## Deployment

Deploy this repository through Netlify. `netlify.toml` configures the build, `dist/` publish directory, Node 22, and bundled Functions. Uploading only `dist/` omits the checklist backend.

Netlify supplies Blobs credentials. JSONStorage is no longer a runtime dependency; no JSONStorage environment variables are required. Verify the deployed migration before removing any legacy configuration. `/mcu-watch-log` and its subpaths permanently redirect to `/mcuarchive/`.

MCU progress is intentionally shared and editable without accounts. Production uses `mcu-progress`; non-production function contexts use `mcu-progress-preview`. All preview contexts share that preview store. Builds do not reset saved progress.

## Documentation

Start with [the documentation index](docs/index.md):

- [Architecture and data flow](docs/architecture.md)
- [MCU Archive maintenance and API](docs/mcu-archive.md)
- [TextFix behavior and privacy](docs/textfix.md)
- [Verification and deployment checks](docs/verification.md)
- [Catalog research and source notes](docs/mcu-catalog-sources.md)

## Add a site

Create a top-level folder containing `index.html`, a descriptive `<title>`, and its static assets, then rebuild. Declare a favicon in the page to include it in the landing card. The build copies non-hidden files recursively within discovered sites; keep private files outside site folders.

Environment files, backend code, scripts, dependencies, documentation, and hidden directories are not part of the current publish output. New persistent sites should use their own backend and separate storage.
