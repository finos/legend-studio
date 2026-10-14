# Legend Cube: Legend Analytics, progress

PLAN §11.19. Built on `cube-analytics`, from `master` (`1cc69259a`, rebased on `1003eb7fb` 2026-10-15), in a PR into `master`.

## Current state

AN.2 done (2026-10-14): the shared host. Next: AN.3, the app's packages.

## Steps

- [x] AN.1 The plan section, this file, a draft PR (finos/legend-studio#5692)
- [x] AN.2 The shared host: `LegendCubeHost` in the builder; Query's host built on it
- [ ] AN.3 The app: `legend-application-analytics`, its bootstrap and deployment, registered
- [ ] AN.4 Verification: an inline review, a browser rehearsal on :9009
- [ ] AN.5 A demo video
- [ ] AN.6 Fold the supersessions in

## Commits

| Step | Commit      | What            |
| ---- | ----------- | --------------- |
| AN.1 | `86f684244` | The plan        |
| AN.2 | this commit | The shared host |

## Notes

- AN.2: `LegendCubeHost` and `LegendCubeHostConfig` in the builder's `stores/`, with `buildLegendCubeLakehouseServices`
  and `buildLegendCubeProjectCatalog`; the marketplace link is the builder's own
  (`__lib__/LegendCubeNavigation.ts`, the address Query writes). `LegendQueryCubeHost` is a subclass passing
  `buildLegendQueryCubeHostConfig`; its 30 Cube tests pass unchanged. 6 builder tests: what each server offers, the
  parts tests give, the marketplace link, the viewer and token, and Dev Settings reaching every engine client.

- AN.1: the user's answers of 2026-10-14 are in the plan's "Settled". On the libraries' names the user asked which
  makes more sense; the plan records the recommendation (keep `legend-cube` and `legend-cube-builder`) and its
  reasons.
