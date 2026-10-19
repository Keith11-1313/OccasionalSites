# Verification

## Automated checks

Run from the repository root:

```powershell
npm test
npm run build
```

The test command runs checklist, audience-parser and TextFix transformation suites. Checklist tests use the Netlify Blobs SDK and local server, including migration inheritance, individual writes, concurrent entries, restart persistence, episodes, validation, release restrictions, rate limits and failures. Audience tests distinguish All Audience counts from critics and Verified Audience and reject unavailable totals. TextFix tests cover transformations and representative tool inputs.

These checks do not deploy, access production progress, validate external catalog facts, or prove browser layout and interaction. A build only generates static assets; Netlify must separately bundle/deploy the Function.

## Manual acceptance

Use isolated local or preview data for writable checks. Production checkboxes are shared with all visitors; restore any intentional production test changes.

| Area | Action and expected result |
|---|---|
| Landing | Open `/`; both site cards, counts and footer links load. Each card opens its own site. |
| MCU loading | Open `/mcuarchive/`; phases, posters, progress and next-title hero appear. |
| Shared progress | Toggle a movie and an episode; refresh/reopen and confirm persistence. Verify the phase and overall counts. |
| Series | Expand a season; episode changes update its watched count and completion. |
| Restrictions | Upcoming titles and future episodes are disabled; direct invalid API writes are rejected. |
| Failure | Make the API unavailable; static catalog remains visible with editing disabled and progress unavailable. A failed save restores the prior state. |
| Isolation | Change preview progress and confirm production is unaffected. Preview deployments share their preview store. |
| TextFix selection | Transform a selection and confirm surrounding text is preserved; undo and redo. |
| TextFix tools | Exercise parameter dialogs, recipe order/options, search, favorites and find/replace. |
| TextFix storage | Enable a draft and reload; disable saving and confirm it is removed. Verify saved recipe restoration. |
| TextFix files | Import a small text file, undo, export, and verify oversized import rejection. |
| Mobile/keyboard | Check both sites at narrow widths, keyboard focus, dialogs and TextFix editor/tool switching. |
| Legacy route | Verify `/mcu-watch-log` redirects to `/mcuarchive/` after deployment. |

## Audit boundary

The 19 October 2026 documentation pass inspected the landing page, both site implementations, catalog and baseline counts, backend, build/research/preview scripts, configuration and test sources. See the accompanying change report for commands actually rerun. Production deployment, cross-browser acceptance and external-source freshness are not established by this documentation pass.

Validation rerun for this documentation update: all 12 tests passed outside the sandbox with the local Blobs server reachable; `npm run build` and `git diff --check` passed. The initial sandboxed test run could not complete the Blobs integration scenario. No production or browser acceptance checks were performed.
