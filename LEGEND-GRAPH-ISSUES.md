# legend-graph type and relation issues

> **What this is:** the defects in `@finos/legend-graph` (plus a few in its direct consumers) that block typing
> relations from model definitions instead of calling the engine, and that already break Studio, Query and data
> products today. Each issue was re-verified on 2026-10-06 at `cubeV1` HEAD `ec129bd50` (legend-graph unchanged
> since master `2f1ad2c75`), against a live engine (legend-engine `93d92b4852`, Pure `5.105.0`) on `localhost:6300`.
> **Why:** Legend Cube needs to type relational tables locally from the `Database` definition (and later data
> products and ingest definitions) through legend-graph, instead of one engine `lambdaRelationType` call per relation
> (PROGRESS.md, open item "To revisit: type tables locally"; PLAN.md D10/D12, §5, M2.0, Appendix B).
> **For the fixer:** this file is self-contained. Fix in a separate branch off `master`, one PR per group below.
> Evidence markers: **ran** = executed (Node against `packages/legend-graph/lib`, or engine calls); **traced** = code
> path read end to end; **inferred** = not executed.

## How to reproduce

- Engine: legend-engine from IntelliJ on `localhost:6300` (anonymous auth). Useful endpoints:
  `POST /api/pure/v1/grammar/grammarToJson/model` and `.../grammarToJson/lambda` (text/plain body),
  `POST /api/pure/v1/compilation/lambdaRelationType` (`{lambda, model}`),
  `POST /api/pure/v1/compilation/lambdaRelationType/batch`.
- Harness scripts (copied out of `/tmp`, may still reference `/private/tmp/...` for their own outputs):
  `/Users/mauriciouyaguari/Goldman Sachs/legend-cube-evidence/lg-issues/`:
  - `relation-types/`: `batch.mjs`, `lib_probe.mjs`, `lossy.mjs`, `lossy2.mjs`, `errors.mjs`, `usertype.mjs`,
    `meta_convert.mjs`, `variant_sys.mjs`, captured `batch_resp.json`, `single_resp.json`;
  - `local-typing/`: `probe.mjs` (engine typing per column type), `probe2.mjs` (views, paths, includes, `nullable`
    omitted), `harness.mjs` + `run1.mjs`…`run4.mjs` (local accessors, value-spec round trips, quoted names, ingest);
  - `valuespec/`: `h.mjs` (GraphManagerState from `Core_GraphManagerPreset` + `QueryBuilder_GraphManagerPreset`,
    `NOQB=1` drops the latter; `roundtrip(text)`), `t_accessor.mjs`, `t_colspec.mjs`, `t_v1rt.mjs`, `t_fn2b.mjs`,
    `t_gti*.mjs`, `t_var.mjs`, `t_precise_lit.mjs`, `t_types.mjs` (`MODEL=$PWD/model2.pure`), `t_dotted.mjs`;
  - `precise-primitives/`: `probe1.mjs`…`probe8.mjs`, `alltypes.mjs`, `model1.pure`, `model2.pure`, `pmcd*.json`.
- The scripts import `packages/legend-graph/lib` (build it first: `yarn workspace @finos/legend-graph build`).
- Changesets: every fix needs a `patch` changeset for each touched library. Removing or renaming exported members
  (e.g. `PRECISE_PRIMITIVE_TYPE` entries, `getPrimitiveTypeEnumFromPrecisePrimitiveTypeEnum`, `RelationTypeMetadata`)
  is `major` (AGENTS.md); prefer deprecated aliases to stay `patch`.

## Summary

| #     | Issue                                                                                               | Severity                     | Group |
| ----- | --------------------------------------------------------------------------------------------------- | ---------------------------- | ----- |
| LG-1  | Batch relation-type call reads `results`; the engine returns `result`, so every call throws         | **high** (live bug)          | C     |
| LG-2  | Tests mock the wrong `results` key, hiding LG-1                                                     | high                         | C     |
| LG-3  | Studio data-product editor swallows the batch failure and sticks a false warning                    | high                         | C     |
| LG-4  | Data-product viewer turns failures into `undefined`, which can win `Promise.any`                    | medium                       | C     |
| LG-5  | Accessor lookup ignores the schema: `#>{db.S2.T}#` resolves to `S1.T`, and save rewrites it         | **high** (live bug)          | A     |
| LG-6  | Two-part path `#>{db.T}#` resolves to the first table of the first schema                           | **high** (live bug)          | A     |
| LG-7  | Views and included databases can't be accessors                                                     | medium                       | A     |
| LG-8  | Quoted column names keep their quotes in accessor relation types                                    | medium                       | A     |
| LG-9  | `PrecisePrimitiveType` has no package and is indexed by short name                                  | high                         | B     |
| LG-10 | `PRECISE_PRIMITIVE_TYPE` has 3 phantom paths and a wrong `TIMESTAMP`                                | medium                       | B     |
| LG-11 | Precise types have no supertype or arity (`Varchar` is not a `String` to `isSubType`)               | medium                       | B     |
| LG-12 | Three precise→standard maps disagree; short-name lookup collides with standard names                | medium                       | B     |
| LG-13 | Precise types can't be listed or picked; their visitor throws                                       | low                          | B     |
| LG-14 | Type parameters dropped on properties, derived properties and lambda parameters; hashes ignore them | **high** (live bug)          | D     |
| LG-15 | `@Type` (genericTypeInstance) loses parameters, and the transformer throws for non-classes          | low (latent)                 | D     |
| LG-16 | Literals of a precise type throw in the transformer                                                 | low (latent)                 | D     |
| LG-17 | `V1_ColSpec` uses the old `type: string` protocol; the type is dropped everywhere                   | medium                       | D     |
| LG-18 | Single ColSpec transform writes `function1` into `function2`                                        | low (latent)                 | D     |
| LG-19 | `getLambdaRelationType` → `RelationTypeMetadata` drops parameters and column metadata               | medium                       | C     |
| LG-20 | Three `RelationTypeMetadata` → `RelationType` converters, two lossy                                 | medium                       | C     |
| LG-21 | `V1_buildRelationTypeFromV1RelationType` throws on one unresolvable column                          | medium                       | C     |
| LG-22 | Relation-type calls don't map an engine 400 to `CompilationError`                                   | low                          | C     |
| LG-23 | Client-side relational column typing disagrees with the engine on 15 of 18 types                    | **blocker** for local typing | E     |
| LG-24 | Column multiplicity rule for `nullable === undefined`                                               | medium                       | E     |
| LG-25 | View columns are built as an invented `VARCHAR(50)`                                                 | medium                       | E     |
| LG-26 | Ingest/matview typing strips packages and parameters; unknown types silently become `String`        | medium                       | E     |
| LG-27 | Studio `MockDataUtils` has a second, more divergent relational→primitive map                        | low                          | E     |
| LG-28 | Data Cube synthesizes tables without nullability and with lossy/misspelt type mappings              | medium                       | E     |
| LG-29 | Execution results are parsed lossily by default (ints > 2^53, decimal scale)                        | medium                       | F     |
| LG-30 | grammarToJson responses are parsed lossily, so big literals change before they reach the engine     | medium                       | F     |

Not issues (checked): the `INTERNAL__PropagatedValue` transformer throw is a deliberate leak guard
(`V1_ValueSpecificationTransformer.ts:159-167`). PLAN §5.2's "legend-graph mis-resolves `Variant`" did not reproduce:
`meta::pure::metamodel::variant::Variant` resolves to the system `Class Variant` once the system model is built.

## Recommended order

1. **Group A (accessor lookup) and LG-1…LG-4 (batch key).** Small, independent, and they stop live bugs (silent
   query rewrites on save; broken data-product typing).
2. **Group B (precise registry)**, one PR: package + full-path index + auto-import, enum cleanup, supertype and arity,
   one map. Everything else builds on it.
3. **Group D (parameters through builders, transformers and hashes).**
4. **Group C rest (lossless relation-type API).**
5. **Group E (local typer)**, the piece Cube needs. Depends on 2–4.
6. **Group F (lossless numbers)**, independent, any time.

## Design notes for local typing (read before Group E)

- **The path for Cube:** read the `Database` metamodel → resolve the relation with the engine's lookup rules (A) →
  type each column with a new engine-parity function that returns a `GenericType` with `typeVariableValues` (LG-23)
  → multiplicity from `nullable` (LG-24). Building a `V1_GenericType {rawType, typeVariableValues}` per column and
  resolving it with `context.resolveGenericTypeFromProtocolWithRelationType` (`V1_GraphBuilderContext.ts:356-389`)
  already produces `Varchar(20)`, `Numeric(10,2)`, `Variant` in the metamodel today (ran, `local-typing/run2.mjs`).
- **Conformance test:** the local result must equal the engine's `lambdaRelationType` for every column type, or the
  grid, validation and the executed query disagree. Add an engine-backed parity test (grammar test group).
- **Engine bugs the local typer must decide on** (decisions for the owner; see LG-23 for options):
  `CHAR(n)` → `Varchar(1)`; `FLOAT` → `Float4` and `REAL` → `Double` (inverted against SQL widths); `BINARY`/`VARBINARY`
  fail the whole table accessor (HTTP 500); view columns are `Varchar(0)[0..1]` with primary keys ignored.
