# Legend Cube: debugging runs, progress

PLAN §11.16. Branch `cube-debug-runs`, from `cube-dev` (`afd8bdadd`); a draft PR into `cube-dev`.

## Current state

DR.1–DR.4 are built: every run keeps the lambda it sent, failures are recorded, and the Runs panel has Show Pure and
Copy JSON per run and the "Send requests uncompressed" switch. DR.4's Network tab check is part of DR.5's rehearsal.

## Steps

- [x] DR.1 The plan section, this file, a draft PR
- [x] DR.2 Runs keep their lambda and record failures; the Pivot value load and the export recorded
- [x] DR.3 The Runs panel: Show Pure and Copy JSON per run, a failed run's error
- [x] DR.4 "Send requests uncompressed", kept per user
- [ ] DR.5 Verification: an inline review, a browser rehearsal
- [ ] DR.6 A demo video
- [ ] DR.7 Fold the supersessions in

## Commits

| Step | Commit      | What                                      |
| ---- | ----------- | ----------------------------------------- |
| DR.1 | `49cd64b12` | The plan                                  |
| DR.2 | `a913db66f` | Runs keep their lambda; failures recorded |

## Notes

- DR.3: Show Pure's state gains `openRun(run)`, titled "Pure query of <label>" with a note that it is as it ran;
  the panel's Show Pure and Copy JSON are disabled for a run that failed before its lambda was written. A failed run
  shows "Failed: <first line>".
- DR.4: the switch lives in `CubeRunStatsState` (`uncompressedRequests`), read from `userDataService` at page start
  (the engine is told only when it is on) and persisted on change.
- DR.2: `runCubeQuery` records the run itself under the label its caller gives (Execute, `describeFetch`'s, "Values
  of X"), with its lambda, and records a failure with the engine's first line; a run whose controller was aborted
  records nothing, even if it answers later (a purged fetch, a stopped Execute, an abandoned Pivot load). The export
  records its own. The port gains `serializeLambda` (lossless, indented 2) and `setRequestCompression`.
- DR.1: the payloads are deflated by legend-shared because Cube's host sets `enableCompression: true`, as Legend
  Query's editor does; the responses are plain JSON. A cached drill-down level sends nothing.
