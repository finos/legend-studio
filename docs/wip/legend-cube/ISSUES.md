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

### Show Pure prints every number as 0

- **Found:** M1.7 verification. **Deferred** by the user on 2026-10-07. **Must be fixed before the first PR merges**,
  because S9 (Show Pure) makes it visible.
- **What:** `V1_LegendCubeEngine.renderPure` passes the serialized lambda object, which holds `LosslessNumber`s,
  straight to `JSONToGrammar_lambda`. The client turns it into text with plain `JSON.stringify`, so each number goes
  out as an object and renders as 0 (e.g. `->limit(1001)` shows as `->limit(0)`). Display only: typing and execute
  send a lossless string and are right.
- **Suggested fix:** send `stringifyLosslessJSON(V1_serializeCubeLambda(lambdaIR))`, as typing and execute do. Make
  the engine test 'Renders the slice as Pure text, for display' assert the literals (`->limit(1001)`,
  `->in([1, 4])`); both renderPure tests pass on the buggy code today. M1.8a's own tests use a mocked port, so they
  won't catch it.

## Test gaps

From the demo-cut test run (`m18-democut-tests`, 2026-10-07). None hides a known bug.

- **The grid tests were not independently verified.** The grid group's verifier hit the session limit, so
  `CubeGridRegion.test.tsx` was checked only by its writer, against the writer's own mutants.
- **Add table is never clicked while a query runs.** `CubeEditor.test.tsx` 'Keeps the query usable while a query
  runs' reads the button's `disabled` attribute only; a handler that does nothing while running survives.
- **The picker's loading bar while the model loads.** Only the `isResolving` half of the picker bar is pinned; the
  `isLoadingModel` half is not.
- **An empty schema seen from the page.** A picked table that lands with an empty schema is caught by the state test
  only, not by a jsdom test.
- **Unexpected rejections in the picker.** The grid's Execute call site is covered; the picker's `confirm` and
  `selectModel` call sites are not.

## Risks

- **CI's engine.** CI runs the `engine-roundtrip` group on the docker engine image, whose version may differ from the
  local engine on :6300 (the parity file, `loadNorthwindData`). It can't be checked locally (no docker), so the first
  CI run is the real check.