- **Data products and ingest:** ingest dataset schemas already carry Pure relation-type columns (generic types with
  parameters, multiplicities), so they need faithful resolution (LG-26), not a mapping. Data-product access points,
  matview datasets and secure views are **lambdas**: "reading the definition" can't type them without a client-side
  Pure type checker. The realistic local route for deployed products is the artifact's cached `lambdaGenericType`
  (`V1_DataProductArtifact.ts:307`) via `V1_buildRelationTypeFromAccessPointImplementation`
  (`V1_AccessorHelper.ts:286-316`); unsaved products still need the engine. Lakehouse included-store tables
  (`INTERNAL__LakehouseGeneratedDatabase`, `STO_Internal_Relational_Helper.ts:25-62`) carry no column types at all.
  legend-engine (open source) has no `IngestDefinition`; its compiler lives in the lakehouse codebase.
- **Scope warning:** legend-graph has **no value-specification builders for relation functions**. With only the core
  preset, `select`, `extend`, `groupBy`, `join`, `rename`, `sort`, `aggregate` and `cast` throw "Can't find expression
  builder for function" (ran, `NOQB=1`). The query-builder preset adds only its own shapes: `select` and `sort` build;
  `join`, `rename`, `aggregate`, `cast`, `extend` without `over`, single-ColSpec `over()` and `groupBy` on an accessor
  still fail. So Cube should keep emitting **V1 protocol JSON directly** (its plan, D9); the V1 serializer round-trips
  those lambdas losslessly except for LG-17.
- **Reference registry:** `packages/legend-cube/src/types/PrimitiveTypeRegistry.ts` (on `cubeV1`) already holds the 13
  correct precise paths, families, supertypes and arities; legend-graph's registry (Group B) should match it so Cube
  can switch to legend-graph's types (PLAN D12).

---

## Group A: relational accessor lookup

Engine rules (`RelationalCompilerExtension.java:933-991`): path length 3 → `{schema: path[1], table: path[2]}`;
length 2 → `{schema: 'default', table: path[1]}` (`:944-945`); relations are found by
`HelperRelationalBuilder.getRelation` (tables, then views, across included databases; `:255-317`); one pair of
surrounding double quotes is stripped from column names (`:958-962`). legend-graph already has an engine-equivalent
lookup that nothing uses here: `V1_findRelation(db, schema, table)` (`V1_DatabaseBuilderHelper.ts:243-266`).
**Fix A as one change:** one helper that normalizes an accessor path the engine's way and resolves it with
`V1_findRelation`, used by `V1_ValueSpecificationBuilderHelper.ts:556-583` and
`V1_PureGraphManager.collectAccessorsInRawLambda` (`:2306-2348`).

Callers of the broken lookup (all of Group A): the V1 builder case `RELATION_STORE_ACCESSOR`
(`V1_ValueSpecificationBuilderHelper.ts:556-585`), reached when Legend Query / Studio's query builder loads an
accessor query (`QueryBuilderState.ts:1162` → `QueryBuilderStateBuilder.ts:536-544`) and written back on save
(`QueryBuilderValueSpecificationBuilder.ts:243-246`); `V1_PureGraphManager.createAccessorFromPackageableElement`
(`:2262`) ← `AccessorQueryBuilderState.changeAccessor` (legend-query-builder `:180-200`, the schema.table picker);
`collectAccessorsInRawLambda` ← Studio's `FunctionTestableState.ts:1020`, `DataProductTestableState.ts:739, :981`,
`IngestTestableState.ts:459` (test-data skeletons).

### LG-5 Accessor lookup ignores the schema (ran)

- **Where:** `packages/legend-graph/src/graph-manager/protocol/pure/v1/helpers/V1_AccessorHelper.ts:355-379`
  (overwrite at `:366-367`).
  ```ts
  if (schemaName && tableName) {
    const schema = element.schemas.find((s) => s.name === schemaName);
    if (!schema) {
      return undefined;
    }
    table = schema.tables.find((t) => t.name === tableName);
  }
  const tables = element.schemas.map((e) => e.tables).flat();
  table = tableName ? tables.find((t) => t.name === tableName) : tables[0]; // overwrites the line above
  ```
- **Problem:** the schema-scoped result is always replaced by the first table with that name in any schema.
- **Impact:** wrong columns in the query builder, and because `Accessor.path` is re-serialized from the resolved table,
  **saving silently rewrites the user's query to the other table**. The table picker snaps back to the first schema.
  Column references that exist only in the intended table fail to build.
- **Proof:** `valuespec/t_accessor.mjs` with `S1.T(ID PK, ONLY_S1 VARCHAR(10))` and `S2.T(ID PK, ONLY_S2
DECIMAL(10,2), N SMALLINT)`: `|#>{test::Db.S2.T}#` round-trips to `|#>{test::Db.S1.T}#` with columns
  `[ID, ONLY_S1]`; `...S2.T}#->filter(r|$r.ONLY_S2 > 1)` fails with "Can't find property ONLY_S2 in relation". The
  engine types `S2.T` as `(ID Int, ONLY_S2 Numeric(10,2), N SmallInt)`.
- **Fix:** look up only inside the requested schema (via the shared helper). Keep the `tables[0]` default only for the
  explicit no-table call from `AccessorQueryBuilderState.changeAccessorOwner` (`:167-178`). Never fall back to another
  schema; return `undefined` or throw the engine's message ("Can't find table … in schema …").
- **Test:** `packages/legend-graph/src/graph-manager/__tests__/V1_AccessorHelper.test.ts`: DB with `schema1.T(A)` and
  `schema2.T(B, C)`; `{schemaName:'schema2', tableName:'T'}` gives schema `schema2`, columns `[B, C]`. The existing
  test 'handles multiple schemas and tables' (`:563`) uses unique table names, which hides the bug. Add a builder
  round trip: `#>{db.schema2.T}#` → `buildValueSpecification` → `serializeValueSpecification` keeps the path.

### LG-6 Two-part path `#>{db.TABLE}#` resolves to the first table of the first schema (ran)

- **Where:** `V1_ValueSpecificationBuilderHelper.ts:561-563` (positional read), `V1_PureGraphManager.ts:2340-2344`,
  fallback `V1_AccessorHelper.ts:367`.
  ```ts
  const schemaName = protocol.path[1];
  const tableName = protocol.path[2]; // undefined for [db, table]
  ```
- **Problem:** the engine reads `[db, TABLE]` as schema `default`; legend-graph reads `TABLE` as the schema and an
  undefined table, skips the schema guard, and returns `tables[0]`. `default` is stored last in `Database.schemas`, so
  this is never the intended table.
- **Impact:** same callers as LG-5. Any query on a default-schema table written the natural way (`#>{my::DB.PERSON}#`)
  shows the wrong columns, is rewritten to `#>{my::DB.<firstSchema>.<firstTable>}#` on save, and gets wrong test data.
- **Proof:** `local-typing/run4.mjs` and `valuespec/t_accessor.mjs`: `|#>{test::Db.DEF_T}#` round-trips to
  `|#>{test::Db.S1.T}#`; the engine's protocol path is `['test::Db','DEF_T']` and it types the default-schema table.
- **Fix:** the shared path helper: `[db, t]` → `{schema: DEFAULT_DATABASE_SCHEMA_NAME, table: t}` (`'default'`,
  `MetaModelConst.ts:24`); `[db, s, t]` → `{s, t}`; anything else throws ("Please provide a table"). A path that names
  a table must never reach the `tables[0]` default.
- **Test:** default schema with `A`, `B` plus `S(T)`: building `#>{db.B}#` gives schema `default`, accessor `B`, B's
  columns; serializing gives one documented form (`[db,'B']` or `[db,'default','B']`; the engine accepts both). A
  four-part path throws. Add a `collectAccessorsInRawLambda` case with a two-part path.

### LG-7 Views and included databases can't be accessors (ran)

- **Where:** `V1_AccessorHelper.ts:355-379` (searches `element.schemas[].tables` only), `:195-214`
  (`buildRelationTypeFromTable` accepts `Table` only); `V1_ValueSpecificationBuilderHelper.ts:568-578` (throws);
  `legend-query-builder/src/stores/workflows/accessor/AccessorQueryBuilderState.ts:115-120` (lists own tables only).
- **Problem:** the engine resolves tables then views across `getAllIncludedDBs` (`HelperRelationalBuilder.java:295-317`)
  and types `#>{db.S.V}#` and `#>{inclDb.S.T}#`; legend-graph returns `undefined` and the builder throws "Can't build
  accessor for database".
- **Impact:** lambdas over a view or an included-database table can't be loaded into the query builder form or
  round-tripped through the metamodel, and are silently dropped from Studio testables. Local typing hits the same wall.
- **Proof:** `local-typing/run1.mjs`, `valuespec/t_accessor.mjs` (both throw); `local-typing/probe2.mjs` (engine types
  both, including a two-part path through an include).
- **Fix:** resolve with `V1_findRelation` (walks `getAllIncludedDatabases`, tables, views, tabular functions); reject
  tabular functions with the engine's message; make `RelationalStoreAccessor` accept `Table | View`; keep the accessor
  owner as the database named in the path. Extend the picker to included databases and views. View column typing is
  LG-25.
