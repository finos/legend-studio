# Legend Cube: Variant (JSON) columns, progress

PLAN §11.20. Built on `cube-variant`, from `master` (`dd0b62af9`), in a PR into `master`.

## Current state

V.9 done (2026-10-15): a JSON column's fields in the Extend and Filter by Expression editors, asked for by the user after the milestone. PR #5698 stays a draft until the user says it is ready.

## Steps

- [x] V.1 The plan section, this file, ISSUES.md's engine drafts, a draft PR
- [x] V.2 The readable Variant cell, and Open JSON's tree dialog
- [x] V.3 Shape inference and the offers
- [x] V.4 Explore JSON: the sample through Runs, Read every row, the dialog, the new Extend
- [x] V.5 Parse as JSON, and the DuckDB `demo.orders` sample with its example
- [x] V.6 Explode Array: core node, codec, emission, database refusal, editor, palette
- [x] V.7 Verification, and a demo video
- [x] V.8 Fold the supersessions in
- [x] V.9 A JSON column's fields in the Extend and Filter by Expression editors

## Commits

| Step | Commit      | What                         |
| ---- | ----------- | ---------------------------- |
| V.1  | `39db34ea9` | The plan                     |
| V.2  | `4fd4b5cd4` | The readable cell, Open JSON |
| V.3  | `bdb5acd53` | Shape inference, the offers  |
| V.4  | `b1439c2e7` | Explore JSON                 |
| V.5  | `c24a80119` | Parse as JSON, the sample    |
| V.6  | `5bf49334d` | Explode Array                |
| V.6  | `b7ca6d5c3` | After review                 |
| V.7  | `07da55e56` | Review, rehearsal, video     |
| V.8  | `33a02c282` | Supersessions folded         |
| V.9  | `d5f68fabf` | Fields in the editors        |
| V.9  | this commit | Polish, docs, video 32       |

## Notes

