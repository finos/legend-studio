# Legend Cube: Import Pure, and Edit MatView in Studio, progress

PLAN §11.18. Built on `cube-import-pure`, branched from #5690's head, then moved onto `master` (`b33fba599`) once
#5690 merged (user, 2026-10-14), in a PR into `master`.

## Current state

In progress (2026-10-14): IP.1 done.

## Steps

- [x] IP.1 Lazy loading in Studio: Cube loads with its dialog, on the first opening
- [ ] IP.2 The plan section, this file, a draft PR
- [ ] IP.3 Protocol JSON to IR (`V1_readCubeLambda`) and the run's own parts, tested on Cube's JSON and on the
      engine's (JSON to grammar to JSON)
- [ ] IP.4 IR to steps, a first slice: ingest and data product sources as bound; Filter, Group, Restrict, Sort,
      Limit; each step checked by writing it again
- [ ] IP.5 Studio, end to end on that slice: Edit MatView opens Cube on a view (not an undo step); Add MatView and
      Save MatView (in place); the note
- [ ] IP.6 The other steps Cube writes as one function: Rename, Distinct, Drop, Slice, Extend (typed during the
      read), Filter by Expression, Pivot, Concat
- [ ] IP.7 The steps Cube writes as several: Join, Difference, Concat that converts, Partition
- [ ] IP.8 The round-trip corpus: every emitter test's cube and the examples, written, read and written again
- [ ] IP.9 Import Pure in the Cube ▾ menu, text or JSON; binding in Query
- [ ] IP.10 Verification: a review, a browser rehearsal
- [ ] IP.11 A demo video
- [ ] IP.12 Fold the plan in

## Commits

| Step | Commit      | What                        |
| ---- | ----------- | --------------------------- |
| IP.1 | `ed466c7de` | Cube loads lazily in Studio |
| IP.2 | this commit | The plan section, this file |

## Notes

- IP.1: a production build of Studio puts all of Cube's code in a chunk of its own (613 KB minified); the main bundle
  keeps Cube's shortcut configuration only (`LEGEND_CUBE_COMMAND_CONFIG`, a constant in a module with a type import
  only, and the builder is `sideEffects: false`).