- **Test:** an accessor for a view returns the view's column names; an accessor through an including DB returns the
  included table's columns; `#>{db.S.V}#` builds without throwing.

### LG-8 Quoted column names keep their quotes (ran)

- **Where:** `V1_AccessorHelper.ts:195-214` (`new RelationColumn(col.name, …)` with `col.name === '"my col"'`).
- **Problem:** the store metamodel correctly keeps the quotes in `Column.name`; the engine strips one surrounding pair
  when typing the accessor; legend-graph doesn't.
- **Impact:** quoted columns appear as `"my col"`; `$r.'my col'` fails to build ("Can't find property"); a generated
  `~'"my col"'` is rejected by the engine ("The column '\"my col\"' can't be found"); test-data headers carry quotes.
- **Proof:** `local-typing/run1.mjs`, `run4.mjs`; `valuespec/t_accessor.mjs`.
- **Fix:** strip one pair of surrounding double quotes in the relation-type builder only; keep `Column.name`.
- **Test:** a column `"first name"` gives a relation column `first name`, and the builder resolves `$r.'first name'`.

---

## Group B: the precise primitive registry

The engine defines exactly **13** precise types (`precisePrimitives.pure:4-65` in
`legend-pure-m3-precisePrimitives-5.105.0`; Date and Time are commented out, there is no Decimal):
`TinyInt, UTinyInt, SmallInt, USmallInt, Int, UInt, BigInt, UBigInt` extend `Integer`; `Varchar(x)` extends `String`;
`Float4, Double` extend `Float`; `Numeric(precision, scale)` extends `Decimal`; `Timestamp` extends `DateTime`. All
live in `meta::pure::precisePrimitives`, which the engine auto-imports (`CompileContext.java:122`), so short names are
valid input; the engine always returns full paths. **Fix B as one PR.**

### LG-9 `PrecisePrimitiveType` has no package and is indexed by short name (ran)

- **Where:** `packages/legend-graph/src/graph/metamodel/pure/packageableElements/domain/PrimitiveType.ts:49-97`;
  `src/graph/PureModel.ts:88-119, :145-167`; `PackageableElementReference.ts:119-141`;
  `V1_GraphBuilderContext.ts:199-305`; `V1_DomainTransformer.ts:112-119, :173-192`.
  ```ts
  static readonly VARCHAR = new PrecisePrimitiveType(extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.VARCHAR));
  override getOwnNullableType(path: string): Type | undefined {
    if ((Object.values(PRECISE_PRIMITIVE_TYPE) as string[]).includes(path)) { resolvedPath = extractElementNameFromPath(path); }
  ```
- **Problem:** each type's `.path` is its short name; `CoreModel` indexes by short name and special-cases the enum's
  full paths. A reference resolved from a full path serializes back short. `V1_Property.hashCode` hashes the input
  full path while `Property.hashCode` hashes the short one. `meta::pure::precisePrimitives` is not in `AUTO_IMPORTS`;
  short names only resolve through the root-level fallback (`V1_GraphBuilderContext.ts:262-266`).
- **Impact:** any element spelling a precise type with its full path comes back short, and its metamodel hash differs
  from its protocol hash right after load, so Studio change detection (`ChangeDetectionState.ts:117, :588`) marks it
  modified, which can trigger the corrupted push of LG-14. Short-name inputs are unaffected.
- **Proof:** `precise-primitives/probe1.mjs` (every full path → short path, no package); `probe2.mjs`: `test::Report`
  (mixed paths) protocol hash `90c119f3` vs metamodel `3b0d9b43`; full-path-only class differs; short-only same.
- **Fix:** give the 13 types the package `meta::pure::precisePrimitives`, index by full path, add the package to
  `AUTO_IMPORTS` (`MetaModelConst.ts:94-125`) so short names resolve by auto-import and references keep their input
  spelling. **Ordering trap:** `SystemModel.initializeAutoImports` (`PureModel.ts:188-196`) throws if an auto-import
  package is missing from the system model, so the package must be reachable there (or auto-import must search
  `CoreModel`). In the same PR remove the `getOwnNullableType` special case and the `buildV1GenericType` strip (LG-26).
  Re-check `.path` consumers: `BasicValueSpecificationEditor.tsx:794` passes `.path`; `QueryBuilderExplorerPanel.tsx:466-479`
  uses `.name` (safe).
- **Test:** the LG-14 round-trip fixture with full and short spellings (`TEST__checkBuildingElementsRoundtrip` checks
  content and hash); `getType('meta::pure::precisePrimitives::Varchar').path` is the full path; `'Varchar'` still
  resolves in a section with no imports.

### LG-10 `PRECISE_PRIMITIVE_TYPE` has 3 phantom paths and a wrong `TIMESTAMP` (ran)

- **Where:** `src/graph/MetaModelConst.ts:64-82`; `PureModel.ts:112-119`; `PrimitiveType.ts:88-90`;
  `V1_AccessorHelper.ts:147, :155`; `RelationalDataType.ts:146`.
  ```ts
  DECIMAL = 'meta::pure::precisePrimitives::Decimal',      // not in the engine
  STRICTDATE = 'meta::pure::precisePrimitives::Date',      // not in the engine
  DATETIME = 'meta::pure::precisePrimitives::Timestamp',   // the real Timestamp
  STRICTTIME = 'meta::pure::precisePrimitives::Time',      // not in the engine
  TIMESTAMP = 'meta::relational::metamodel::datatype::Timestamp', // a relational column-datatype Class
  ```
- **Problem / proof (ran, `probe1.mjs` + engine compile):** `…::Decimal` resolves to standard `Decimal`, `…::Date` to
  standard `Date`, `…::Time` throws, and the relational class path resolves to the precise `Timestamp`. The engine
  rejects the three phantom paths ("Can't find type") and reads the relational path as a Class.
- **Impact:** Studio accepts paths the engine rejects or reads differently; `getType` and
  `getCorrespondingStandardPrimitiveType` disagree on `…::Date`; consumers that match engine strings carry dead or
  misleading branches (Data Cube `DataCubeQueryEngine.ts:359-398, :422-458`, `LegendDataCubeDuckDBEngine.ts:124-186`
  throws on `StrictTime`, plus `DataCubeQueryBuilderUtils.ts`, `DataCubeFilterEditor.tsx`, `DataCubeConfiguration.ts`,
  `DatabaseEditorHelper.tsx`, `QueryBuilderExplorerPanel.tsx`, `SQLPlaygroundExplorer.tsx`, `LegendAIChatHelpers.ts`).
  The milestone columns at `V1_AccessorHelper.ts:147/:155` use the relational `TIMESTAMP` path and work only because
  of the package strip.
- **Fix:** make the enum exactly the 13 engine paths with `TIMESTAMP = 'meta::pure::precisePrimitives::Timestamp'`;
  remove `DECIMAL`, `STRICTDATE`, `STRICTTIME`, `DATETIME` (or keep them as `@deprecated` aliases first); move
  consumers to `PRIMITIVE_TYPE.*` for standard types; put any relational datatype class path in a relational constant.
- **Test:** `Object.values(PRECISE_PRIMITIVE_TYPE)` equals the 13 paths; `getType('…::Date')` throws; the relational
  path is not a precise type. Update `PrimitiveType.test.ts:94-128, :174-178`, which assert the current behaviour.

### LG-11 Precise types have no supertype or arity (ran)

- **Where:** `PrimitiveType.ts:49-97` (`class PrecisePrimitiveType extends DataType`, no generalization, no type
  parameters); `src/graph/helpers/DomainHelper.ts:546-631` (`isSubType`/`isSuperType` handle `PrimitiveType` only);
  `PureModel.ts:89-98` (`precisePrimitiveTypesIndex: Map<string, PrimitiveType>` holds non-`PrimitiveType` values).
- **Proof:** `probe6.mjs`: `isSuperType(String,Varchar)`, `(Integer,Int)`, `(Number,BigInt)`, `(Float,Double)`,
  `(Decimal,Numeric)`, `(DateTime,Timestamp)`, `(Date,Timestamp)` are all false. Engine: `cast(@Relation<(x:…Numeric)>)`
  fails "Wrong type variables count (0)"; `Numeric(10,2)` works.
- **Impact:** query builder: `BasicValueSpecificationEditor.tsx:1929` (`isSubType(expected, DATE)`) is false for a
  `Timestamp` column, so a `today()` right-hand side falls through to the unsupported editor (traced); `:1952`
  simplification skipped; `QueryBuilderValueSpecificationHelper.ts:269`, `QueryBuilderStateBuilder.ts:1177` miss
  matches. 31 files test `instanceof PrimitiveType` without `PrecisePrimitiveType`. No arity: Data Cube
  `DataCubeQueryBuilderUtils.ts:279-288, :568-587` hard-codes `Varchar(16777216)` and emits `Numeric` with no
  parameters, which the engine rejects.
