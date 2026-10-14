# Legend Cube: debugging runs, progress

PLAN §11.16. Branch `cube-debug-runs`, from `cube-dev` (`afd8bdadd`); a draft PR into `cube-dev`.

## Current state

DR.1 and DR.2 are done: every run keeps the lambda it sent, failures are recorded, and the port can serialize a lambda
and turn compression off.

## Steps

- [x] DR.1 The plan section, this file, a draft PR
- [x] DR.2 Runs keep their lambda and record failures; the Pivot value load and the export recorded
- [ ] DR.3 The Runs panel: Show Pure and Copy JSON per run, a failed run's error
- [ ] DR.4 "Send requests uncompressed", kept per user
- [ ] DR.5 Verification: an inline review, a browser rehearsal
- [ ] DR.6 A demo video
- [ ] DR.7 Fold the supersessions in

## Commits

| Step | Commit | What |
| ---- | ------ | ---- |

## Notes

- DR.2: `runCubeQuery` records the run itself under the label its caller gives (Execute, `describeFetch`'s, "Values
  of X"), with its lambda, and records a failure with the engine's first line; a run whose controller was aborted
  records nothing, even if it answers later (a purged fetch, a stopped Execute, an abandoned Pivot load). The export
  records its own. The port gains `serializeLambda` (lossless, indented 2) and `setRequestCompression`.
- DR.1: the payloads are deflated by legend-shared because Cube's host sets `enableCompression: true`, as Legend
  Query's editor does; the responses are plain JSON. A cached drill-down level sends nothing.
