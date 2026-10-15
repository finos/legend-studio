# Legend Cube: Variant (JSON) columns, progress

PLAN §11.20. Built on `cube-variant`, from `master` (`dd0b62af9`), in a PR into `master`.

## Current state

V.3 done (2026-10-14): shape inference and the offers. Next: V.4, Explore JSON.

## Steps

- [x] V.1 The plan section, this file, ISSUES.md's engine drafts, a draft PR
- [x] V.2 The readable Variant cell, and Open JSON's tree dialog
- [x] V.3 Shape inference and the offers
- [ ] V.4 Explore JSON: the sample through Runs, Read every row, the dialog, the new Extend
- [ ] V.5 Parse as JSON, and the DuckDB `demo.events` sample with its example
- [ ] V.6 Explode Array: core node, codec, emission, database refusal, editor, palette
- [ ] V.7 Verification, and a demo video
- [ ] V.8 Fold the supersessions in

## Commits

| Step | Commit      | What                         |
| ---- | ----------- | ---------------------------- |
| V.1  | `39db34ea9` | The plan                     |
| V.2  | `4fd4b5cd4` | The readable cell, Open JSON |
| V.3  | this commit | Shape inference, the offers  |

## Notes

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