- **Fix:** one registry entry per precise type: `{path, name, superType, typeParameters}` (`[x]` for Varchar,
  `[precision, scale]` for Numeric). Then either **A**: `PrecisePrimitiveType extends PrimitiveType` (audit the 31
  sites; `V1_ValueSpecificationTransformer.visit_PrimitiveInstanceValue` and `PureLanguageHelper.ts:98` switch on
  `type.name`), or **B**: keep the class, add the generalization and teach `isSubType`/`isSuperType` to walk precise →
  standard → Number/Date. Type the index `Map<string, PrecisePrimitiveType>`. **Decision for the owner: A or B.**
- **Test:** `isSubType` true for `(Varchar,String)`, `(Int,Integer)`, `(Int,Number)`, `(Float4,Float)`,
  `(Double,Float)`, `(Numeric,Decimal)`, `(Timestamp,DateTime)`, `(Timestamp,Date)`; false for `(Int,Float)`,
  `(Varchar,Integer)`; reverse for `isSuperType`; arity Varchar 1, Numeric 2, others 0.

### LG-12 Three precise→standard maps disagree (ran)

- **Where:** M1 `src/graph/MetaModelUtils.ts:139-165` (`getPrimitiveTypeEnumFromPrecisePrimitiveTypeEnum`); M2
  `PrimitiveType.ts:105-144` (`getCorrespondingStandardPrimitiveType`); M3
  `legend-data-cube/src/stores/core/model/DataCubeConfiguration.ts:129-157`.

  | Precise                        | M1                  | M2                            | M3           | Engine supertype |
  | ------------------------------ | ------------------- | ----------------------------- | ------------ | ---------------- |
  | Varchar                        | String              | String                        | String       | String           |
  | Int…UInt (6 types)             | Number              | Integer                       | Integer      | Integer          |
  | BigInt, UBigInt                | Number              | Integer                       | Number       | Integer          |
  | Float4                         | Number              | Float                         | Float        | Float            |
  | Double                         | Number              | Float                         | Number       | Float            |
  | Numeric                        | Number              | Decimal                       | **unmapped** | Decimal          |
  | Timestamp                      | Date                | DateTime                      | DateTime     | DateTime         |
  | phantom `…::Decimal/Date/Time` | Number/Date/Unknown | Decimal/StrictDate/StrictTime | same as M2   | not defined      |

  M1 on short or standard names returns Unknown; M2 on the short names `Date`, `Decimal`, `Time` (which are also
  standard names) returns StrictDate, Decimal, StrictTime, and rebuilds its Map on every call.

- **Impact:** M1's only caller, Data Quality `LambdaEditorWithGUIState.ts:259-270`, passes engine type strings, so
  `String`/`Integer`/`Boolean`/`StrictDate` columns become Unknown and get no string or numeric validation functions
  (`DataQualityValidationFunctionsUtils.ts:61-84`). M2's collision is latent. M3 makes Data Cube treat BigInt and
  Double as NUMBER and leaves Numeric unmapped.
- **Fix:** one registry (LG-11); derive M2 from `superType`; restrict short-name lookup to the 13 real short names;
  delete M1 or reimplement it on the registry so standard types map to themselves; point Data Cube and Data Quality at
  it.
- **Test:** table-driven over the 13 paths, 13 short names and the standard primitives; M2 returns `undefined` for
  `Date`, `Decimal`, `Time` and the relational Timestamp path; Data Quality gives a `String` column string operators.

### LG-13 Precise types can't be listed or picked; the visitor throws (low, ran)

