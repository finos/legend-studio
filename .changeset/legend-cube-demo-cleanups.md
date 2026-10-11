---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Legend Cube's cleanups for a demo:

- **Numbers.** The results grid shows Decimal and Number values with their thousands grouped, every digit kept, and Float values rounded to 2 places and grouped. Integer values stay plain, so ids and years get no commas. Copying a cell copies its exact value, which also shows on hover.
- **Export and Import** lose their "(dev)" label.
- **A desk league table example** over the Trades sample: trades joined to their desks, each desk's dollar notional added up, then ranked within its region with a window function.
- **Show Pure** leaves out the row limit Execute adds to see if there are more rows, as Legend Query's own Show Pure does; a Take or Drop the user added still shows. `QueryEmitter.emitExecutionLambda`'s `rowLimit` is now optional.
- **Behind the non-production flag.** Legend Query mounts the Cube page at `/query/cube` only when `extensions.core.NonProductionFeatureFlag` is set, since Cube is still a proof of concept. To see it locally, add the flag to the deployment's `dev/config.json`.
