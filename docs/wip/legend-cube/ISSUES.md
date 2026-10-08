# Legend Cube — Known Issues

> **What this file is:** the known defects and gaps in Legend Cube, kept so later PRs can fix them. Each entry says
> what is wrong, where, and the suggested fix. [PROGRESS.md](PROGRESS.md) tracks status and [PLAN.md](PLAN.md) the
> plan.
>
> **Upkeep:** add an entry when a verification or a review finds something that is not fixed in the same change, and
> remove the entry in the PR that fixes it. Upstream defects (Studio and engine) are in PLAN.md Appendix B, not here.

## Bugs

### Decimal literals lose precision

- **Found:** M1.7 verification. **Deferred** by the user on 2026-10-07, until after the main end-to-end.
- **What:** the engine reads a `decimal` literal sent as a JSON number through a double. Digits past double precision
  are lost (e.g. `0.10000000000000000001`), so a filter can return the wrong rows.
- **Reachable:** only once a filter on a Decimal column can be built or imported (S7 import, M1.8b Filter editor).
- **Suggested fix:** in `V1_CubeLambdaSerializer`, write a decimal literal's value as a JSON string (the engine's
  `CDecimal` reads it with `new BigDecimal`). Verify it on the engine and add an engine-roundtrip test.

### The row limit accepts hexadecimal and exponent text

- **Found:** M2's requirements and its first verification (2026-10-08). M1 page code, so not fixed in M2's Limit
  step.
- **What:** the grid toolbar's row limit is checked with `Number(text.trim())` (`getRowLimitError` in
  `LegendCubeLabels.ts`) and set with `Number(draft.trim())` (`CubeGridRegion.tsx`), so `0x10` sets 16, `1e3` 1000,
  `0b11` 3 and `1.0` 1, where a user typing them likely meant something else.
- **Suggested fix:** read the text once with `parseWholeNumberText` (`stores/editors/CubeIntegerText.ts`, which the
  operations' size fields use), refuse `undefined` or a value below 1, and pass the parsed number to `setRowLimit`.
  Test: each of those texts gives "The row limit must be a whole number of at least 1." and leaves the limit unchanged.

## Engine issues to file

Upstream defects move to PLAN.md Appendix B once filed (M2.17). These wait for the user's go-ahead to post.

### SQL Server: `distinct()` then `limit()` renders `select top N distinct`

Found in M2's requirements (plan-only, not executed: no SQL Server in reach). On `SqlServer`, the engine writes a
relation `distinct()` followed by `limit(n)` as `select top n distinct …`
(`sqlServerExtension.pure:66` writes TOP before DISTINCT); T-SQL needs `select distinct top n …`. Every Cube Distinct
that runs hits it, since a run ends with `limit(rowLimit + 1)`. H2 accepts the order (the engine's own H2 test expects
it), and Sybase and Sybase IQ already render `select distinct top`. Cube works around it (M2.13): on SQL Server a
Distinct is written `->distinct()->extend(~cube_d: x | 1)->select(~[…])`, which plans `select top n … from (select
distinct …, 1 as "cube_d" …)`. Draft issue for finos/legend-engine:

> **SQL Server: `distinct()` followed by `limit()` generates `SELECT TOP n DISTINCT`, which T-SQL rejects.**
> For `#>{db.S.T}#->distinct()->limit(10)` with a `SqlServer` connection, the plan's SQL is `select top 10 distinct
…`. SQL Server requires `select distinct top 10 …`. The TOP clause is written before DISTINCT in
> `sqlServerExtension.pure` (line 66). Sybase and Sybase IQ already write `select distinct top n`.

## Test gaps

None hides a known bug.

- **The grid tests were not independently verified** (demo-cut test run `m18-democut-tests`, 2026-10-07). The grid
  group's verifier hit the session limit, so `CubeGridRegion.test.tsx` was checked only by its writer, against the
  writer's own mutants.
- **Part A's extras** (M1.9 requirements, kept for later by the user on 2026-10-08). A.4's FULL join on one nullable
  key checks Cube's merged-key nullability but not against the engine's answer: a check must allow Cube ⊇ engine and
  never pin the engine's `[1]`, a known engine defect (PLAN Appendix B). A.7's negatives run on synthetic schemas in
  the core tests, not on the resolved Northwind tables (`ORDER_DETAILS ⋈ PRODUCTS`, `EMPLOYEE_ID Equal 100000`).

## Risks

- **React Flow's two stylesheets.** The Cube canvas (xyflow 12) imports its CSS with the lazy Cube page, so Query's
  other pages don't load it (checked in the M1.8b dry run). Once the Cube page has been opened, it stays loaded for
  the session, and the query builder's lineage viewer (reactflow 11) shares its `.react-flow__*` class names. The
  lineage viewer wasn't seen after a visit to `/cube` (it needs a depot query). Check it when one is reachable.
- **Canvas fitting is checked by hand only.** jsdom measures nothing, so React Flow never reports the nodes measured
  and the refit after a layout or size change (`CubeCanvas.tsx`) has no jsdom test. Part B checks it by hand. The M1.9
  rehearsal found that a height-only change (the splitter above the grid) didn't refit, and that is fixed.
- **Only Chrome is checked.** The dry run, the demo and the M1.9 acceptance use Chrome, and `03e095655` fixed a
  Chrome-only behaviour of the date input. Firefox and Safari are untested, value entry (Part B step 5) and the spec
  file import (step 8) above all (user, 2026-10-08).
- **A page laid out at zero width stays empty.** Found in M2.4's browser check: when the Cube page first renders in a
  container with no width (the app's browser pane opening), react-reflex warns "Found ReflexContainer with width=0" and
  the graph and grid region keeps zero width, even after the window grows, until the page reloads. Not seen in a
  normal browser tab. Suggested check: whether `CubeEditor`'s resizable layout should re-measure on a resize, or
  render only once its container has a size.
- **Long column names on Postgres (💭, not probed).** A Rename (M2.9) accepts new names of up to 128 code points
  (PLAN §11.4), but Postgres cuts identifiers at 63 bytes, so two long names could collide or be cut once a Postgres
  runtime is in use. Suggested check: plan a rename to a name of 64 bytes or more on Postgres, and lower the cap per
  database if needed.