- **Where:** `PureModel.ts:108-110` (`allOwnElements` adds only primitive types); `GraphManagerState.ts:169-181`
  (`usableClassPropertyTypes`); `PrimitiveType.ts:92-96` (`accept_PackageableElementVisitor` throws "Method not
  implemented").
- **Impact:** the class-editor property type dropdown, the query builder parameter panel
  (`QueryBuilderParametersPanel.tsx:94`) and constant panel (`QueryBuilderConstantExpressionPanel.tsx:158`) can't pick
  `Varchar`, `Int`, … (and there is no parameter UI). The visitor throw is latent (precise types are not package
  children today).
- **Fix:** add `visit_PrecisePrimitiveType` (or inherit `visit_PrimitiveType` under LG-11 option A); expose
  `PureModel.precisePrimitiveTypes`; add them to the pickers once a parameter editor exists.
- **Test:** `CoreModel` exposes the 13 types; the visitor dispatches without throwing.

---

## Group D: type parameters through builders, transformers and hashes

Two helpers already do it right and should be reused everywhere: `resolveGenericTypeFromProtocolWithRelationType`
(`V1_GraphBuilderContext.ts:356-389`, fills `typeVariableValues`) and `V1_createGenericType`
(`V1_DomainTransformer.ts:95-110`). The metamodel can hold parameters (`GenericType.typeVariableValues`,
`GenericType.ts:28`).

### LG-14 Parameters dropped on properties, derived properties and lambda parameters; hashes ignore them (ran)

- **Where:** builders `V1_DomainBuilderHelper.ts:201-243` (`V1_buildProperty`, `:225`), `:245-270`
  (`V1_buildDerivedProperty`, `:268`), `V1_ValueSpecificationBuilderHelper.ts:182-196` (`visit_Variable`, `:190-192`);
  transformers `V1_DomainTransformer.ts:298-314` (`:304-306`), `:316-330`, `V1_ValueSpecificationTransformer.ts:221-238`
  (`:233-235`); hashes `Property.ts:52-63`, `V1_Property.ts:35-48`.
  ```ts
  context.resolveGenericType(V1_getGenericTypeFullPath(property.genericType)); // builder: raw type only
  property.genericType = V1_createGenericTypeWithElementPath(
    // transformer: path only
    element.genericType.ownerReference.valueForSerialization ?? '',
  );
  ```
- **Impact (live):**
  1. A class property typed `Varchar(n)` or `Numeric(p,s)` loses its parameters whenever Studio serializes the element
     from the metamodel (push via `elementToEntity`, form → text switch). The engine then rejects the class: "Wrong
     type variables count (0) for type: Varchar(x:Integer)" (ran). That the push sends it is inferred.
  2. Editing only a parameter (`Varchar(200)` → `Varchar(300)`) keeps the same hash, so change detection misses it.
  3. Lambda parameters `{v: Varchar(10)[1]|$v}` → `v: Varchar[1]`; `{n: Numeric(10,2)[0..1]|$n}` → `n: Numeric[0..1]`;
     `{r: Relation<(a:Integer)>[1]|$r}` → `r: meta::pure::metamodel::relation::Relation[1]` (ran, `valuespec/t_var.mjs`,
     `precise-primitives/probe8.mjs`). Hits query builder parameters (load `QueryBuilderState.ts:1162`, save
     `transformValueSpecToRawValueSpec`).
- **Proof:** `precise-primitives/probe2.mjs`: property `country` IN `{Varchar, tvv:[200]}` OUT `{Varchar, tvv:[]}`;
  `Numeric [10,2]` → `[]`; a function return type `Varchar(3)` keeps `[3]` (only shortened, LG-9). Same protocol hash
  for `Varchar(200)` and `Varchar(300)`.
- **Fix:** builders resolve through `resolveGenericTypeFromProtocolWithRelationType` (or add `typeVariableValues` to
  `resolveGenericTypeFromProtocol`, `V1_GraphBuilderContext.ts:343-354`); transformers emit `typeVariableValues` via
  `V1_createGenericType`; include the generic type (with parameters) in `Property.hashCode` and `V1_Property.hashCode`,
  symmetrically.
- **Test:** new `roundtripTestData/TEST_DATA__PrecisePrimitiveRoundtrip.ts`: class properties (full path and short
  name) `Varchar(200)`, `Numeric(10,2)`, `Timestamp`, `BigInt`; a derived property and a function returning
  `Varchar(3)`; run `TEST__checkBuildingElementsRoundtrip`. A value-spec round trip of the three lambdas above.
  CI misses this today because no round-trip fixture has a precise class property or a full-path precise type.

### LG-15 `@Type` (genericTypeInstance) loses parameters; the transformer throws for non-classes (latent, ran)

- **Where:** builder `V1_ValueSpecificationBuilderHelper.ts:328-338` (`visit_GenericTypeInstance` resolves the path
  only); transformer `V1_ValueSpecificationTransformer.ts:258-288` (only `Unit`/`Class` handled at `:271-283`, throws
  "Can't transform instance value" at `:284-287`).
- **Proof:** `valuespec/t_gti*.mjs`, `precise-primitives/probe3.mjs`: `@Integer`, `@String`, `@Varchar(10)`,
  `@Numeric(10,2)` fail to transform; `@Relation<(a:Integer)>` loses its columns; `@…variant::Variant` (a Class)
  works. A V1-only round trip is lossless.
- **Impact:** latent for the query builder (it has no `cast` builder); blocks any metamodel-based producer of
  `cast(@Varchar(n))`, `cast(@Numeric(p,s))`, relation casts or `@Enum`.
- **Fix:** builder via `resolveGenericTypeFromProtocolWithRelationType`; transformer emits `V1_GenericTypeInstance`
  with `V1_createGenericType(genericType.value)` for any raw type when there are no values (precise `.path` short
  names are accepted by the engine).
- **Test:** round trip `@Integer`, `@Varchar(10)`, `@Numeric(10,2)`, `@Relation<(a:Integer[0..1])>` and a user enum,
  compared with the engine's grammarToJson minus `sourceInformation`.

### LG-16 Literals of a precise type throw in the transformer (latent, ran)

- **Where:** `V1_ValueSpecificationTransformer.ts:337-401` (switch on `type.name`, default throw at `:396-399`).
- **Proof:** `valuespec/t_precise_lit.mjs`, `precise-primitives/probe7.mjs`: a `PrimitiveInstanceValue` typed with any
  of the 13 precise types throws "Can't transform primtive instance value of type 'Varchar'".
- **Impact:** latent (the query builder normalizes to standard types first, `ValueSpecificationEditorHelper.ts:483-502`);
  any caller that builds literals from precise column types (accessor or data-product columns, or local typing once
  LG-23 lands) crashes on save.
- **Fix:** normalize via the registry (LG-11/12): `Varchar` → `CString`, integer types → `CInteger`, `Float4`/`Double`
  → `CFloat`, `Numeric` → `CDecimal`, `Timestamp` → `CDateTime`. Pure has no precise literal syntax; callers that need
  the precise type wrap the literal in `cast(@T(n))` (needs LG-15).
- **Test:** each precise type serializes to the matching `C*` class with the value preserved.

### LG-17 `V1_ColSpec` still uses the old `type: string` protocol (ran)

- **Where:** `…/v1/model/valueSpecification/raw/classInstance/relation/V1_ColSpec.ts:19-24`;
  `V1_ValueSpecificationSerializer.ts:801-823`; metamodel `RelationValueSpecification.ts:30-43` (hash omits type);
  builder `V1_ValueSpecificationBuilderHelper.ts:497, :532`; transformer `V1_ValueSpecificationTransformer.ts:459-461,
:496-497`.
- **Problem:** the engine's `ColSpec` now carries `genericType` (with `typeVariableValues`), `multiplicity`,
  `stereotypes` and `taggedValues`, reading legacy `type` only as a fallback. Studio's serializr schema maps only
  `type`, so `genericType` is dropped on deserialize; the metamodel stores a string; the transformer never writes it.
- **Proof:** `valuespec/t_v1rt.mjs` (V1 only): `select(~[ID:Integer])` → `select(~[ID])`,
  `extend(~[c:Varchar(10)[0..1]])` → `extend(~[c])`.
- **Impact:** silent erasure in every V1 round trip (Data Cube, query builder). Today the engine types
  `select(~[ID:Integer])` the same either way, so no wrong results yet. Data Cube still writes legacy `type`
  (`DataCubeGridQueryBuilder.ts:148`, `DataCubeQueryBuilderUtils.ts:327-339`), so keep accepting it.
- **Fix:** (1) `V1_ColSpec`: add `genericType`, `multiplicity`, `stereotypes`, `taggedValues`; deserialize the new
  shape and legacy `type`; serialize `genericType`. (2) Metamodel `ColSpec`: a generic type reference plus a
  multiplicity, both hashed (an exported shape change: keep a deprecated `type` getter to stay `patch`). (3) Builder
  and transformer via the two shared helpers. Update `V1_QueryValueSpecificationBuilderHelper.ts:1608` (query builder)
  and `DataQualityLambdaParameterParser.ts:109-145`.
- **Test:** engine JSON with `genericType` and `multiplicity` round-trips unchanged; legacy `{type:'Integer'}` still
  accepted; metamodel build + transform of `~[c:Varchar(10)[0..1]]` keeps `[10]` and `[0..1]`.
- **Note:** this is the only fix Cube's direct V1 emission depends on.

### LG-18 Single ColSpec transform writes `function1` into `function2` (latent, ran)

- **Where:** `V1_ValueSpecificationTransformer.ts:490-522` (bug at `:517-519`).
  ```ts
  if (fun2) {
    colProtocol.function2 = guaranteeType(fun1, V1_Lambda);
  }
  ```
- **Proof:** `valuespec/t_fn2b.mjs`: single `~cnt:x|$x:y|$y->count()` renders `~cnt:x|$x:x|$x`; the array form is
  correct.
- **Impact:** no in-repo caller builds a single ColSpec with `function2` today; any new producer of
  `groupBy(~k, ~agg:…:…)`, `aggregate(~s:…:…)` or a single-AggColSpec window extend would get a corrupted query.
- **Fix:** `colProtocol.function2 = guaranteeType(fun2, V1_Lambda);`
- **Test:** a single ColSpec with `function1` and `function2` serializes `function2` as the reduce lambda; also a case
  with only `function2`.

---

## Group C: relation types from the engine

### LG-1 Batch relation-type call reads `results`; the engine returns `result` (live, ran)

- **Where:** `…/v1/engine/compilation/V1_LambdaReturnType.ts:87-112`; `…/v1/engine/V1_RemoteEngine.ts:803-834`
  (`:811`); `V1_EngineServerClient.ts:820-835`. Engine: `LambdaRelationTypesResult.java` (`public Map<String,
RelationType> result;`, never `results`), `Compile.java:167-215`.
- **Real payload** (captured, trimmed):
  ```json
  {
    "result": {
      "ok": {
        "_type": "relationType",
        "columns": [
          {
            "genericType": {
              "multiplicityArguments": [],
              "rawType": {
                "_type": "packageableType",
                "fullPath": "meta::pure::precisePrimitives::Varchar"
              },
              "typeArguments": [],
              "typeVariableValues": [{ "_type": "integer", "value": 5 }]
            },
            "multiplicity": { "lowerBound": 0, "upperBound": 1 },
            "name": "CUSTOMER_ID"
          }
        ]
      }
    },
    "errors": {
      "bad": {
        "code": -1,
        "errorType": "COMPILATION",
        "message": "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'",
        "sourceInformation": {
          "startLine": 1,
          "startColumn": 2,
          "endLine": 1,
          "endColumn": 66,
          "sourceId": ""
        },
        "status": "error"
      }
    }
  }
  ```
- **Problem:** `Object.entries(response.results)` → `TypeError: Cannot convert undefined or null to object` on every
  call. The protocol type is wrong, so `tsc` never caught it. The parser exists twice
  (`V1_buildBatchLambdaRelationTypeResult` and `getBatchLambdasRelationTypeFromRawInput`).
- **Impact:** all production callers fail: Studio data-product editor (`DataProductEditorState.ts:944-948`, LG-3),
  data-product viewer (`DataProductViewerState.ts:620-628`, LG-4), `DataProductIngestUtils.ts:812-816
fetchAccessPointRelationTypes` → `LegendMarketplaceAIChatStore.ts:1543-1563` (logs a warning and returns an empty
  map, so the AI agent never gets engine-typed access points), and external users of the exported helpers.
  Introduced by Studio commits `14da71fa6` (2026-08-06) and `3d09d3286` (2026-08-20).
- **Proof:** `relation-types/batch.mjs` (keys `[errors, result]`); `lib_probe.mjs` (both parsers throw; feeding
  `{results: raw.result, errors: raw.errors}` works, so the key is the only defect).
- **Fix:** rename the field to `result`, make `errors` required, read defensively (`?? {}`); delete the duplicate
  parser in `V1_RemoteEngine.ts:803-834` and call the shared one.
- **Test:** unit test of `V1_buildBatchLambdaRelationTypeResult` on the payload above (`typeVariableValues[0].value
=== 5`, error message kept); spy test of `getBatchLambdasRelationTypeFromRawInput`; engine-backed
  `ENGINE_TEST_SUPPORT__getBatchLambdasRelationType` next to the single one (`EngineTestSupport.ts:228-241`).

### LG-2 Tests mock the wrong key (traced)

- **Where:** `legend-extension-dsl-data-product/src/utils/__tests__/DataProductIngestUtils.test.ts:739-744, 768-773`;
  `…/components/__tests__/DataProductViewer.test.tsx:403-429` (tests at `:548`, `:575`).
- **Problem:** the mocks return `{ results: … }`, copying the wrong client type; two viewer tests pass only because of
  it. No legend-graph or Studio test covers the batch call.
- **Fix:** flip to `{ result, errors }` in the same commit as LG-1, ideally from a fixture captured from the engine.

### LG-3 Studio data-product editor sticks a false warning after a batch failure (traced)

- **Where:** `legend-application-studio/…/dataProduct/DataProductEditorState.ts:916-967` (bare `catch` at `957-960`,
  `finally` at `961-966`), `:166-192` (early return `171-174`), `:334-370`; `DataProductEditor.tsx:521-525, 783-784,
1270-1282`.
- **Problem:** the batch throws (LG-1); the catch sets columns to `undefined` without logging; `finally` records
  `lastComputedLambdaHash`, so the on-blur single-call fallback returns early forever; `hasRelationElementMismatch`
  is true when columns are undefined.
- **Impact:** every lakehouse access point with sample values shows "Fix compiler errors and make sure AccessPoint X
  returns a Relation type" even when valid, until the lambda text changes. Any transient failure keeps doing this after
  LG-1 is fixed.
- **Fix:** set the hash only on success; on failure fall back to per-access-point `getLambdaRelationType` or show the
  error; show the batch `errors` entry per key; log the error.
- **Test:** batch rejects → hash stays unset and blur calls `getLambdaRelationType`; batch `errors` entry → that access
  point shows the engine message.

### LG-4 Data-product viewer turns failures into `undefined` (traced)

- **Where:** `legend-extension-dsl-data-product/src/stores/DataProduct/DataProductViewerState.ts:162-166, 602-635`
  (catch `629-631`), `:772`; `DataProductAccessPointState.ts:178-219`.
- **Problem:** the batch swallows every error and drops `errors`; `fetchRelationTypeFromEngine` fulfills with
  `undefined` instead of rejecting; `Promise.any` takes the first fulfilled promise, so the engine's `undefined` can beat
  the artifact's relation type, and the `AggregateError` branch never runs.
- **Impact:** an empty "Column Specifications" table with no error whenever the artifact lacks a relation type (today:
  always, because of LG-1), and a timing race when both sources exist (the test at `DataProductViewer.test.tsx:421-424`
  avoids it only by delaying the mock 500 ms).
- **Fix:** reject when the key is absent (with `errors.get(key)?.message` or the batch error); keep the batch error;
  pick the engine error explicitly instead of `error.errors[1]`.
- **Test:** artifact present + engine error → artifact columns; no artifact + per-key error → notification with the
  engine message; no artifact + batch rejects → notification.

### LG-19 `getLambdaRelationType` → `RelationTypeMetadata` drops parameters and column metadata (ran)

- **Where:** `V1_RemoteEngine.ts:779-801` (single, `:789-799`) and `:813-822` (batch);
  `src/graph-manager/action/relation/RelationTypeMetadata.ts:19-34`; `V1_PureGraphManager.ts:2156-2164`;
  `AbstractPureGraphManager.ts:459-463`.
  ```ts
  relationType.columns = result.columns.map((column) => new RelationTypeColumnMetadata(
    V1_getGenericTypeFullPath(column.genericType), column.name, new Multiplicity(…)));
  ```
- **Problem:** `V1_relationTypeModelSchema` deserializes everything, but the metadata keeps only a path string, a name
  and a multiplicity: `typeVariableValues`, `typeArguments`, `description`, stereotypes, tagged values are dropped;
  nested relation types become the string `'RelationType'`; paths are mixed (precise full, standard bare).
- **Proof:** `relation-types/lib_probe.mjs`: engine `CUSTOMER_ID Varchar [5]`, cast `n Numeric [10,2]` → metadata
  `{type:'meta::pure::precisePrimitives::Varchar'}`, `{type:'meta::pure::precisePrimitives::Numeric'}`.
- **Impact:** nothing that needs a precise type or column docs can use this API: ingest matview and DataProduct
  accessors (`V1_AccessorHelper.ts:436-443, :483-490`), Studio testables (`FunctionTestableState.ts:301-310, :806`,
  `IngestTestableState.ts:97`, `DataProductTestableState.ts:125`, `LakehouseTestableUtils.ts:159`), query builder
  (`DataProductQueryBuilderState.ts:852-863` without an artifact; `QueryBuilderTDSState.ts:1026-1036`,
  `QueryBuilderProjectionColumnState.ts:507-516`, `QueryBuilderDataCubeEngine.ts:327-333`), Data Quality
  (`DataQualityRelationValidationConfigurationState.ts:760-765`, `…ComparisonConfigurationState.ts:781-786`), Studio
  `RelationTypeTree.tsx`, Data Cube. The same data-product access point gets different types depending on whether an
  artifact exists.
- **Fix:** return a metamodel `RelationType` built by `V1_buildRelationTypeFromV1RelationType` (lossless, see LG-21).
  Additive options: a new `getLambdaRelationTypeV2(): Promise<RelationType>`, or add `genericType`, `description`,
  `stereotypes`, `taggedValues` to `RelationTypeColumnMetadata` (both `RelationTypeMetadata` and
  `observe_RelationTypeMetadata`, `DSL_Data_ObserverHelper.ts:251`, are exported: removing them is `major`).
- **Test:** spy on `engineServerClient.lambdaRelationType` returning `typeVariableValues:[{_type:'integer',value:5}]`
  and a description; both survive; same for the batch call.

### LG-20 Three `RelationTypeMetadata` → `RelationType` converters, two lossy (ran)

- **Where:** `V1_AccessorHelper.ts:383-402` (`buildRelationTypeFromMetadata`);
  `legend-query-builder/src/stores/workflows/dataProduct/DataProductQueryBuilderState.ts:119-129`;
  `RelationType.ts:27` (`multiplicity: Multiplicity = Multiplicity.ONE`).
- **Problem:** `buildRelationTypeFromMetadata` re-parses the path with no parameters and silently falls back to
  `String` on any resolution failure; `resolveDataProductAccessor` uses `graph.getType` (throws on unknown paths) and
  never copies multiplicity, so every column is `[1]`, nullable ones included.
- **Impact:** query builder over data products without an artifact reports nullable columns as `[1]` (hides null-aware
  operators); accessor relation types can silently show `String`.
- **Fix:** collapse all three into the lossless builder (LG-19/21); delete `buildRelationTypeFromMetadata` and the
  metadata branch of `resolveDataProductAccessor`.
- **Test:** no artifact + engine column `0..1` → the DataProductAccessor column is `ZERO_ONE`.

### LG-21 `V1_buildRelationTypeFromV1RelationType` throws on one unresolvable column (ran)

- **Where:** `V1_AccessorHelper.ts:238-282` (fallback `249-257`); `V1_TypeSerializationHelper.ts:64-131`; callers
  `V1_PureGraphManager.ts:3456-3466`, `V1_AccessorHelper.ts:292-311`.
  ```ts
  const genericTypeRef = returnUndefOnError(() =>
    context.resolveGenericTypeFromProtocolWithRelationType(col.genericType),
  );
  new RelationColumn(
    col.name,
    genericTypeRef ??
      GenericTypeExplicitReference.create(
        new GenericType(
          graph.getType(V1_getGenericTypeFullPath(col.genericType)),
        ),
      ),
  ); // graph.getType throws
  ```
- **Problem / proof:** on an empty `PureModel` it keeps `Varchar(5)`, `Numeric(10,2)`, `StrictDate` and
  multiplicities (ran), but a user type (enum `my::Color`) makes the fallback throw "Can't find type 'my::Color'" and
  aborts the whole relation (`relation-types/usertype.mjs`). PLAN §5.1's "works against an empty PureModel" holds only
  for primitive and precise types.
- **Impact:** today's callers pass the full graph, so they work; the lightweight "type without building the graph"
  route breaks on the first enum or class column.
- **Fix:** wrap the fallback too; on a miss use a placeholder (`CORE_PURE_PATH.ANY`, or an unresolved type that keeps
  the path) and report unresolved columns instead of throwing.
- **Test:** empty `PureModel`, columns `[Varchar(9), my::Color]`: no throw; column 0 keeps `[9]`; column 1 is marked
  unresolved with path `my::Color`.

### LG-22 Relation-type calls don't map an engine 400 to `CompilationError` (low, ran)

- **Where:** `V1_RemoteEngine.ts:779-801` and `:803-834` (no try/catch) vs `:745-777` (`getLambdaReturnType` maps
  400 → `V1_buildCompilationError`).
- **Problem / proof:** `relation-types/errors.mjs`: `lambdaRelationType` → `NetworkClientError` 400 with
  `sourceInformation` only in `.payload`; `lambdaReturnType` → `CompilationError` with `sourceInformation`.
- **Impact:** low (no caller checks `instanceof CompilationError` today); editors can't place error markers.
- **Fix:** copy the `:745-777` try/catch into both methods.
- **Test:** spy rejecting with `new NetworkClientError(response400, compilationErrorPayload)` → a `CompilationError`
  with `sourceInformation`.

---

## Group E: typing tables locally from the `Database` definition

### LG-23 Client-side relational column typing disagrees with the engine (ran) — **the blocker**

- **Where:** `packages/legend-graph/src/graph/helpers/STO_Relational_Helper.ts:222-263`
  (`mapRelationalDataTypeToPrimitiveType`), used by `V1_AccessorHelper.ts:195-214` (`buildRelationTypeFromTable`);
  the test that locks it in: `src/graph-manager/__tests__/V1_AccessorHelper.test.ts:414-501` (asserts
  `DOUBLE → NUMBER` at `:479`, `JSON → STRING` at `:465`).
  ```ts
  if (
    dataType instanceof VarChar ||
    dataType instanceof Char ||
    dataType instanceof SemiStructured ||
    dataType instanceof Json
  ) {
    return PrimitiveType.STRING;
  }
  if (dataType instanceof Double) {
    return PrimitiveType.NUMBER;
  }
  ```
- **Problem:** returns a standard `PrimitiveType`, so it can't express precise types or parameters, and its mapping
  differs from the engine's (`RelationalCompilerExtension.java:1005-1102`, fallback `dataTypeToCompatiblePureType` in
  `platform_store_relational/functions.pure:98-121`) on 15 of 18 types; two are in the wrong family (`DOUBLE → Number`,
  which also contradicts legend-graph's own `getCorrespondingStandardPrimitiveType`; `JSON`/`SEMISTRUCTURED → String`
  instead of `Variant`). Column stereotypes and tagged values (carried by the engine, `:965`) are dropped.
