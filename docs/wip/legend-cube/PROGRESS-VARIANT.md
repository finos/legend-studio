# Legend Cube: Variant (JSON) columns, progress

PLAN §11.20. Built on `cube-variant`, from `master` (`dd0b62af9`), in a PR into `master`.

## Current state

V.2 done (2026-10-14): the readable cell and Open JSON. Next: V.3, shape inference and the offers.

## Steps

- [x] V.1 The plan section, this file, ISSUES.md's engine drafts, a draft PR
- [x] V.2 The readable Variant cell, and Open JSON's tree dialog
- [ ] V.3 Shape inference and the offers
- [ ] V.4 Explore JSON: the sample through Runs, Read every row, the dialog, the new Extend
- [ ] V.5 Parse as JSON, and the DuckDB `demo.events` sample with its example
- [ ] V.6 Explode Array: core node, codec, emission, database refusal, editor, palette
- [ ] V.7 Verification, and a demo video
- [ ] V.8 Fold the supersessions in

## Commits

| Step | Commit      | What                         |
| ---- | ----------- | ---------------------------- |
| V.1  | `39db34ea9` | The plan                     |
| V.2  | this commit | The readable cell, Open JSON |

## Notes

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
