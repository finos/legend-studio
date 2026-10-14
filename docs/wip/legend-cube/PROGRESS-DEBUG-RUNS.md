# Legend Cube: debugging runs, progress

PLAN §11.16. Built on `cube-debug-runs`, from `cube-dev` (`afd8bdadd`, draft #5686), then replayed onto `master`
(`56717aeec`) as `cube-debug-runs-master`, in a PR into `master`, finos/legend-studio#5689 (user, 2026-10-14).

## Current state

Complete (2026-10-14): DR.1–DR.7 done, the video sent. The draft PR waits for the user's word to be marked ready.

## Steps

- [x] DR.1 The plan section, this file, a draft PR
- [x] DR.2 Runs keep their lambda and record failures; the Pivot value load and the export recorded
- [x] DR.3 The Runs panel: Show Pure and Copy JSON per run, a failed run's error
- [x] DR.4 Dev Settings, from the menu at the top left: the engine URL and request compression
- [x] DR.5 Verification: an inline review, a browser rehearsal
- [x] DR.6 A demo video
- [x] DR.7 Fold the supersessions in

## Commits

| Step       | Commit      | What                                                                                      |
| ---------- | ----------- | ----------------------------------------------------------------------------------------- |
| DR.1       | `72af792e3` | The plan                                                                                  |
| DR.2       | `98f048801` | Runs keep their lambda; failures recorded                                                 |
| DR.3, DR.4 | `2572b7b09` | The Runs panel's Show Pure, Copy JSON, a failed run's error; the first compression switch |
| DR.4       | this commit | Dev Settings in place of the Runs panel's switch, with the engine URL                     |
| DR.5–DR.7  | this commit | Rehearsal, video, the plan folded                                                         |

## Notes

- DR.4, again (user, 2026-10-14): the switch left the Runs panel for a Dev Settings modal opened from a ☰ menu at
  the top left, as Legend Query's editor has, with the engine URL too. `CubeEngineClientSettings` replaces the
  engine port's `setRequestCompression`: the engine, the connection explorer and the service and ingest catalogs each
  register their client. Re-rehearsed with the demo script (14 checks; video `24-debug-runs-dev-settings.webm`, 1:29): Dev Settings shows the deployment's URL;
  compression off sends JSON; `http://localhost:6399/api` sends the next Execute there, which fails and is listed in
  Runs ("Failed: Failed to fetch"); Reset engine URL runs again on :6300.

- DR.7: folded into §8.7 (Show Pure), §9 (Runs), the §7.8 state table, §11.10 (Stats) and Appendix A (§12.6).
- DR.6: `23-debug-runs.webm` (1:03) in the evidence folder's `videos/`, script `demo/demo-debug-runs.mjs`; every frame
  checked against its caption. The request cards in the video are drawn by the script from what the browser sent
  (Playwright's request headers and body, and the body's size from a `fetch` wrapper, since Playwright gives no size
  for a Blob body).
- DR.5: rehearsed on the dev server (:9002) and the local engine with the script's 9 checks, all passing: a
  drill-down's levels listed in Runs, their Pure (the groups level's `groupBy` and `->limit(1001)`, the rows level's
  filter on its key), the clipboard holding the lambda JSON, the default request `application/zlib` (10,814 bytes),
  and after the switch `application/json` (41,943 bytes, the model included) with the rows back. Inline review: no
  findings. A fetch whose answer the grid drops for a newer run is still listed, since it ran; only a stopped run
  isn't.

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
