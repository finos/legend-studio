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

## Test gaps

From the demo-cut test run (`m18-democut-tests`, 2026-10-07). None hides a known bug.

- **The grid tests were not independently verified.** The grid group's verifier hit the session limit, so
  `CubeGridRegion.test.tsx` was checked only by its writer, against the writer's own mutants.
- **An empty schema seen from the page.** A picked table that lands with an empty schema is caught by the state test
  only, not by a jsdom test.
- **Unexpected rejections in the picker.** The grid's Execute call site is covered; the picker's `confirm` and
  `selectModel` call sites are not.

## Risks

- **React Flow's two stylesheets.** The Cube canvas (xyflow 12) imports its CSS with the lazy Cube page, so Query's
  other pages don't load it (checked in the M1.8b dry run). Once the Cube page has been opened, it stays loaded for
  the session, and the query builder's lineage viewer (reactflow 11) shares its `.react-flow__*` class names. The
  lineage viewer wasn't seen after a visit to `/cube` (it needs a depot query). Check it when one is reachable.
- **Canvas fitting is checked by hand only.** jsdom measures nothing, so React Flow never reports the nodes measured
  and the refit after a layout or width change (`CubeCanvas.tsx`) has no jsdom test. M1.9's manual run covers it.
- **Only Chrome is checked.** The dry run, the demo and the M1.9 acceptance use Chrome, and `03e095655` fixed a
  Chrome-only behaviour of the date input. Firefox and Safari are untested, value entry (Part B step 5) and the spec
  file import (step 8) above all (user, 2026-10-08).
