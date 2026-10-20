# Legend Cube: the expression editor, audit and plan (2026-10-19)

How to make writing Pure expressions in Cube better, and how hard a visual expression editor would be. It is based on
legend-studio (cube-dev at master `17a4261c7`), legend-engine (`93d92b48`, 2026-10-03), legend-pure (2026-10-02)
and probes run against the local engine on `:6300`. The evidence is in
`legend-cube-evidence/expression-editor/`.

## Summary

- **A much better code editor is cheap, and the engine already has what it needs.** The engine serves a catalogue
  of 348 Pure functions at `GET /api/pct/pct-docs.json`. It holds Markdown docs, signatures, operator symbols and test
  results per database, and it is 321 KB gzipped (0.18 s locally). With it the editor can show:

  - typed completions with docs;
  - hover documentation;
  - signature help;
  - a functions panel.

  Most of that needs no engine change, only new hover and signature-help hooks in legend-lego's `CodeEditor`.

- **A visual expression editor is feasible, but it is a project, not a feature.** Cube's IR can already hold an
  expression tree, and the check pipeline (parse, type, plan) stays as it is. Three things are hard:

  1. **Writing Pure text back.** The engine's own renderer can change what an expression means, so the editor needs
     its own printer that puts in every parenthesis.
  2. **Typing slots in the browser.** The engine types only whole lambdas, never a sub-expression, so the editor has
     to type each slot itself from the catalogue's signature strings: overloads, numeric widening, multiplicity.
  3. **Falling back for what it can't show.**

  A first visual editor for Extend, for the expressions most people write, takes a few iterations.

- **Two findings change how any editor should behave:**
  1. A failing compatibility test (PCT) doesn't mean the database can't run the function.
  2. A few functions give different answers depending on the database.

## 1. Today's editor

Filter by Expression and Extend Columns edit a one-row lambda (`x | …`) in Monaco. Once typing pauses it is parsed,
typed and planned by the engine, and the border turns green or red (PLAN §11.23). Its gaps:

- **Completions are a hand-written list** (`CubeExpressionCompletions.ts`): about 30 functions across text,
  numbers, dates and Variant, each with a one-line description, but no signatures and no docs. The engine's
  `completeCode` doesn't exist in legend-engine at all (§2.5). Only an internal build can serve it, and the
  open-source local engine has nothing.
- **No help while writing a call:** no hover, no signature help, no parameter names.
- **Precedence traps, which only show as type errors from the engine** (§2.4).
  - `&&` binds as tightly as `>`.
  - `$x.A + 1 == 3` means `$x.A + (1 == 3)`.
- **`[0..1]` friction.** Most scalar functions take `[1]`, so users must know to write `->toOne()`. The hint
  appears only after the engine refuses. `coalesce(value, default)` is a safer alternative, and Cube never offers
  it.
- **The column chips append `$x.COL` at the end of the code**, not at the cursor. (Fixed in I1.)
- **Only the first error is shown**, with its location.

## 2. What the platform gives us

### 2.1 A function catalogue, with docs: `GET /api/pct/pct-docs.json`

