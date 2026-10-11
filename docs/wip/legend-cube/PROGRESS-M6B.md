# Legend Cube — M6b Progress Log

> **What this file is:** the "where are we" ledger for M6b, Filter by expression (PLAN §11.3 and §11.11). It is kept
> apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.11 holds what M6b settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------- |
| Branch | `cube-filter-expr`, from `cube-dev` (`be232b8e2`); a draft PR into `cube-dev`                   |
| Engine | Local legend-engine on `localhost:6300`                                                         |
| Step   | M6b.1–M6b.9 done: M6b is complete, in draft #5670 for `cube-dev`                                |
| Tests  | 2930 core, 1714 builder (core group); engine suites 900 of 904 (the 4 local setup-SQL timeouts) |

## Steps

See PLAN §11.11 for each step's deliverable and when it is done.

- [x] **M6b.1** The settled decisions (PLAN §11.11) and this file
- [x] **M6b.2** The core
- [x] **M6b.3** The builder's engine-checked nodes
- [x] **M6b.4** The editor, registered
- [x] **M6b.5** On the engine, around the databases, and in the conformance suite and the corpus
- [x] **M6b.6** Guides, READMEs, testing.md and the changeset
- [x] **M6b.7** Verification and the browser rehearsal
- [x] **M6b.8** A demo video (PLAN §11.3)
- [x] **M6b.9** Fold PLAN §11.11's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                                                       |
| ----- | ----------- | ----------------------------------------------------------------------------- |
| M6b.1 | `3d3eda4a1` | docs: settle Legend Cube M6b (Filter by expression)                           |
| M6b.2 | `8f09f9163` | feat: add Filter by Expression to Legend Cube's core                          |
| M6b.3 | `a96473c74` | feat: check Legend Cube's filter conditions with the engine in the background |
| M6b.4 | `3311c02c5` | feat: add the Filter by Expression editor to Legend Cube                      |
| M6b.5 | `258bf2a5e` | test: run Legend Cube's Filter by Expression on the engine and every database |
| M6b.5 | `a041aea3e` | docs: record Legend Cube M6b.5                                                |
| M6b.6 | `1d09b22dd` | docs: cover Legend Cube's Filter by Expression in its guides                  |
| M6b.7 | `088cdbf24` | docs: record Legend Cube M6b.7                                                |
| M6b.8 | `1e7a04f31` | docs: record Legend Cube M6b's demo video                                     |
| M6b.9 | (this one)  | docs: fold Legend Cube M6b's changes into its plan                            |

## Notes

- **M6b.1** (2026-10-11). Asked what was left for operations once M6 and M5b were in `cube-dev`, the user picked
  Filter by expression, and asked whether pivot is in the spec or the plan: it isn't, as an operation (the spec names
  pivoting only as an ag-Grid mode, client-side in local mode and refused server-side); the engine has a `pivot()`
  relation function, whose columns come from the data's values, which Cube's offline schema can't know. The user's
  answers, all on the recommendation: its own node, after Filter by Column; one expression per node; a full lambda.
  The probes (`filter-expr-requirements/` in the evidence folder: `p1-filter`, `p2-precedence`, `p3-values`) found
  that a condition that isn't one Boolean fails with no location, so Cube types it alone too; that comparisons bind no
  tighter than `&&`, `||` and `!` in Pure, so a hint asks for parentheses; that compared directly an empty value keeps
  Pure's meaning, and after `->toOne()` SQL's; that a filter on a window column after Cube's `let` runs after the
  window; and that the engine's LIKE escaping gives wrong rows on H2 for `\` (which Cube refuses, as the column Filter
  does) and on DuckDB for `%` and `_`, for the column Filter too (ISSUES.md, new). Built on `cube-dev` after #5667
  (M7) merged, which took PLAN §11.10, so M6b is §11.11.