- V.9 (user, 2026-10-15: "can't the Extend's Variant column have an explore tool, with an ad hoc query, so no
  execution is needed?", shown a mockup first; Filter by Expression too; the grid's dialog kept):

  - **The state** `stores/variant/CubeJsonFieldsState.ts`, one per Extend or Filter by Expression draft: the column
    open, its sample read just before the node through `readCubeJsonSample` (listed in Runs), the search, folded
    fields, the field whose forms show; refused where the database has no Variant functions.
  - **The tree** `components/editors/CubeJsonFieldsTree.tsx`: `{}` and a caret beside a Variant chip, then under the
    chips the status (Read again, Read every row, Stop), Find a field, and the fields: a click writes the field's
    expression (`getCubeJsonFieldDefault`), "+ column" adds it as an Extend column (`CubeExtendDraft.addColumn`),
    "···" lists its other forms, one row per element greyed. The field filter moved to `filterCubeJsonFields`,
    shared with the dialog.
  - **Rebased** on master `bcbea2a1d` (#5697, the release #5672, #5699): clean; `check:changeset` passes against
    finos master (the fork's `origin/master` is behind, so it lists every bumped package there).
  - **Tests:** the state (4), the editors (5). **Video 32** (`videos/32-variant-json-editors.webm`, script
    `demo/variant/demo-variant-editors.mjs`): Order lines from JSON; the second Extend's `{}` on `item`, its fields
    read before the step; + column on price, validated and run; Filter by Expression on qty > 1, 6 lines.

- V.8: §11.20 folded into §7.8 (`jsonViewer`, `jsonExplorer`, Runs' JSON samples), §9 (a Variant block: the one-line
  cell, the menus, Explore JSON), §11.4 (Explode Array, the one operation that takes a Variant column) and §10.3 (the
  `explode` node's saved form). The core guide names Explode Array as the example of an allow-list of databases and
  gains a section on Import Pure's reader; the builder guide names its editor's sample.

- V.7:

  - **Review:** the advisor's points (what follows an Explode, data products, the name and Find arrays) are fixed in
    `b7ca6d5c3`; a sweep of the branch's diff finds no stray log, `.only` or `.skip`, a 2026 header on every new
    file, and `V1_` imports only in the DuckDB engine test.
  - **The browser, on :9002:** Order lines from JSON opens and runs (4 steps, 12 rows: products and quantities, the
    order with no lines and the one with no document once each); its Explode editor's Find arrays reads a sample
    (listed in Runs) and lists `items`, picked, and `tags`. A lateral join keeps no order, so the example now sorts
    the lines by order, product and quantity.
  - **The video** (`videos/31-variant-json.webm`, 1:14, script `demo/variant/demo-variant.mjs`): the one-line cell,
    the cell menu and Open JSON's tree, Parse as JSON on the text column, Explore JSON (a country column and one row
    per element, 12 rows), Explore JSON on the element (product and qty), the Explode editor, the refusal on H2. Four
    captions were reworded or their frames changed until each said only what the screen shows.

- V.6:

  - **The core node** `Explode` (`explode`, "Explode Array", after Extend): a Variant column, keys to its array (none
    when the column is the array), the new column's name. Its schema is the input's plus the element, a nullable
    Variant. It validates the column (named, in the input, a Variant), no empty key, and the name (valid, no input
    column's, folded). No row order: the engine writes a lateral join.
  - **Emission:** `lateral(x | $x.<col>->get('k')…->toMany(@Variant)->flatten(~<name>))`, origins `explode`. Refused
    outside `VARIANT_DATABASE_TYPES` in the palette, the node's problems and the emitter; it makes a run load the
    database type.
  - **Saved spec:** `column`, `path`, `name`, always written. Import Pure's reader reads `lateral` in this form.
  - **The builder:** a draft and an editor (Find arrays from a sample, keys as rows, the name following the keys
    until typed), help text, the split-arrows icon. Explore JSON's "one row per element" adds the Explode after its
    Extend, one undo step (`CubeEditorState.addConfiguredNodes`), one array at a time. The sample read is shared
    (`stores/variant/CubeJsonSampling.ts`).
  - **The example** "Order lines from JSON" (Sales, DuckDB): 12 rows.
  - **Engine:** every dialect keeps an empty array's row (source and plans); run on DuckDB, with an empty path, an
    Extend reading the element, and the typing. The engine types the element `[1]` (drafted in ISSUES.md), and
    Postgres's plan reads elements as text, which may fail for strings (drafted, unconfirmed).
  - **A V.5 gap fixed:** the Import Pure read-back engine test skipped "Orders from JSON"'s untyped Extend. Both
    engine tests now type each Extend as opening an example does (`__test-utils__/CubeExampleTestUtils.ts`).
  - **Tests:** the node (10), emission and databases (7), the spec (5) and validity, the reader, the draft (4), the
    editor (3), Explore JSON (3), conformance, the DuckDB engine tests (3), the plans on 4 databases and the refusal
    on 16.
  - **After review (advisor):** what follows an Explode is run on DuckDB too: Explore JSON's read of the element (3
    rows: the rows kept without one drop out), a Group sum of an element's field, a Filter on an input column, a
    Sort then a Limit; the element read is planned on all four databases. A data product cube (Snowflake) allows
    Explode and Explore JSON, H2 refuses them. A node named as Explore JSON names it still follows its keys, and Find
    arrays is greyed, with the reason, where JSON isn't read. Postgres isn't available here (no Docker), so its
    string-array suspicion stays a draft.

- V.5:

  - **Parse as JSON** (`stores/variant/CubeJsonParse.ts`) is offered on a text cell holding a JSON object or array,
    so plain text columns get no item. It adds `<name>_json: $x.<name>->toOne()->fromJson()` as an Extend after the
    node that ran, once the engine parses it. It is refused where JSON isn't read, and blocked as the quick actions
    are.
  - **The sample:** Sales (DuckDB) gains `demo.orders`, 8 orders as JSON text, one with no document. The example
    "Orders from JSON" carries the Extend with the engine's parse of its text.
  - **Fixes:** the examples' engine test types each Extend before checking validity, and allows an Extend column's
    wider nullability (§11.7). `CubeExamplesState.openExample` now waits for expressions to be typed before it
    runs: the example didn't run on open.
  - **Seen in the browser on :9002:**
    - the example runs on open: 8 rows, `document_json` on one line;
    - the cell menu shows Open JSON and Explore JSON…;
    - the JSON tree;
    - Explore JSON reads all 7 documents: tier at 86%, placed a date, paid true or false;
    - the offers of `items`;
    - Add 2 columns adds an Extend that types and runs: the first order's quantity total is 3.

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