- **What serves it:** the engine server (`legend-engine-server-http-server/.../server/core/pct/PCT.java`, built by
  `GeneratePCTFiles` from legend-pure's `DocumentationGeneration`). Locally it gives 348 functions and 17 adapters.
- **Shape:**
  - `functionsDocumentation[]`: `functionDefinition{_package, name, sourceId, signatures[], tests[]}`.
  - Each signature is `{simple, id, documentation, grammarDoc, grammarCharacter, platformOnly}`, e.g.
    `meta::pure::functions::string::contains(String[1], String[1]):Boolean[1]`.
  - `documentation` is Markdown with Parameters, Returns and Examples.
  - `functionTestResults{"compiled:Store_Relational:DuckDB": {tests[{testName, success, errorMessage}]}}`.
- **Categories** come from the package (string, math, date, boolean, lang, multiplicity, variant, collection). The
  one-row candidates: string 46, math 63, date 22, boolean 12, plus `if`, `coalesce`, `in`, `toOne` and the Variant
  six.
- **Gaps:**
  - Signatures are strings: the editor parses `name(Type[mult], …):Type[mult]` itself.
  - Only `<<PCT.function>>` functions are listed, so `substring`, `indexOf` and `lastIndexOf` are missing. Cube keeps
    its own entries for those.
  - Snowflake and Databricks results are built only under the `pct-cloud-test` profile. They are absent locally;
    whether the internal engine has them is open (§8).
- **Also served at** `GET /api/dataCube/documentation/pct` (REPL server). Nothing in legend-studio reads either
  endpoint today.

### 2.2 A failing compatibility test doesn't mean the database can't run it (probe)

PCT counts every test of a function, and a single failing edge case marks it red. The probe runs each function as an
Extend column, the way Cube runs one, on H2 (Sports) and DuckDB (Sales). Results are in `probe-results.json`.

| Function                                                              | PCT on DuckDB / H2             | Runs on DuckDB and H2        |
| --------------------------------------------------------------------- | ------------------------------ | ---------------------------- |
| `year`, `monthNumber`, `hour`, `minute`                               | 0 of 1 (or 2) pass             | yes                          |
| `dayOfMonth`                                                          | 1 of 2                         | yes                          |
| `toString` (number)                                                   | 8 of 19 (DuckDB), 6 of 19 (H2) | yes                          |
| `adjust`, `dateDiff`, `datePart`                                      | 9/17, 7/9, 2/4                 | yes                          |
| `dayOfWeek`                                                           | –                              | **no**: a cast error on both |
| `contains`, `toUpper`, `trim`, `abs`, `round`, `coalesce`, `if`, `in` | all pass                       | yes                          |

**So PCT results must be informational, never a filter.** For example: "3 of 4 engine tests pass on DuckDB",
with the failing test names on hover. A function can be hidden only for a database where a hand-checked list or
the manifests' `expectedError` says it can't run.

### 2.3 Some functions answer differently by database (probe)

| Expression               | H2 (Sports)                | DuckDB (Sales) | Pure's meaning                                |
| ------------------------ | -------------------------- | -------------- | --------------------------------------------- |
| `'Asia …'->indexOf('a')` | 4                          | 3 for `France` | 0-based: 3 and 2. Both databases are 1-based. |
| `->substring(0, 2)`      | `Eu`                       | `F`            | `Eu`, `Fr`: DuckDB is off by one              |
| `->lpad(12, '*')`        | `Europe Golf ` (truncates) | `******France` | –                                             |

The editor should mark these with a "results differ by database" note in their docs. They are worth an engine issue
too (ISSUES.md).

### 2.4 Precedence and the engine's renderer (probe)

How the engine parses (shape of the parsed lambda):

| Code                        | Parsed as                                       |
| --------------------------- | ----------------------------------------------- |
| `$x.A + 1 == 3`             | `plus([$x.A, equal(1, 3)])`                     |
| `$x.A > 0 && $x.A < 30`     | `lessThan(and(greaterThan($x.A, 0), $x.A), 30)` |
| `($x.A > 0) && ($x.A < 30)` | `and(greaterThan(…), lessThan(…))`              |
| `!$x.B->isEmpty()`          | `not(isEmpty($x.B))`                            |
| `-1->abs()`                 | `minus(abs(1))`                                 |
| `$x.A != 3`                 | `not(equal($x.A, 3))`                           |

legend-pure's grammar is flat: a run of arithmetic and a run of booleans are each ordered, but runs combine left to
right (`AntlrContextToM3CoreInstance.java`).

**The engine's renderer (JSON to grammar) can change what an expression means.** In the round-trip probe, built IR
is rendered by the engine, parsed back and compared:

- `and`, `or`, `not`, `divide`/`minus` and `times` of `plus` come back the same. The engine puts parentheses
  around comparisons next to `&&` and `||`.
- `equal(plus($x.A, 1), 3)` is rendered as `$x.A + 1 == 3`, which parses as `plus($x.A, equal(1, 3))`.

So text from the engine can't be trusted for anything Cube writes as a tree. That also touches today's Show Pure, and
the code of an imported expression, which Cube asks the engine to render. Worth an engine issue.

### 2.5 Typing and completion services

- **Typing:**
  - `lambdaReturnType` returns a type path without multiplicity.
  - `lambdaRelationType` and its batch form return a relation's columns.
  - Errors come one at a time, with `sourceInformation`.
- **Missing:** the type of a sub-expression, a type at a cursor, hover, and several diagnostics at once.
  `Compiler.getLambdaReturnGenericType` exists in Java but has no endpoint.
- **`completeCode` is not in legend-engine.** The REPL's `Completer` (`legend-engine-repl-client/.../Completer.java`)
  serves DataCube's typeahead (`/api/dataCube/typeahead`), and it is weaker than Cube's own list:

  - fixed lists by type;
  - `[0..1]` treated as many;
  - nothing for dates or Booleans;
  - no docs.

  Keep Cube's engine path as an extra for the internal build, and invest in the catalogue.

### 2.6 What Studio already does

- **Structured editing with a code fallback:**
  - Data Quality's GUI/TEXT toggle (`LambdaEditorWithGUIState.ts`) switches to GUI only after the code is read into
    its node model. GUI edits are written back as JSON, then formatted by the engine.
  - Query Builder falls back one projection column at a time (`INTERNAL__UnknownValueSpecification`), not for the
    whole query.
  - DataCube's filter operations pair "build from an expression (or say not mine)" with "build the expression", on
    V1 JSON.
- **Not reusable as is:**
  - legend-graph's metamodel builder throws for functions it doesn't know, unless a plugin registers them.
  - Query Builder and DataCube aren't dependencies of the builder, and shouldn't be.
- **No function documentation, signature help or general expression builder exists anywhere in the repo.**

### 2.7 What Cube already has

- **The IR holds an expression tree:** `func`, `property`, `var`, `lambda`, `literal`, `collection`, `enumValue`,
  `genericType`.
  - Expressions are stored as engine JSON.
  - `CUBE_EXPRESSION_CODEC` reads JSON into IR and writes IR back as JSON.
  - `isSameCubeIR` tells whether two trees are the same.
  - Quirk: `plus`, `minus` and `times` take one collection (`plus([a, b])`).
- **Filter by Column** has a structured condition model: column, operator, literal, with And, Or and Not.
  - Operators by type family.
  - A reader that maps a lambda back to conditions, or falls back to Filter by Expression.
- **Types in the browser:** schemas, type families, inferred nullability, aggregation and window function lists.
- **The checks** (parse, Cube's own rules, type, plan) work on the JSON. A visual editor reuses them unchanged.

## 3. Options

- **A. A smarter code editor.** Catalogue-driven completions, docs, signature help, a functions panel, quick fixes
  and precedence warnings. Low risk, and it helps every user at once.
- **B. A visual expression editor.** Columns, functions, operators and values as nested blocks with typed slots,
  written as Pure, with a Visual or Code toggle per expression. Its value is for users who don't write Pure. It
  removes precedence and `toOne` mistakes by construction.
- **C. Engine asks** (outside this repo):
  - sub-expression types at a position;
  - several diagnostics at once;
  - a renderer that keeps meaning (§2.4);
  - functions per database dialect;
  - `substring` and `indexOf` in the catalogue;
  - Snowflake and Databricks results in deployed docs.

Recommended: **A first, B on top of A's catalogue**, C filed as issues. A's catalogue client is also B's type source,
so nothing is thrown away.

## 4. The visual editor: design

**Scope.**

- Extend columns first, then Filter by Expression.
- Not window or aggregation functions: they live inside `over` and `groupBy` lambdas, which Partition and Group
  already pick structurally.
- Filter by Column stays the structured filter. A visual Filter by Expression covers what it can't: arithmetic,
  functions, comparing two columns. Note that Filter by Column keeps NULL rows when a condition is negated, and a
  plain `!` doesn't. The visual filter must use one rule and say which.

**The model.** An expression is a tree of:

- a **column** (`$x.NAME`, with type and nullability from the input schema, and the new columns above it in
  Extend);
- a **value**: string, integer, float, decimal, Boolean, date, date-time, enum, or a list for `in`;
- a **call**: a catalogue function by `id`, with one slot per parameter;
- an **operator**: `+ - * /`, comparisons, `&&`, `||`, `!`, `!=`. The catalogue's `grammarCharacter` maps
  operators to functions;
- an **empty slot**, carrying the type it expects.

**Typing in the browser, for slot pickers.**

- Parse the catalogue's signature strings into parameter and return types with multiplicity.
- Pick overloads by the types of the slots filled so far.
- Apply Pure's rules:
  - Integer + Float is Number;
  - `/` returns Float;
  - StrictDate and DateTime are both Date;
  - Variant's `get` and `to` return `[0..1]`.
- Where a slot needs `[1]` and gets `[0..1]`, offer `toOne()` or `coalesce(…, default)`.
- The engine's check stays the authority: the browser only narrows the pickers.

**Writing and reading.**

- Visual to IR, then `CUBE_EXPRESSION_CODEC.write` to JSON, stored as today.
- The code shown is printed by Cube's own printer, which puts in every parenthesis (not the engine's renderer;
  §2.4).
- Code to visual: JSON to IR (`codec.read`), then to the tree, when every node is a known catalogue function, a
  column, a value or an operator. Otherwise the expression stays in code, as Data Quality does.
- A later iteration shows an unknown sub-expression as a "code" block inside the visual tree, as Query Builder does
  per column.
- Each switch is checked by printing, parsing and comparing with `isSameCubeIR`. If it isn't the same, stay in
  code.

**The UI**, as a sketch to iterate on: one line of blocks per expression, like a spreadsheet formula with structure.

```
TOTAL  =  [ price ▾ ]  ×  [ coalesce ▾ ( [ amount ▾ ] , [ 0 ] ) ]          Code ⇄ Visual
          Number         Number                                            ● ready
```

- Each block is a menu: columns, functions by category with docs, operators, a value.
- An empty slot shows the type it expects.
- Each function's PCT result for the cube's database shows as information.

## 5. How hard

| Part                                                               | Difficulty    | Why                                                       |
| ------------------------------------------------------------------ | ------------- | --------------------------------------------------------- |
| Catalogue client (load, parse signatures, index by type, fallback) | low           | one endpoint, string parsing                              |
| Completions, hover and signature help from the catalogue           | low to medium | new Monaco providers in legend-lego's `CodeEditor`        |
| Quick fixes and precedence warnings                                | medium        | needs the parsed lambda's shape and locations             |
| Visual: model, menus, printing, toggle                             | medium        | Cube's IR and checks carry most of it                     |
| Visual: typing slots in the browser                                | **high**      | overloads, widening and multiplicity, without engine help |
| Visual: reading arbitrary code back, with code blocks inside       | **high**      | fidelity, partial fallback, keeping user text             |
| Dates, Variant paths, lists, `if`                                  | medium        | extra value editors, enum arguments (`DurationUnit`)      |

Rough sizes per iteration are in §6. Weeks are deliberately left out until iteration 1 has measured the catalogue
work.

## 6. Iterations

Each iteration is one PR into cube-dev, demoed with a video.

1. **I1: the catalogue in the code editor.**
   - A client that loads `pct-docs.json` once per session (falling back to today's list when the endpoint is
     missing), parses signatures, and indexes by type family and multiplicity.
   - Completions after `->` with signatures and Markdown docs.
   - Hover docs on a function name.
   - Signature help inside `fn(`.
   - Chips that insert at the cursor.
   - legend-lego's `CodeEditor` gains hover and signature-help sources, as it gained `completions` in #5725.
   - **Built** (branch `cube-function-catalogue`):
     - `CubeEngine.getFunctionCatalogue()` reads `{engine}/pct/pct-docs.json` once per engine. A missing route
       (404, or the 500 that wraps one) means none for the session; another failure is asked again.
     - `CubeFunctionCatalogue.offersFor(family)` gives the functions whose first parameter takes a value of the
       type (or any value). It leaves out operators, platform-only signatures, lambdas, relations, and functions
       of many values (except `isEmpty`, `isNotEmpty` and `toOne`).
     - Completions: Cube's own list first, now with signatures and docs, then the rest by name. `toOne` and
       `coalesce` come first for an optional column. `substring` and `indexOf` stay, though the catalogue hasn't
       them. Picking a function with arguments opens its signature help.
     - Hover over a function's name (after `->` or before `(`), and signature help in the innermost call, its
       active argument counted past strings, lists and lambdas. Both are registered for the editor's lifetime,
       answering for its own model only.
     - The chips and the JSON fields tree write at the cursor once the code has been clicked into, else at the
       end as before.
     - Without the catalogue, everything is as before.
2. **I2: help before the engine refuses.**
   - A functions panel: categories, search, docs, and click to insert at the cursor.
   - Quick fixes: wrap in `toOne()` or `coalesce(…, 0)`; add parentheses around comparisons.
   - A warning while typing for the two precedence traps, from the parsed shape.
   - The database's PCT result and the "results differ by database" notes in the docs.
3. **I3: the visual editor for Extend (MVP).**
   - Columns, values, operators and about 25 scalar functions, with typed slots.
   - Cube's own printer.
   - Code ⇄ Visual, offered only when the tree round-trips.
4. **I4: the visual editor for Filter by Expression**, and the NULL rule for negation.
5. **I5: code blocks inside the visual tree**, so any expression opens visually with its unknown parts as code.
6. **I6: dates, Variant and lists.** `adjust` and `dateDiff` with `DurationUnit`, Variant `get` and `to` from the
   JSON fields tree, lists for `in`, and `if`.

## 7. Engine issues to file

- JSON to grammar writes `equal(plus(a, 1), 3)` as `a + 1 == 3`, which parses differently (§2.4).
- `indexOf` is 1-based on H2 and DuckDB, and DuckDB's `substring(0, n)` is off by one (§2.3).
- Asks:
  - `substring`, `indexOf` and `lastIndexOf` are not in the function catalogue;
  - Snowflake and Databricks PCT results are only built in cloud profiles;
  - an endpoint for a sub-expression's type, and several diagnostics at once.

## 8. Open questions

- Does the internal engine serve `/api/pct/pct-docs.json`, with Snowflake and Databricks results? The design works
  without them.
- Does the internal engine serve `completeCode`? If so, its completions stay as an extra.
- Which visual style to start from: one line of blocks (above), or an outline tree for long expressions?
- Should the visual Filter by Expression replace Filter by Column for new users, or sit beside it?

## Evidence

In `legend-cube-evidence/expression-editor/`:

- `pct-docs-local-6300.json`: the catalogue from the local engine.
- `pct-coverage.txt`: functions by package, and PCT pass counts by database.
- `ExpressionEditorProbe.engine-roundtrip-test.ts`: the probe, and its output `probe-results.json`. It covers:
  - functions run on H2 and DuckDB;
  - parse shapes;
  - the renderer round trip.