- **Impact:** every local relational accessor (query builder accessor mode picks operators and value editors from the
  column type; lambdas built into the metamodel; test-data generation). For Cube, using it as is would lose
  `Varchar(n)`/`Numeric(p,s)`, break join compatibility (Number is not Float) and offer string operators on `Variant`.
- **Full mapping** (engine column ran per type: `precise-primitives/alltypes.mjs`, `local-typing/probe.mjs`,
  `run2.mjs`, `valuespec/t_types.mjs`):

  | Database column (protocol `_type`)    | Engine type + multiplicity                                                        | legend-graph today                        | Recommended local type                                                 |
  | ------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
  | `VARCHAR(n)`                          | `Varchar(n)`                                                                      | `String`                                  | `Varchar(n)`                                                           |
  | `CHAR(n)`                             | `Varchar(1)` (**engine bug**, `:1024-1032`)                                       | `String`                                  | **decision**: `Varchar(n)` (deliberate divergence) or mirror           |
  | `INTEGER`/`INT`                       | `Int`                                                                             | `Integer`                                 | `Int`                                                                  |
  | `BIGINT`, `SMALLINT`, `TINYINT`       | `BigInt`, `SmallInt`, `TinyInt`                                                   | `Integer`                                 | same as engine                                                         |
  | `FLOAT`                               | `Float4`                                                                          | `Float`                                   | `Float4` (mirror; inverted vs SQL widths, file an engine issue)        |
  | `DOUBLE`                              | `Double`                                                                          | `Number` (wrong family)                   | `Double`                                                               |
  | `REAL`                                | `Double`                                                                          | `Float`                                   | `Double` (mirror)                                                      |
  | `DECIMAL(p,s)`, `NUMERIC(p,s)`        | `Numeric(p,s)`                                                                    | `Decimal`                                 | `Numeric(p,s)`                                                         |
  | `DATE`                                | `StrictDate`                                                                      | `StrictDate`                              | `StrictDate`                                                           |
  | `TIMESTAMP`                           | `Timestamp`                                                                       | `DateTime`                                | `Timestamp`                                                            |
  | `BIT`, `BOOLEAN` (parsed as Bit)      | `Boolean`                                                                         | `Boolean`                                 | `Boolean`                                                              |
  | `OTHER`, `ARRAY` (parsed as Other)    | `String` (values may come back as numbers)                                        | `String`                                  | `String`                                                               |
  | `SEMISTRUCTURED`, `JSON`              | `meta::pure::metamodel::variant::Variant`                                         | `String` (wrong family)                   | `Variant`                                                              |
  | `BINARY(n)`, `VARBINARY(n)`           | HTTP 500 "Match failure" for the **whole table**                                  | `Binary`                                  | **decision**: mark the table unavailable, or `Binary`                  |
  | view column (any)                     | `Varchar(0)[0..1]`, primary keys ignored (`HelperRelationalBuilder.java:474-478`) | no accessor (LG-7), `VarChar(50)` (LG-25) | **decision**: the underlying column's type, else a documented fallback |
  | nullable / `NOT NULL` / `PRIMARY KEY` | `[0..1]` / `[1]` / `[1]` (only `nullable` counts)                                 | same                                      | same (LG-24 for `undefined`)                                           |
  | quoted name `"my col"`                | `my col`                                                                          | `"my col"` (LG-8)                         | strip one pair of quotes                                               |
  | stereotypes / tagged values           | carried                                                                           | dropped                                   | copy them                                                              |

  The Pure metamodel's other relational types (`Distinct`, `Array`, `Object`, `UnsignedInt`, `DbSpecificDataType`)
  can't be produced from Legend grammar. Minor: `Other.hashCode` reuses `RELATIONAL_DATATYPE_VARCHAR`
  (`RelationalDataType.ts`).

