# Legend Cube: Import Pure, and Edit MatView in Studio, progress

PLAN §11.18. Built on `cube-import-pure`, branched from #5690's head, then moved onto `master` (`b33fba599`) once
#5690 merged (user, 2026-10-14), in a PR into `master`.

## Current state

In progress (2026-10-14): IP.1–IP.4 done; the draft PR is finos/legend-studio#5694.

## Steps

- [x] IP.1 Lazy loading in Studio: Cube loads with its dialog, on the first opening
- [x] IP.2 The plan section, this file, a draft PR
- [x] IP.3 Protocol JSON to IR (`V1_readCubeLambda`) and the run's own parts, tested on Cube's JSON and on the
      engine's (JSON to grammar to JSON)
- [x] IP.4 IR to steps, a first slice: ingest and data product sources as bound; Filter, Group, Restrict, Sort,
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

| Step | Commit      | What                                                                                      |
| ---- | ----------- | ----------------------------------------------------------------------------------------- |
| IP.1 | `ed466c7de` | Cube loads lazily in Studio                                                               |
| IP.2 | `d1d9c4475` | The plan section, this file                                                               |
| IP.3 | `e258ad719` | Protocol JSON to IR, the run's own parts, IR comparison                                   |
| IP.4 | this commit | IR to steps: sources, Filter, Group, Restrict, Sort, Limit, Drop, Slice, Distinct, Rename |

## Notes

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