- **M6b.2** (2026-10-11). `ExpressionFilter` (`nodes/transforms/ExpressionFilter.ts`, saved as `expressionFilter`):
  the code, the lambda and its own check (`unresolved`, `checked` or `failed`, each failure with the engine's message
  and, when the condition types but isn't one Boolean, its type), signed by the input schema and the lambda. Checks
  in order: a condition, a lambda of one parameter, no backslash in a `startsWith`, `endsWith` or `contains` literal
  (`findLikeFunctionWithBackslash`, nested or in the older `values` form), then the check, pending as
  `ERR_CHECKING`, which `isTypingError` reads as it reads an Extend's `ERR_TYPING`. Four messages. The emitter writes
  `->filter(<lambda>)` marked with the node; after a Partition it reads the `let`. The codec saves
  `{code, lambda?, checked?: {signature}}`, never a failure or the upstream digest; an unknown key in the check makes
  an Unknown node, one on the node goes to its `rest`. `EXPRESSION_FILTER_DEFINITION` is defined but not registered
  until the editor exists (M6b.4), as M6.2 did with Difference.
- **M6b.3** (2026-10-11). The engine checks a Filter by Expression's condition as it types an Extend, through one
  path: `CubeEngineChecks.ts` gives each kind of node a request (its lambdas, and how to read the answers into the
  node to store, or a warning that keeps a current check when the engine can't be reached), and
  `createStaleCubeEngineCheckRule` makes either kind wait when its input as the engine is given it changed
  (`ERR_TYPING` or `ERR_CHECKING`). `CubeEditorState`'s `checkExpressions` (was `retypeExtends`), `nodesToCheck`,
  `isCheckingExpressions` and the in-flight set serve both; the header's pending label reads "checking expressions".
  `CubeExpressionFilterCheck.ts` builds a condition's two lambdas (the input filtered, and the condition typed alone
  under a name no input column has, `cube_condition`, then `cube_condition_2`…) and reads the answers: checked when
  the filter types; else the condition's own error when it fails alone, or the filter's, and its type when it types
  but isn't one Boolean (`Integer`, `Boolean[0..1]`). Tests: the lambdas and answers, and the background checks
  (one call, a failure named, a kept check offline, a node changed meanwhile, a changed input, a change only the
  engine sees). Extend's tests pass unchanged but for the renames.
- **M6b.4** (2026-10-11). `Filter by Expression` is registered after `Filter by Column` (palette, Add Items, context
  menu), with the `FunctionIcon`, its help text ("…keeping only rows for which the expression is true.") and its
  editor: the condition in a code editor (96px, 240 expanded), its status (its problem and hint, "Not validated
  yet", or that it is one Boolean of a row), Validate (F10, which now serves both editors), the input's columns, a
  click writing `$x.NAME` at the end, and five notes (the form, parentheses, empty values, Validate, backslashes).
  `CubeExpressionFilterDraft` parses the code when it changed, checks Cube's rules, checks the condition located in
  the code, then plans the query up to the node for the cube's database; Apply waits for a Validate, and an editor
  closed meanwhile stays open, saying why. A refused `and`, `or` or `not` gets the parentheses hint; arithmetic on a
  column that can be empty, Extend's `->toOne()` hint. `findColumnOrigins` passes a column through (tested). The
  lists that name every node type (registry, palette, Add Items, context menu, titles, icons, help) name it.
- **M6b.5** (2026-10-11). On the engine (`CubeExpressionFilter.engine-roundtrip-test.ts`, through
  `V1_LegendCubeEngine`): conditions checked (two columns, a string function, a nullable comparison without
  `->toOne()`, `isEmpty()`, the cube model's own function, any parameter name), refused with their type (`Integer`,
  `String`, `Boolean[0..1]`), an unknown column located in the text, `&&` without parentheses refused and with them
  checked; run on H2: 37 late orders of 830, the empty values (507 without a region, 34 RJ, 796 not RJ, 772 not late
  after `->toOne()`), each country's first order after a Partition, and an Extend's column. Around the databases
  (`LegendCubeDialects`): the condition in the `WHERE` on the 20 planned types, and a window column's filter after the
  window, never `QUALIFY`, on the 17 window types. On a direct connection, H2 and DuckDB: an empty quantity kept by a
  negation compared directly and by neither after `->toOne()`, and each country's first order. A conformance case
  (`expression-filter`), which the suite's "a case for every registered node type" needed, and a checked sample in
  `operations.cube.json` that the engine corpus test types. `TEST__checkedExpressionFilter` builds a filter checked
  for its input. A browser probe (`demo/probe-m6b-editor.mjs`) passed 7 of 7 on the dev server: the editor, Validate,
  37 rows, a number refused, the parentheses hint. The dev server needed `extensions.core.NonProductionFeatureFlag` in
  its own `dev/config.json` since #5666, and #5666 renamed Import (dev) to Import.
- **M6b.6** (2026-10-11). Both adding-an-operation guides cover a node the engine checks (the core's check state and
  `ERR_CHECKING`; the builder's one path, `CubeEngineChecks.ts`, and what a new kind joins), the menu order names
  Filter by Expression, `testing.md` its engine tests, both READMEs list it, and the patch changeset names both
  packages. Following the core guide's list, the saved-spec suites gained the new kind: decode cases (a baseline and
  five refusals), forward compatibility (an older registry reads it as an Unknown node and re-saves it verbatim; this
  version keeps its unknown keys) and validity through inference (checked, waiting, for another input, no lambda, two
  parameters, a backslash). `yarn check:ci` passes.
- **M6b.7** (2026-10-11). A review of the branch's diff, done in this session (earlier milestones ran reviewers and
  a skeptic per finding as a multi-agent workflow, which this session wasn't asked to run): every place that tells a
  node waits now reads `isTypingError`, so a filter waiting on `ERR_CHECKING` shows as pending on the canvas and in
  the panel, never as a problem; nothing else still names Extend alone but the stale rule's choice of marker and
  Extend's own draft. One comment fixed. In the browser, on the dev server with the branch's libs: the M6b probe 7 of
  7, the Extend check 13 of 13, the Difference check 12 of 12, and the rehearsal 57 of 57. The scripts were updated
  for what landed on `cube-dev` meanwhile: Import and Export lost "(dev)" (#5666), the palette lists Filter by
  Expression, and M7's curated grid menu puts Drilldown by first.
- **M6b.8** (2026-10-11). The demo video (`legend-cube-m6b-filter-by-expression.webm`, 2.5 min, in the evidence
  folder's `demo/out-demo-m6b/`; `demo/demo-m6b.mjs` records it from `demo/m6b-specs/`): a condition typed into the
  editor, validated and run (37 late orders); a negation compared directly (796 rows, the orders with no region kept,
  `(null)` in SHIP_REGION); a number refused with its type; `&&` without parentheses refused with the hint, then the
  fixed condition run (48 orders); each country's latest order, a condition on a Partition's `rn` after the window (21
  rows, each 1); Show Pure's filter after the `let`. 12 checks pass; each of the 10 frames was read against its caption,
  and four were re-shot so each caption claims only what shows: "of the 830", the region counts, SHIP_VIA and an
  employee range were off screen or wrong.
- **M6b.9** (2026-10-11). PLAN §11.11's supersessions folded into the sections they change: §4.8 (Filter by
  Expression beside the column Filter: its check, `ERR_CHECKING`, its own refusals), §8.8 (its Transforms row: the
  `filter` lambda, the window's `let`, the engine's check, the plans and runs, empty values, precedence and `LIKE`),
  §10.3 (`expressionFilter`'s saved shape), and Appendix A (a row for the node beside §7.x, §16's messages, §17.6's
  editor). §11.3's row was written in M6b.1. M6b is complete; marking #5670 ready, and merging it into `cube-dev`,
  are the user's.
- **After M6b.9** (2026-10-11). Two checks a final review asked for. ISSUES.md's DuckDB entry claimed the column Filter
  shares the `%` and `_` problem; now shown: its Contains `%` and `_` on a DuckDB direct connection each returned the
  backslash's row (H2 the right ones), with a temporary test not kept. And M7's server-side grid over a Filter by
  Expression (`demo/probe-m6b-grid.mjs`): the late orders run, a drill-down by `CUSTOMER_ID` whose groups each count
  their customer's late orders as the whole-query CSV has them (24 shown of 28), and the CSV export, a header and 37
  rows. Whether to refuse `%` and `_` for DuckDB cubes, in both filters, is the user's choice.
- **DuckDB's `%` and `_` refused** (2026-10-11, the user's choice). For a cube whose database is DuckDB, both filters
  refuse `%` and `_` given to a pattern, saying why (PLAN §8.2): core's `hasNoLikeEscape`, `givesPatternWildcard` and
  `getDatabaseProblems` (`CubeDialects.ts`), over `hasPatternWildcard`, `findPatternWildcardOperator` and
  `findLikeFunctionWithWildcard`; the two messages; `needsDatabaseType` widened, and both emitters throwing for DuckDB.
  The editor's `getNodeDatabaseProblems`, a query rule in `analysis` and the panel's problems; the outline loaded
  once the cube, or the Filter editor's draft, gives a pattern `%` or `_`; Validate refusing before the engine; the
  Filter by Expression note. Tests: the core helpers, rule and backstop; the store (refused on DuckDB, run on H2, no
  outline without them, a run started before the outline refused by the emitter); the Filter editor's panel and
  Validate, each on DuckDB and H2; and a plan-only engine test pinning the missing `ESCAPE` clause on H2 and DuckDB.