- **Fix:** don't change the exported `mapRelationalDataTypeToPrimitiveType` (TDS callers such as
  `getTDSColumnDerivedProperyFromType`, `QueryBuilderTDSHelper.ts:147-176`, throw on precise paths; `index.ts:492`).
  Add a new exported function (e.g. `buildRelationColumnGenericType(column, graph)` /
  `buildRelationTypeFromRelation(relation, graph)`) that returns a `GenericType` with `typeVariableValues` per the
  table, sets multiplicity (LG-24) and copies stereotypes and tagged values; use it in `buildRelationTypeFromTable`.
  Switching accessors to precise types changes what the query builder sees: it already handles
  `PrecisePrimitiveType` in several places (data-product accessors are already precise), but grep and test the
  accessor-mode filter, post-filter and projection paths, and note nothing in legend-query-builder handles
  `CORE_PURE_PATH.VARIANT` yet (inferred).
- **Test:** rewrite `V1_AccessorHelper.test.ts:414` as an engine-parity table (raw path + `typeVariableValues` +
  multiplicity per type); add an engine-backed parity test against `lambdaRelationType` for every type except
  `BINARY`/`VARBINARY`.

### LG-24 Column multiplicity rule for `nullable === undefined` (ran)

- **Where:** `V1_AccessorHelper.ts:206-210` (`col.nullable ? ZERO_ONE : ONE`); `Column.ts:29` (`nullable?: boolean`);
  `V1_DatabaseBuilderHelper.ts:508`.
- **Problem:** the engine's typing rule is `(nullable == null || nullable) ? [0..1] : [1]` (`:963-964`), but its
  protocol field is a Java `boolean`, so a column without `nullable` in JSON is `false` → `[1]`; its parser always sets
  the field (`RelationalParseTreeWalker.java:259-269`). So legend-graph's `undefined → [1]` matches for grammar-built
  tables but is wrong for view columns (engine: `[0..1]` even for primary keys) and generated lakehouse columns
  (`STO_Internal_Relational_Helper.ts:25-39`, no `nullable` and no type).
- **Impact:** once views or generated tables are typed locally, nullable columns become `[1]`: null-aware operators
  are hidden and Cube's NULL guard on negations (PLAN §8.4) is skipped. The test helper (`V1_AccessorHelper.test.ts:136-160`)
  never sets `nullable`, so nothing tests multiplicity.
- **Proof:** `local-typing/probe.mjs`, `probe2.mjs` (deleting `nullable` from the JSON makes every column `[1..1]`),
  `run1.mjs`.
- **Fix:** make the rule explicit and documented in the new typing function: tables `nullable === false ? ONE :
ZERO_ONE` (or `undefined → ONE` for parity with the engine's protocol default; **decision**); view columns inherit
  from the underlying column, else `ZERO_ONE`; generated columns `ZERO_ONE`.
- **Test:** `true` → `[0..1]`, `false` → `[1]`, `undefined` → the documented choice; a view column over a NOT NULL
  column; a generated column → `[0..1]`.

### LG-25 View columns are built as an invented `VARCHAR(50)` (ran)

- **Where:** `V1_DatabaseBuilderHelper.ts:589-612` (`buildViewFirstPass`: `col.type = new VarChar(50)`);
  `buildViewSecondPass` (`:640ff`) builds the column mappings but never fixes the type.
- **Impact:** a local typer would report `Varchar(50)` for numeric and date view columns; Studio already shows
  `VARCHAR(50)` for every view column in the mapping editor source tree (`TableOrViewSourceTree.tsx:306`),
  `DatabaseDiagramHelper.ts:60` and `DatabaseSchemaExplorer.tsx:171`.
- **Proof:** `local-typing/run1.mjs`: view `V(ID: T.ID PRIMARY KEY, NAME: T.NAME)` → `ID:VarChar(50)`,
  `NAME:VarChar(50)`, `nullable` undefined; engine (`probe2.mjs`) `Varchar(0)[0..1]`.
- **Fix:** in `buildViewSecondPass`, when a mapping's operation is a plain column reference (`TableAliasColumn`,
  possibly through joins) copy the source column's type and `nullable`; otherwise mark the type unknown (not
  `VarChar(50)`) and let the typer use a documented fallback. This deliberately diverges from the engine's
  `Varchar(0)`.
- **Test:** a view over `T(ID INTEGER PRIMARY KEY, AMT DECIMAL(10,2))` has `Integer` and `Decimal(10,2)` columns with
  copied nullability; a computed column (`toUpper(T.NAME)`) gets the fallback.

### LG-26 Ingest/matview typing strips packages and parameters; unknown types become `String` (ran)

- **Where:** `V1_AccessorHelper.ts:95-105` (`buildV1GenericType`), `:107-161` (milestone columns, `PRECISE_PRIMITIVE_TYPE.TIMESTAMP`
  at `:147`, `:155`), `:163-193` (`buildRelationTypeFromIngestDataset`), `:383-401` (`buildRelationTypeFromMetadata`).
  ```ts
  // Strip package prefix — primitive types are indexed by simple name
  const typeName = fullPath.includes('::')
    ? fullPath.substring(fullPath.lastIndexOf('::') + 2)
    : fullPath;
  ```
- **Problem:** ingest dataset schemas already declare Pure relation-type columns (`V1_IngestDatasetSchema.columns:
V1_RelationTypeColumn[]`, with `typeVariableValues` and multiplicity), but the builder keeps only the last path
  segment, rebuilds a fresh generic type (dropping parameters) and silently falls back to `String` on any failure
  (`returnUndefOnError` at `:176-182`, `:389-395`).
