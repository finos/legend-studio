# Legend Cube: Import Pure, and Edit MatView in Studio, progress

PLAN §11.18. Built on `cube-import-pure`, branched from #5690's head, then moved onto `master` (`b33fba599`) once
#5690 merged (user, 2026-10-14), in a PR into `master`.

## Current state

In progress (2026-10-14): IP.1–IP.9 done; the draft PR is finos/legend-studio#5694.

## Steps

- [x] IP.1 Lazy loading in Studio: Cube loads with its dialog, on the first opening
- [x] IP.2 The plan section, this file, a draft PR
- [x] IP.3 Protocol JSON to IR (`V1_readCubeLambda`) and the run's own parts, tested on Cube's JSON and on the
      engine's (JSON to grammar to JSON)
- [x] IP.4 IR to steps, a first slice: ingest and data product sources as bound; Filter, Group, Restrict, Sort,
      Limit; each step checked by writing it again
- [x] IP.5 Studio, end to end on that slice: Edit MatView opens Cube on a view (not an undo step); Add MatView and
      Save MatView (in place); the note
- [x] IP.6 The other steps Cube writes as one function: Rename, Distinct, Drop, Slice, Extend (typed during the
      read), Filter by Expression, Pivot, Concat
- [x] IP.7 The steps Cube writes as several: Join, Difference, Concat that converts, Partition
- [x] IP.8 The round-trip corpus: every emitter test's cube and the examples, written, read and written again
- [x] IP.9 Import Pure in the Cube ▾ menu, text or JSON; binding in Query
- [ ] IP.10 Verification: a review, a browser rehearsal
- [ ] IP.11 A demo video
- [ ] IP.12 Fold the plan in

## Commits

| Step       | Commit      | What                                                                                                |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------- |
| IP.1       | `ed466c7de` | Cube loads lazily in Studio                                                                         |
| IP.2       | `d1d9c4475` | The plan section, this file                                                                         |
| IP.3       | `e258ad719` | Protocol JSON to IR, the run's own parts, IR comparison                                             |
| IP.4       | `6f9d92d0d` | IR to steps: sources, Filter, Group, Restrict, Sort, Limit, Drop, Slice, Distinct, Rename           |
| IP.5       | `aeb821c7e` | Studio: Edit MatView, Add MatView and Save MatView, the import banner                               |
| IP.6       | `a51c3767f` | Extend (typed before reading), Pivot, Concat                                                        |
| IP.7, IP.8 | `5e1be847f` | Join, Difference, Concat that converts, Partition; the corpus on the engine's JSON and the examples |
| IP.9       | this commit | Import Pure in the Cube ▾ menu                                                                      |

## Notes

- IP.9: Import Pure in the Cube ▾ menu (`CubeImportPureDialog`): Pure text, parsed by the engine's grammar
  (`parseExpression`, no new engine call), or the engine's JSON, read into steps that replace the cube as one undo
  step; the banner then says when Cube writes it another way; an error stays in the dialog and leaves the cube as it
  was. In Query, tables bind on the cube's own model (a new cube asks for a table first), data products and ingest
  data sets through the host's catalogs as the source dialog finds them. A function Cube has no step for is named
  in the error, not taken for a source. One column alone or in a list (`~a`, `~[a]`) compares as the same Pure.
  Tested on the local engine (`CubeImportPure.engine-roundtrip-test.ts`): Pure text with a Filter, an Extend (typed
  by the editor, its code from the grammar), a Group, a Sort and a Limit reads back exactly; a run's JSON keeps its
  runtime and gets the grid-limit note; errors.

