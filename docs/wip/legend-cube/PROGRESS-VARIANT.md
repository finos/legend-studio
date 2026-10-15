# Legend Cube: Variant (JSON) columns, progress

PLAN §11.20. Built on `cube-variant`, from `master` (`dd0b62af9`), in a PR into `master`.

## Current state

V.4 done (2026-10-15): Explore JSON. Next: V.5, Parse as JSON and the DuckDB sample.

## Steps

- [x] V.1 The plan section, this file, ISSUES.md's engine drafts, a draft PR
- [x] V.2 The readable Variant cell, and Open JSON's tree dialog
- [x] V.3 Shape inference and the offers
- [x] V.4 Explore JSON: the sample through Runs, Read every row, the dialog, the new Extend
- [ ] V.5 Parse as JSON, and the DuckDB `demo.events` sample with its example
- [ ] V.6 Explode Array: core node, codec, emission, database refusal, editor, palette
- [ ] V.7 Verification, and a demo video
- [ ] V.8 Fold the supersessions in

## Commits

| Step | Commit      | What                         |
| ---- | ----------- | ---------------------------- |
| V.1  | `39db34ea9` | The plan                     |
| V.2  | `4fd4b5cd4` | The readable cell, Open JSON |
| V.3  | `bdb5acd53` | Shape inference, the offers  |
| V.4  | this commit | Explore JSON                 |

## Notes

- V.4:

  - **The state:** `CubeJsonExplorerState` reads the column through `runCubeQuery`: the query up to the node that
    ran, then a Restrict to the column and an Is Not Empty filter.
    - The first 1,000 values are listed in Runs as "Sample of payload"; Read every row, with no limit, as "Every value
      of payload". Either can be stopped, keeping what was read.
    - Ticked offers are parsed by the engine and added as one Extend after the node that ran, one undo step. Names
      are free, folded. A parse error keeps the dialog open with the message.
  - **Refusals:** a database outside `VARIANT_DATABASE_TYPES` (core, `getVariantDatabaseProblem`): Snowflake,
    Databricks, Postgres, DuckDB. The model's outline is loaded first, since the run that showed the rows may not
    have needed it. Also the grid's blockers, now shared as `getCubeGridActionBlocker`.
  - **Menus:** "Explore JSON…" in a Variant cell's menu, after Open JSON, and first in its header's menu
    (`getMainMenuItems`, typed from `DataGridOptions`, so legend-lego is unchanged). Disabled with the reason.
  - **The dialog:** status line, Read every row or Stop, a searchable field tree with kinds and shares, the picked
    field's breadcrumb, values seen and offers to tick, and "Add N columns". Explode offers wait for V.6's node.
  - **Plan change:** Read every row goes through `runCubeQuery` rather than the CSV export.
  - **Tests:** the state (7), the dialog (4), the menus, the core rule. The engine test runs all 19 offers of a
    sample on DuckDB through Cube's own parse, typing and run, and checks values and types: strings, a Float from
    whole numbers and fractions, Boolean, StrictDate, counts, lists, contains, totals, keys, the first element as
    JSON. The DuckDB file is made through a direct connection, then read through a text model.

- V.3:

  - **The shape:** `stores/variant/CubeJsonShape.ts` builds it from cells as the grid gets them. Numbers are read by
    their text; a whole number past 64 bits counts as text. Per position it keeps presence, nulls, kinds, the top 50
    values, fields in the order first seen, and its arrays' elements and lengths.
  - **The conservative type** (`getCubeJsonScalarType`):
    - one kind is that kind;
    - whole numbers with fractions are Float;
    - any other mix is String, dates with date-times included.
  - **The offers:** `CubeJsonOffers.ts` builds the field tree, each field's offers as Pure text, default names (path
    joined by `_`), and `getFreeCubeColumnName`, compared folded. `columnAccessOf` moved from the Extend editor to
    `stores/CubePureText.ts`, with `pureStringLiteral`, for the offers' text.
  - **Probed on DuckDB** (`variant/probe-offers.out.txt`):

    - the list as text: an empty list gives empty;
    - keys with the short `Variant` name;
    - contains on whole numbers and on floats written with a point;
    - the first element as JSON, and its field;
    - the total.

    A Boolean contains isn't probed: the probe's own list literal is an excluded form.

  - Tests: 21 (shape and offers).

- V.2:

  - `stores/variant/CubeJson.ts` reads a document with numbers kept as written and keys in their order (a JS object
    would put integer-like keys first). It shows it on one line, in legend-lite's notation, or indented for Copy.
  - `formatCellValue` gives a Variant its one-line form in both grids. The cell's title keeps the JSON as sent.
  - "Open JSON" in a Variant cell's menu (both grids' menus share `getCubeGridContextMenuItems`) opens
    `CubeJsonViewerDialog`. It is disabled on an empty cell and a group row's.
  - Tests: the reader, the line and indented forms, the cell, the menu, the dialog's tree and Copy JSON.
  - Seen in the browser at V.5, once the DuckDB sample gives a local Variant column.

- V.1: the analysis, its probes and the user's answers are in the evidence folder's `variant/`. Three engine drafts
  are in ISSUES.md: schema exploration's JSON columns, `toMany(@String)->contains`, and `exists`. The
  `to(@T)`-without-error exclusions are already listed in the engine's manifests.