- **Proof:** `precise-primitives/probe4.mjs`, `local-typing/run3.mjs`: `Varchar(255)`, `…::Varchar(10)`,
  `Numeric(10,2)` lose their parameters; an enum in the graph (`test::Color`) becomes `String`; the phantom
  `…::Date` becomes standard `Date`; `Variant` is correct; `LAKE_FROM`/`LAKE_THRU` resolve to `Timestamp` only because
  of the strip; an unknown type becomes `String[0..1]`.
- **Impact:** query builder and Studio accessors over ingest definitions (`#I{…}#`, `V1_ValueSpecificationBuilderHelper.ts:585-607`)
  and matview datasets lose `Varchar(n)`/`Numeric(p,s)`; enums and unknown types silently become `String`. Any local
  data-product/ingest typing depends on this code.
- **Fix:** pass each dataset column's own V1 generic type to `resolveGenericTypeFromProtocolWithRelationType` (i.e.
  reuse `V1_buildRelationTypeFromV1RelationType`); use `meta::pure::precisePrimitives::Timestamp` for the milestone
  columns; delete the strip once LG-9 lands; warn or throw instead of falling back to `String`. For
  `buildRelationTypeFromMetadata` see LG-19/20.
- **Test:** ingest content shaped like `TEST_DATA__QueryBuilder_Accessors.ts:687-860` plus full-path `Varchar(10)`,
  `Numeric(10,2)`, a user enum and `Variant`: raw type, parameters and multiplicity per column; milestone columns are
  `Timestamp`.

### LG-27 Studio `MockDataUtils` has a second, more divergent relational→primitive map (traced)

- **Where:** `legend-application-studio/src/stores/editor/utils/MockDataUtils.ts:223-256`
  (`getPrimitiveTypeFromRelationalType`); callers `DatabaseBuilderState.ts:98-195`, `ServiceTestDataState.ts:115-130`,
  `ServiceTestDataEditor.tsx:170`.
- **Problem:** `DOUBLE`/`REAL` → INTEGER, `NUMERIC` → Number but `DECIMAL` → Decimal, `BIT` → String, `DATE` → Date (not
  StrictDate), `JSON` → undefined.
- **Impact:** the Database builder's column preview generates `$row.getInteger('C_DOUBLE')` and `getString` on BIT
  columns (the runtime failure is inferred); service test-data mocks get the wrong literal types.
- **Fix:** delete it; use the legend-graph helper (the standard-primitive form for TDS getters).
- **Test:** `buildTableToTDSQueryColumnQuery` on DOUBLE uses `getFloat`, BIT `getBoolean`, DATE `getStrictDate`.

### LG-28 Data Cube synthesizes tables without nullability and with lossy mappings (traced)

- **Where:** `legend-application-data-cube/src/stores/LegendDataCubeDataCubeEngine.ts:552-563, 765-776` (`V1_Column`
  without `nullable`), `:1782-1838` (`_getColumnType`), `:1447-1497` (cache path).
- **Problem:** synthesized columns never set `nullable`, so the engine types every column `[1]` (ran: omitted
  `nullable` → `[1..1]`); case label `'TININT'` is misspelt (TINYINT rejected); `BOOLEAN` → `VARCHAR` with no size;
  `DECIMAL`/`VARCHAR` carry no parameters; the cache path maps Timestamp/DateTime to DATE (time lost),
  Decimal/Numeric to FLOAT, Variant to VARCHAR, Binary to Bit.
- **Impact:** Data Cube local-file, Iceberg and cached sources get wrong column types and multiplicities.
- **Fix:** `nullable = true` (or DuckDB's reported nullability); fix the typo, `BOOLEAN → V1_Bit`, parameters; cache
  path `Timestamp → V1_Timestamp`, `Decimal/Numeric → V1_Decimal/V1_Numeric` with parameters. Move to the shared typer
  once it exists.
- **Test:** `_getColumnType` and cache-path unit tests (TINYINT accepted, BOOLEAN → Bit, TIMESTAMP → Timestamp,
  `nullable = true`).

---

## Group F: lossless numbers

### LG-29 Execution results are parsed lossily by default (ran)

- **Where:** `V1_RemoteEngine.ts:849-891` (`runQuery`), `:946-979` (`parseExecutionResults`, `JSON.parse` at `:961`,
  `:977`); `legend-shared/src/network/NetworkUtils.ts:268-302` (`response.json()` at `:302`);
  `legend-shared/src/format/FormatterUtils.ts:201-218`.
- **Problem:** the default is `JSON.parse`; `convertUnsafeNumbersToString` protects unsafe integers but
  `isLossSafeNumber('1.1000000000000000')` is true, so Decimal/Numeric scale is lost; `runQuery` without
  `returnAsResponse` uses `response.json()` (always lossy).
- **Proof:** `relation-types/lossy2.mjs`: wire `[10248, 9007199254740993, …, 1.1000000000000000]` → default
  `[10248, 9007199254740992, …, 1.1]`; convert-unsafe keeps the integer, loses the scale; lossless keeps both. (The
  engine itself rounded a large Decimal literal in the SQL, so only Integer and scale loss are proven on the response
  side.)
- **Impact:** default or lossy paths: `QueryBuilderDataCubeEngine.ts:216-225`, `LegendDataCubeDataCubeEngine.ts:1685-1690`,
  `DataProductAccessPointState.ts:274-280`, `EmbeddedLegendSQLPlaygroundPanelState.ts:185-190`,
  `FunctionEditorState.ts:631-645`, `LegendSQLStudioPlaygroundState.ts:196`, `DatabaseBuilderState.ts:880`, query
  builder typeahead/preview (`QueryBuilderFilterState.ts:536`, `QueryBuilderPostFilterState.ts:501`,
  `QueryBuilderExplorerState.ts:1037, :1081`). The main grid (`QueryBuilderResultState.ts:574`) keeps integers but
  loses scale.
- **Fix:** lossless by default for TDS and relation results (keep a number as a string when it is unsafe or has a
  fractional part with trailing zeros, or the column is Decimal/Numeric); give `runQuery` callers a lossless helper and
  move the raw callers onto it.
- **Test:** `parseExecutionResults` on
  `{"builder":{"_type":"tdsBuilder","columns":[{"name":"big","type":"Integer"},{"name":"nume","type":"meta::pure::precisePrimitives::Numeric"}]},"result":{"columns":["big","nume"],"rows":[{"values":[9007199254740993,1.1000000000000000]}]}}`
  keeps `'9007199254740993'` and `'1.1000000000000000'` under default options.

### LG-30 grammarToJson responses are parsed lossily (ran)

- **Where:** `legend-shared/src/network/NetworkUtils.ts:301-302`; `V1_EngineServerClient.ts:403-520`
  (`grammarToJSON_model`, `_lambda`, `_lambda_batch`, valueSpecification); `V1_CInteger.ts:26-27`,
  `V1_CDecimal.ts:26-30` (`value!: number`).
- **Problem:** the engine's JSON has the exact literal text; `response.json()` rounds it, and the protocol classes
  store a JS `number`, so even a lossless parse has nowhere to keep it.
- **Impact:** Studio text mode and lambda editors, query builder text mode, any Pure text → JSON → execute or save flow:
  an Integer literal above 2^53 changes (`…993` → `…992`, and the engine executes the changed query: ran, SQL shows
  `9007199254740992`); Decimal literals lose digits and scale (`1.10` → `1.1`).
- **Proof:** `relation-types/lossy.mjs`, `lossy2.mjs`.
- **Fix:** a `NetworkClient` option that parses JSON losslessly (`parseLosslessJSON` keeping unsafe or scale-bearing
  numbers as strings) for grammarToJson and execute; widen `V1_CInteger.value` / `V1_CDecimal.value` to
  `number | string`; serialize request bodies with `stringifyLosslessJSON` (Jackson coercing a quoted number is
  inferred, not verified).
- **Test:** engine-backed round trip `|9007199254740993` and `|1.10D` → JSON → grammar returns identical text (read the
  response as text: the test helpers' axios JSON parsing is lossy too).

---

## Engine-side defects seen while verifying (not legend-graph; file as engine issues)

- `CHAR(n)` → `Varchar(1)` (`RelationalCompilerExtension.java:1024-1032`, hard-coded `1L`).
- `BINARY`/`VARBINARY` fail the whole table accessor with HTTP 500 (`convertTypes` has no case;
  `dataTypeToCompatiblePureType` in `platform_store_relational/functions.pure:98-121` has no Binary branch).
- View columns are typed `Varchar(0)[0..1]` and primary keys are ignored (`HelperRelationalBuilder.java:474-478`).
- `FLOAT → Float4` and `REAL → Double` look inverted against SQL widths (inferred).
- The `ColSpec` deserializer never reads `multiplicity`: `extend(~[c:Varchar(10)[0..1]])` errors mention
  `ColSpecArray<(c:Varchar(10)[NULL])>` (ran).
- Dotted quoted table names are split on `.` by `RelationStoreAccessorPureParser.java` (`code.trim().split("\\.")`),
  so `#>{db.S1."a.b"}#` can't be re-parsed from text; legend-graph's JSON handling of the path is correct (ran,
  `valuespec/t_dotted.mjs`).