- IP.7, IP.8: `StepPatterns.ts` reads the steps Cube writes as several functions: a Join's `join` (its keys from the
  condition, Cube's temporary renames of same-named keys peeled, a FULL join's merge), a Difference's `select` over
  its differences' extend over a FULL join of `_1`/`_2` renamed inputs, a Concat input's conversions (`cube_cast`),
  a Partition's one to three window extends (Last's over the reversed window). A `select` after a Join or a
  Partition is read with it when Cube writes that select (the Partition's functions in its order), else as the
  Restrict after it. Every node of the core's samples (52) and of the nine examples reads back into as many steps,
  written the same, as a matview and as Show Pure, from Cube's JSON and through the local engine's grammar.

- IP.6: a chain of `extend`s that aren't windows reads as one Extend; the host types each chain with the engine
  before reading (`findCubeLambdaExtends`, one batch call), so the steps after it are checked, while the step
  imported waits for the editor to type it, as any Extend. An expression the engine hasn't typed yet means unknown
  columns, not an invalid step. Its columns' code is the engine's grammar of their lambdas. A Pivot is read whole
  (select, pivot, cast, renames); a Concat as it is, or converting types where Cube would. The core samples' Pivot
  and Concat now read back exactly (36 nodes in all).

- IP.5: `CubeEditor`'s `initialLambda` reads a host's lambda after the page opens (`CubeLambdaImportState`): the
  sources bound (`bindCubeLambdaSources`: ingest data sets and data products through the host's catalogs, tables on
  the cube's model; one kind per cube; a matview never a source), the steps read, a Filter by Expression's code from
  the engine's grammar, then opened with `openDocument`, no undo step. Once the cube's sources and expressions are
  settled it is written again and compared (`getCubeLambdaFidelity`): a banner says when Cube writes it another way
  or couldn't check it, or why it couldn't be read. A step read only one way (Limit, Group, Restrict…) is kept when
  Cube writes it another way, e.g. a sort Cube moves to just before the Limit; a Filter isn't, and stays as it is,
  as a Filter by Expression. A Sort step carries the IR with and without its sort, so the step after it is checked
  as Cube writes it. Studio: the button's menu lists the views (`getIngestMaterializedViews`), `open(ingest,
matView)`, the header button Add MatView or Save MatView (`ingestDefinition_updateMaterializedView`, in place).
  Checked headless on the dev server (`probe-edit-matview.mjs`, 9 checks): Add MatView, Edit MatView reads the
  two steps back with no banner, the Limit's 100 rows, Save MatView after changing it to 50, opened again with 50.

- IP.4: `readCubeQuery` reads the relation from its sources up (`findCubeLambdaSources` lists them for the host to
  bind first). Each step is written again by its emitter on the inferred schemas and kept only when it gives the same
  Pure; with the columns unknown, a step is taken unchecked, except a Filter with a plain negation (`!(…)`), kept as a
  Filter by Expression, since Cube's own negation keeps the empty rows of a column that can be empty. A sort that
  restates the order flowing in (Cube writes it before each Limit, Drop and Slice) is no new step; a Sort that ends a
  matview isn't in it. Inference reads a Filter by Expression as checked while reading; the step imported stays
  unchecked for the editor to check. Every sample built from these steps reads back into as many steps, written the
  same, as a matview and as Show Pure (34 nodes).

- IP.3: `V1_readCubeLambda` reads Cube's JSON and the engine's (the grammar's `minus(5)` for `-5`, decimals as JSON
  numbers, `JoinKind` by its short path, a sort's one key in a list, a table of the default schema as `#>{db.T}#`);
  `splitCubeLambda` takes a run's `from()` off; `isSameCubeIR` compares as the same Pure (bound variables and lets by
  position, numbers by value). Tested on every node of the core's spec samples that can be written (52), as a matview
  and as Show Pure, from Cube's JSON (lossless and plain) and through the local engine's grammar and back. The local
  engine has no `#I{}#` or `#P{}#` parser, so those shapes are tested from hand-written JSON.

- IP.1: a production build of Studio puts all of Cube's code in a chunk of its own (613 KB minified); the main bundle
  keeps Cube's shortcut configuration only (`LEGEND_CUBE_COMMAND_CONFIG`, a constant in a module with a type import
  only, and the builder is `sideEffects: false`).
