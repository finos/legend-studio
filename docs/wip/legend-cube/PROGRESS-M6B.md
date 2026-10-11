# Legend Cube — M6b Progress Log

> **What this file is:** the "where are we" ledger for M6b, Filter by expression (PLAN §11.3 and §11.11). It is kept
> apart from [PROGRESS.md](PROGRESS.md) and the other milestone logs, so the lines of work merge cleanly.
> [PLAN.md](PLAN.md) §11.11 holds what M6b settled; [ISSUES.md](ISSUES.md) the known issues later PRs fix.
>
> **Upkeep:** update it whenever a step lands, and commit it with that step.

## Current state

| Item   | State                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| Branch | `cube-filter-expr`, from `cube-dev` (`be232b8e2`); a draft PR into `cube-dev` |
| Engine | Local legend-engine on `localhost:6300`                                       |
| Step   | M6b.4: the editor, registered; next on the engine                             |
| Tests  | 2913 core, 1714 builder (core group)                                          |

## Steps

See PLAN §11.11 for each step's deliverable and when it is done.

- [x] **M6b.1** The settled decisions (PLAN §11.11) and this file
- [x] **M6b.2** The core
- [x] **M6b.3** The builder's engine-checked nodes
- [x] **M6b.4** The editor, registered
- [ ] **M6b.5** On the engine, around the databases, and in the conformance suite and the corpus
- [ ] **M6b.6** Guides, READMEs, testing.md and the changeset
- [ ] **M6b.7** Verification and the browser rehearsal
- [ ] **M6b.8** A demo video (PLAN §11.3)
- [ ] **M6b.9** Fold PLAN §11.11's supersessions in; the PR ready for `cube-dev`

## Commits

Filled in as steps land.

| Step  | Commit      | Subject                                                                       |
| ----- | ----------- | ----------------------------------------------------------------------------- |
| M6b.1 | `3d3eda4a1` | docs: settle Legend Cube M6b (Filter by expression)                           |
| M6b.2 | `8f09f9163` | feat: add Filter by Expression to Legend Cube's core                          |
| M6b.3 | `a96473c74` | feat: check Legend Cube's filter conditions with the engine in the background |
| M6b.4 | (this one)  | feat: add the Filter by Expression editor to Legend Cube                      |

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
