# legend-graph issues: validation and fix plan

Companion to [LEGEND-GRAPH-ISSUES.md](LEGEND-GRAPH-ISSUES.md). Checked on 2026-10-06 against this checkout
(`graphIssues` = master `201aa70cf`), the local legend-engine checkout (`93d92b4852`), legend-pure
(`precisePrimitives.pure`), and the live engine on `localhost:6300`. The harness probes were re-run against **this**
checkout's `packages/*/lib` (copies in the session scratchpad with `ROOT` repointed), not the `cubeV1` build.

## 0. Progress

**Session goal (owner, 2026-10-06):** get `@finos/legend-graph` into a good state to use as a dependency, so new fixes
should land in legend-graph. Fixes in other packages only where a legend-graph change needs them.

Each fix is its own branch and commit. From 2026-10-06 the no-decision fixes run in parallel, one agent per
worktree under `/Users/mauriciouyaguari/Goldman Sachs/studio-worktrees/<branch>` (based on master `d320806c9`).
I review each diff before pushing it to the fork and opening a PR against `finos/legend-studio` master.

| ID | Fix | Issues | Branch | Status |
| -- | --- | ------ | ------ | ------ |
| — | Batch relation-type key | LG-1, LG-2 | `batchRelationTypeResultKey` | **merged** ([#5593](https://github.com/finos/legend-studio/pull/5593)) |
| — | Data Cube `TININT` typo | LG-28 (part) | `dataCubeTinyIntColumnType` | **merged** ([#5594](https://github.com/finos/legend-studio/pull/5594)) |
| — | Quoted column names, plus an engine round trip | LG-8 | `relationAccessorQuotedColumns` | **merged** ([#5595](https://github.com/finos/legend-studio/pull/5595)) |
| — | Relation-type error mapping, single ColSpec `function2` | LG-18, LG-22 | `relationTypeErrorsAndColSpecFunction2` | **merged** ([#5596](https://github.com/finos/legend-studio/pull/5596)) |
| A | Type parameters dropped on save (owner to review closely) | LG-14 | `precisePropertyTypeParameters` | **merged** ([#5602](https://github.com/finos/legend-studio/pull/5602), 2026-10-06). Follow-ups in J. |
| B | Data-product failure handling | LG-3, LG-4 | `dataProductRelationTypeFailures` | **merged** ([#5601](https://github.com/finos/legend-studio/pull/5601), 2026-10-06). |
| C | Studio's second relational type map | LG-27 | `studioMockDataRelationalTypes` | **merged** ([#5597](https://github.com/finos/legend-studio/pull/5597), 2026-10-06). Open question was DECIMAL/NUMERIC → Decimal vs engine Float. |
| D | Data Cube synthesized column types (rest) | LG-28 | `dataCubeDuckDBColumnTypes` | **PR open**: [#5600](https://github.com/finos/legend-studio/pull/5600) (`ba739f25f`): decimal columns load, VARCHAR keeps its size, cache-path types fixed. The BOOLEAN → Boolean and nullable-columns part was **dropped by the owner** (D8); branches deleted, last commit `5532a38b5` (recoverable from reflog). |
| E | Lossless relation types (2 stacked branches) | LG-19, LG-20 | `losslessLambdaRelationType` → `dataProductAccessorRelationTypes` | **PRs open**: [#5603](https://github.com/finos/legend-studio/pull/5603) (`15f8dbbe3`, new `getLambdaResolvedRelationType` methods) and [#5604](https://github.com/finos/legend-studio/pull/5604) (`b844ec296`, accessors use them; stacked, merge after #5603). `resolveDataProductAccessor` stays backward compatible; the option is `TEMPORARY__unresolvedColumnType` until D4. |
| F | Real types for view columns | LG-25 | `databaseViewColumnTypes` | **PR open**: [#5599](https://github.com/finos/legend-studio/pull/5599) (`f4f60a5ed`). Hash and serialization unchanged. **Coordination for PR 3b (LG-7):** view accessors would pick up these copied types, but the engine types view columns as `Varchar(0)[0..1]`; PR 3b must override per D6. |
| G | Ingest column types (first part) | LG-26 | `ingestAccessorColumnTypes` | **merged** ([#5598](https://github.com/finos/legend-studio/pull/5598), 2026-10-07). Matview columns come via #5604; the package strip waits for LG-9 (standard primitives then also need full-path resolution). |
| H | Precise-type constant cleanup, scoped to legend-graph | LG-10 | `precisePrimitiveTypePaths` | **PR open**: [#5605](https://github.com/finos/legend-studio/pull/5605) (`bf6ac3b14`). `TIMESTAMP` fixed, 4 members deprecated, new `PRECISE_PRIMITIVE_TYPE_PATHS`, phantom paths no longer resolve. legend-graph only; consumer audit found one benign change (Data Cube `isPrimitiveType`). Phantom paths still resolve through the ingest package strip until I (LG-9). |
| J | LG-14 follow-ups: function parameter type parameters, return-type and variable hashes | LG-14 (rest) | `functionParameterTypeParameters` | **PR open, conflicting**: [#5606](https://github.com/finos/legend-studio/pull/5606). #5602 merged, so it needs a rebase onto master. |
| I | Full paths for precise types | LG-9 | — | **unblocked once #5605 merges** (builds on it). Riskiest change: ships alone. Must also give standard primitives full-path resolution once the ingest strip goes (G), and can remove the `no-duplicate-enum-values` disable only when `DATETIME` is removed (major). |

Waiting on owner decisions: D1/D2 (LG-5/6, then LG-7), D3 (LG-11/12/13, then LG-15/16), D4 (LG-21), D5 (LG-17),
D6 (LG-23/24), D7 (LG-29/30).

**D8: resolved, dropped for now.** The Data Cube BOOLEAN → Boolean and nullable-columns change is not shipping (it changes saved Cubes).

### Status of all 30 issues (end of session, 2026-10-06)

| Status | Issues |
| ------ | ------ |
| Merged | LG-1, LG-2 (#5593); LG-28 `TININT` typo (#5594); LG-8 (#5595); LG-18, LG-22 (#5596); LG-3/4 (#5601); LG-27 (#5597); LG-14 properties, derived properties, lambda parameters (#5602); LG-26 ingest columns (#5598) |
| PR open | LG-10 (#5605); LG-14 functions and variables (#5606, needs rebase); LG-19 (#5603); LG-20 (#5604, needs rebase; also covers matview columns of LG-26); LG-25 (#5599); LG-28 decimal and cache types (#5600) |
| Dropped | LG-28 BOOLEAN → Boolean and nullable columns (D8) |
| Not started, no decision needed | LG-9 (unblocked once #5605 merges; ships alone) |
| Waiting on an owner decision | LG-5/6, then LG-7 (D1/D2); LG-11/12/13, then LG-15/16 (D3); LG-21 (D4); LG-17 (D5); LG-23/24 (D6); LG-29/30 (D7) |

**Merge order (remaining).**
1. In any order: #5599, #5600, #5605, #5603.
2. Then rebase and merge #5604 (conflict with merged #5598) and #5606 (needs rebase after #5602).

**Follow-ups found, not fixed.**
- Nested type arguments (`List<Varchar(10)>`) still drop their values.
- Changing a column of a relation return type still doesn't change the function hash.
- Relation-typed variables: protocol and metamodel hashes disagree. Pre-existing; nothing compares them.
- Studio `ServiceTestDataEditor.changeColumn` builds the value from the previous column's type.
- DuckDB `TIME`, `TIMESTAMP WITH TIME ZONE`, `HUGEINT`, `UBIGINT`, `UUID` and `BLOB` still throw; the Data Cube cache truncates decimals to `(18,3)`.
- Remove the `no-duplicate-enum-values` disable when `PRECISE_PRIMITIVE_TYPE.DATETIME` is removed (major).
- The flaky Studio test `DatabaseEditor.test.tsx` › "VIEW tab active" (task chip offered).

## 1. Verdict per issue

Evidence: **R** = reproduced here; **C** = confirmed by reading the code (and engine / Pure source where noted);
**D** = taken from the doc, not independently checked.

| #     | Valid? | Evidence | Notes from this pass |
| ----- | ------ | -------- | -------------------- |
| LG-1  | yes | C (+ engine source, captured payload) | Engine `LambdaRelationTypesResult` has had only `result` since the batch API landed (engine `a7a0e4f241`, 2026-07-08), so the batch call has **never** worked. Plain rename, no `results` fallback needed. |
| LG-2  | yes | C | Mocks at `DataProductIngestUtils.test.ts:742, :771`, `DataProductViewer.test.tsx:412`. |
| LG-3  | yes | C | Bare `catch` + `finally` sets `lastComputedLambdaHash`; the single-call path has the same `finally` pattern. |
| LG-4  | yes | C | `catch` returns `{ results: new Map() }`; `fetchRelationTypeFromEngine` fulfils with `undefined`. |
| LG-5  | yes | **R** | `#>{test::Db.S2.T}#` → `#>{test::Db.S1.T}#`; `$r.ONLY_S2` fails. |
| LG-6  | yes | **R** | `#>{test::Db.DEF_T}#` → `#>{test::Db.S1.T}#`. Correction: the engine does **not** throw on 4+ parts; any non-3-part path ≥ 2 is read as `default` + `path[1]`. |
| LG-7  | yes | **R** | View and included-DB table both throw "Can't build accessor for database". |
| LG-8  | yes | **R** | Columns come back as `"first name"`; `$r.'first name'` fails. Engine strip confirmed in `RelationalCompilerExtension.java`. |
| LG-9  | yes | C | Short-name `.path`, `getOwnNullableType` special case, package missing from `AUTO_IMPORTS`. Hash mismatch numbers: D. |
| LG-10 | yes | C (+ Pure source) | Pure defines exactly 13 types; `Date`/`Time` commented out, no `Decimal`. ~100 references to the phantom members across 8 packages. |
| LG-11 | yes | C (class shape) / D (`isSubType` results) | `PrecisePrimitiveType extends DataType`, no generalization. |
| LG-12 | yes | C (M1, M2) / D (M3, Data Quality impact) | M1's only caller is Data Quality `LambdaEditorWithGUIState.ts:264`. |
| LG-13 | yes (low) | C | Visitor throws; `allOwnElements` omits precise types. |
| LG-14 | yes | **R** (lambda params) / C (properties, hashes) | `{v: Varchar(10)[1]\|$v}` → `v: Varchar[1]`; `Relation<(a:Integer)>` → bare `Relation`. Neither `Property.hashCode` nor `V1_Property.hashCode` includes parameters. |
| LG-15 | yes (latent) | D | |
| LG-16 | yes (latent) | D | |
| LG-17 | yes | **R** | `select(~[ID:Integer])` → `select(~[ID])`; `extend(~[c:Varchar(10)[0..1]])` → `extend(~[c])`. |
| LG-18 | yes | **R** | Single ColSpec renders `~cnt:x\|$x:x\|$x`. |
| LG-19 | yes | C | Both single and batch paths keep only path/name/multiplicity. |
| LG-20 | yes | C | Still present after master `622a0658b`, which touched `DataProductQueryBuilderState.ts`. |
| LG-21 | yes | **R** | `Can't find type 'my::Color'` aborts the whole relation. |
| LG-22 | yes (low) | C | Data Cube calls `engineServerClient.lambdaRelationType` directly, so it is unaffected by the change. |
| LG-23 | yes | C (legend-graph map) / D (per-type engine table) | |
| LG-24 | yes | C (+ engine source `(nullable == null \|\| nullable) ? 0 : 1`) | |
| LG-25 | yes | C | `col.type = new VarChar(50)` at `V1_DatabaseBuilderHelper.ts:599`. |
| LG-26 | yes | C | Strip in `buildV1GenericType`, `String` fallback. |
| LG-27 | yes | C | Also: `BigInt` and `Json` return `undefined`. |
| LG-28 | yes | C (`'TININT'`) / D (rest) | |
| LG-29 | yes | C | Valid, but the doc's "lossless by default" fix is **not** low risk (see Phase 6). |
| LG-30 | yes | C (types) / D (runtime loss) | Widening `V1_CInteger.value` / `V1_CDecimal.value` is a type-level break. |

All 30 issues hold up. None are false positives. A few doc details need changing:

1. **LG-5/6/7 fix: don't reuse `V1_findRelation` as is.** It is the right search order (tables → views → tabular
   functions, across includes), but on `INTERNAL__LakehouseGeneratedDatabase` it **creates** schemas and tables
   (`getOrCreate…`), and it asserts on duplicate names across includes. Accessor resolution needs a read-only variant
   that shares `findRelationInSchema`.
2. **Two-part path rewrite.** `Accessor.path` is `[owner, schema, accessor]` and `Accessor.hashCode` hashes it. Resolving
   `[db, T]` to schema `default` therefore re-serializes as `[db, 'default', T]`: every saved default-schema query
   changes text and hash on its next save. This is an owner decision (D1), not a detail.
3. **Group B as one PR is the highest-risk change in the doc.** Split it in three (Phase 3).
4. **Group D does not depend on Group B.** `resolveGenericTypeFromProtocolWithRelationType` already resolves
   `Varchar(n)` from short names, and the engine accepts short names. LG-14 is live corruption, so it moves ahead of B.
5. **The doc's baseline moved.** Master `622a0658b` touched `V1_PureGraphManager.ts` and
   `DataProductQueryBuilderState.ts`, so some line numbers in the issues doc are stale. The bugs are unchanged.

## 2. Which PR fixes which issue

Every issue has a PR. LG-7 was missing from the first draft and is now PR 3b.

| PR | Issues | Needs a decision? |
| -- | ------ | ----------------- |
| PR 1 | LG-1, LG-2 | no |
| PR 2 | LG-18, LG-22 | no |
| PR 3 | LG-5, LG-6 | **D1, D2** |
| PR 3b | LG-7 | no (view columns follow D6) |
| PR 4 | LG-8 | no |
| PR 5 | LG-3, LG-4 | no |
| PR 6 | LG-14 | no |
| PR 7a / 7b | LG-17 | **D5** (7a) |
| PR 8 | LG-15, LG-16 | no |
| PR 9 | LG-11, LG-12, LG-13 | **D3** |
| PR 10 | LG-10 | no |
| PR 11 | LG-9 (and the strip removal from LG-26) | no |
| PR 12 | LG-21 | **D4** |
| PR 13 | LG-19 | no |
| PR 14 | LG-20 | no |
| PR 15 | LG-25 | no (Studio display only; the typer follows D6) |
| PR 16 / 17 | LG-23, LG-24 | **D6** |
| PR 18 | LG-26 | no |
| PR 19 | LG-27 | no |
| PR 20 | LG-28 | no |
| deferred | LG-29, LG-30 | **D7** |

## 3. Decisions needed from the owner

Seven questions. Only D1 and D2 block anything soon (PR 3). Each has a recommendation, so "go with the
recommendations" is a valid answer.

- **D1 (PR 3): how a schema-less table reference is saved.** A query written as `#>{my::DB.PERSON}#` means "table
  `PERSON` in the default schema". After the fix, should saving keep it as written, or rewrite it to
  `#>{my::DB.default.PERSON}#`? The engine treats both the same. **Recommendation: keep it as written.** Rewriting
  makes every such saved query show up as changed the next time anyone saves it.
- **D2 (PR 3): malformed paths with 4 or more parts**, like `#>{db.a.b.c}#`. The engine silently reads this as table
  `a` in the default schema. **Recommendation: throw a clear error.** The Pure grammar can't produce such a path, so
  this rarely happens.
- **D3 (PR 9): how `Varchar` comes to count as a `String`** (and `Int` as an `Integer`, and so on).
  - Option A: make precise types a subclass of `PrimitiveType`. Every `instanceof PrimitiveType` check (31 files)
    then starts matching them, which changes behaviour in many places at once.
  - Option B: keep the separate class and teach `isSubType` the hierarchy.
  - **Recommendation: B**, without adding a new visitor method. A new method on the exported visitor interface would
    break every external implementer.
- **D4 (PR 12): what to show for a column whose type isn't in the graph** (for example an enum that wasn't loaded).
  Today the whole relation fails. **Recommendation: type that column as `Any` and return the list of unresolved
  columns**, so callers can warn. This needs no new metamodel class.
- **D5 (PR 7a): old-style column types in Data Cube queries.** Data Cube writes column types in the old format
  (`type: 'Integer'`). When we read one of those and write it back, should we keep the old format or convert it to the
  new `genericType` field? **Recommendation: keep whatever came in**, so existing Data Cube queries and snapshots
  don't change.
- **D6 (PR 16/17, also PR 3b's view columns): should the local column typer copy the engine exactly, bugs included?**
  The engine has known wrong answers:
  - `CHAR(10)` comes back as `Varchar(1)`;
  - `BINARY` makes the whole table fail;
  - view columns come back as `Varchar(0)`, optional;
  - a column with no `nullable` flag is required in tables but optional in views.

  **Recommendation: yes, copy the engine, and file the engine bugs.** The engine compiles the query in the end. If we
  type a view column as `Integer` but the engine says `Varchar`, users can build a `> 5` filter the engine then
  rejects. When the engine is fixed, the local typer follows. (This replaces old D6–D9.)
- **D7 (deferred, LG-29/30): exact numbers in query results.** Keeping integers above 2^53 and decimal scale exact
  means some cells hold strings instead of numbers, which affects formatting and sorting in every grid.
  **Recommendation: opt in screen by screen**, starting with Decimal columns, not as a global default.

## 4. PR sequence

Each PR is independently shippable, branches off `master`, and needs a `patch` changeset for every touched library
package (`legend-application-studio`, `legend-extension-dsl-*`, `legend-data-cube`, `legend-application-data-cube`
included; only `*-deployment` packages are exempt). New test files get a `2026-present` header.

Risk scale: **low** = fixes a path that is broken today or only adds code; **medium** = changes what users see on a
path that works today; **high** = changes core identity (paths, hashes) or many packages at once.

### Phase 1: live bugs, small and independent

**PR 1: batch relation-type key (LG-1, LG-2).** Low.
- legend-graph: `V1_BatchLambdaRelationTypeResponse.results` → `result`, both maps `?? {}`. Keep the parsed
  `V1_BatchLambdaRelationTypeResult.results` (a `Map`) as is so consumers don't change in this PR.
- Make `V1_RemoteEngine.getBatchLambdasRelationTypeFromRawInput` call `V1_buildBatchLambdaRelationTypeResult` instead
  of re-parsing.
- dsl-data-product: flip the three mocks to `{ result, errors }`.
- Tests: unit test on the captured payload (`batch_resp.json`, strip `trace`) asserting `typeVariableValues[0].value
  === 5` and the error message; spy test on `getBatchLambdasRelationTypeFromRawInput`.
- Effect: data-product typing starts working in Studio, the viewer, and the Marketplace AI chat. Smoke-test those three.
- Note: the exported wire type changes a field name. It never matched the wire, so `patch` is defensible. Say so in
  the changeset.

**PR 2: quick wins (LG-18, LG-22).** Low.
- `colProtocol.function2 = guaranteeType(fun2, V1_Lambda)`.
- Copy the `getLambdaReturnType` 400 → `CompilationError` mapping into both relation-type methods.
- Tests as in the issues doc. No in-repo caller checks `NetworkClientError` on these methods.

**PR 3: schema-scoped accessor lookup (LG-5, LG-6).** Medium-low. Needs D1 and D2.
- New helper: normalize an accessor path the engine's way (`[db,t]` → `default`/`t`, `[db,s,t]` → `s`/`t`, otherwise
  throw), then do a **read-only** lookup in that schema (shares `findRelationInSchema`; no `getOrCreate`).
- Use it in the `RELATION_STORE_ACCESSOR` builder case, `collectAccessorsInRawLambda`, and
  `createAccessorFromPackageableElement`. Keep the `tables[0]` default only for the no-table call from
  `changeAccessorOwner`.
- Tests: duplicate table name across schemas; default-schema two-part path (builder round trip keeps the path per D1);
  `collectAccessorsInRawLambda` with a two-part path; the existing 'handles multiple schemas and tables' test still
  passes.
- Caveat for the PR description: queries already saved with the wrong rewrite can't be repaired automatically.

**PR 3b: views and included databases as accessors (LG-7).** Medium. After PR 3 (reuses its read-only lookup).
- Resolve tables, then views, across included databases; reject tabular functions with the engine's message.
- `RelationalStoreAccessor` accepts `Table | View` (an exported type widening). The accessor owner stays the database
  named in the path.
- Extend the schema/table picker (`AccessorQueryBuilderState`) to list views and included-database tables.
- View columns follow D6 (the engine's typing) until the local typer lands.
- Tests: accessor for a view returns the view's columns; accessor through an including database returns the
  included table's columns; `#>{db.S.V}#` builds without throwing.

**PR 4: quoted column names (LG-8).** Low. Strip one pair of surrounding quotes in `buildRelationTypeFromTable` only.

**PR 5: data-product failure handling (LG-3, LG-4).** Low-medium (UI behaviour). Studio and dsl-data-product.
- Studio editor: set `lastComputedLambdaHash` only on success, log the error, show per-key `errors` entries, and fall
  back to the single call on batch failure. Apply the same success-only hash to `updateLambdaRelationColumns`.
- Viewer: reject when the key is absent (with the engine's per-key message), keep the batch error, and pick the engine
  error explicitly instead of `error.errors[1]`.
- Tests: the cases listed under LG-3 and LG-4.

### Phase 2: protocol fidelity

**PR 6: type parameters on properties, derived properties and lambda parameters (LG-14).** Medium (core builder path).
- Builders resolve through `resolveGenericTypeFromProtocolWithRelationType`; transformers emit via
  `V1_createGenericType`.
- Change `Property.hashCode` and `V1_Property.hashCode` **in the same commit**, adding the parameter hash only when
  parameters exist. Existing hashes and snapshots then stay byte-identical. Check `DerivedProperty` and
  `V1_DerivedProperty` the same way.
- Tests: a new round-trip fixture with **short-name** `Varchar(200)`, `Numeric(10,2)`, `Timestamp`, `BigInt` (full
  paths come in PR 11), plus the three lambda-parameter cases. Run the full round-trip and query-builder groups.

**PR 7a: `V1_ColSpec` protocol (LG-17, V1 only).** Low. Add `genericType`, `multiplicity`, `stereotypes`,
`taggedValues`; deserialize both shapes; serialize per D5. V1 round trip becomes lossless. This is the only fix Cube's
direct V1 emission needs, so it can go first if Cube is waiting.

**PR 7b: metamodel `ColSpec` (LG-17).** Medium. Generic type plus multiplicity, both hashed; keep a deprecated `type`
getter; builder and transformer via the shared helpers; update `V1_QueryValueSpecificationBuilderHelper.ts` and
`DataQualityLambdaParameterParser.ts`.

### Phase 3: precise registry (Group B, split in three)

**PR 9 (B1): additive registry (LG-11, LG-12, LG-13).** Low-medium. Needs D3.
- One registry entry per type: `{path, name, superType, typeParameters}`. Type the index
  `Map<string, PrecisePrimitiveType>`. `isSubType`/`isSuperType` walk precise → standard.
- M2: restrict short-name lookup to the 13 real names and stop rebuilding the map per call.
- M1: reimplement on the registry so standard types map to themselves. This is a deliberate behaviour change: Data
  Quality `String` columns gain string operators.
- Point Data Cube's M3 at the registry (a separate commit in the same PR, or a follow-up).

**PR 10 (B2): enum cleanup (LG-10).** Medium (8 packages).
- Mark `DECIMAL`, `STRICTDATE`, `STRICTTIME` and `DATETIME` `@deprecated`. Don't remove them; removal is `major`.
- Repoint `TIMESTAMP` to `meta::pure::precisePrimitives::Timestamp`. That makes it equal to `DATETIME`, so audit every
  `switch` where the two sit in **different** branches (most group them together).
- Migrate consumers to `PRIMITIVE_TYPE.*` for standard types, one commit per package: data-cube,
  application-data-cube, query-builder, studio, lego. Add a relational constant if anything needs the
  datatype-class path.
- Update `PrimitiveType.test.ts`; run the Data Cube filter tests.

**PR 11 (B3): package, full-path index, auto-import (LG-9).** **High.** Changes `.path` on all 13 types.
- Give the types the package `meta::pure::precisePrimitives`, index them by full path, and add the package to
  `AUTO_IMPORTS`. Handle the `SystemModel.initializeAutoImports` ordering trap.
- Remove the `getOwnNullableType` special case and the `buildV1GenericType` strip (the LG-26 part).
- Audit `.path` consumers (`BasicValueSpecificationEditor.tsx` passes `.path`).
- Tests: round trip with full **and** short spellings (content and hash); `'Varchar'` still resolves in a section
  with no imports.
- Run everything, including the query e2e. Ship it alone.

**PR 8: `@Type` and precise literals (LG-15, LG-16).** Low (latent). Do it after PR 9, because LG-16 needs the
registry's precise → standard map.

### Phase 4: lossless relation-type API (rest of Group C)

**PR 12: per-column resilience (LG-21).** Low. Needs D4. Wrap the fallback and report unresolved columns instead of
throwing. Can ship any time.

**PR 13: lossless relation-type methods (LG-19).** Low (additive).
- Add `getLambdaRelationTypeV2` and a batch equivalent returning a metamodel `RelationType` via
  `V1_buildRelationTypeFromV1RelationType`.
- Add them to `AbstractPureGraphManager` as **non-abstract** methods (or implement them there) so external subclasses
  don't break.

**PR 14: migrate the converters (LG-20).** Medium (query builder shows precise, nullable types for data products
without an artifact). Delete `buildRelationTypeFromMetadata` and the metadata branch of `resolveDataProductAccessor`.
Other `RelationTypeMetadata` consumers (Studio testables, Data Quality, TDS) can migrate later, one at a time.

### Phase 5: local typing (Group E)

**PR 15: view column types (LG-25).** Medium-low (Studio's mapping editor and diagram now show real types). Display only: the accessor typer still follows D6.

**PR 16: engine-parity column typer (LG-23, LG-24).** Low (additive, nothing calls it yet). Needs D6.
- New exported function returning a `GenericType` with `typeVariableValues`, plus multiplicity, stereotypes and
  tagged values.
- Unit parity table, plus an engine-backed parity test in the grammar group (all types except `BINARY`).
- Leave `mapRelationalDataTypeToPrimitiveType` untouched (TDS callers).

**PR 17: switch accessors to the new typer.** **Medium-high.** Accessor columns become precise.
- Requires PR 9 (`isSubType`, so operator and editor matching still works) and PR 8 (precise literals serialize).
- Grep and test the accessor filter, post-filter and projection paths. Nothing handles `Variant` in the query builder
  yet.
- Rewrite `V1_AccessorHelper.test.ts:414`.

**PR 18: ingest/matview typing (LG-26).** Medium. Use each column's own V1 generic type, use the precise `Timestamp`
for milestone columns, and warn instead of falling back to `String`. The parameter and enum parts can ship before
PR 11; removing the strip waits for it.

**PR 19: Studio `MockDataUtils` (LG-27).** Low-medium. Switch to the legend-graph standard-primitive helper. Test the
`getFloat` / `getBoolean` / `getStrictDate` getters.

**PR 20: Data Cube synthesized tables (LG-28).** Medium.
- Ship the `'TININT'` typo and `BOOLEAN → Bit` as a first commit.
- Then `nullable`, parameters, and the cache-path mapping.
- Move to the shared typer after PR 16.

### Phase 6: lossless numbers (Group F), deferred

- **LG-29:** don't flip the default. A string where a number was expected changes formatting, sorting and aggregation
  in every grid. Add a lossless helper for `runQuery` callers and opt in per call site, starting with Decimal/Numeric
  columns. Needs D7.
- **LG-30:** widening `V1_CInteger.value` / `V1_CDecimal.value` to `number | string` breaks consumers at the type
  level. Prefer an additive field holding the exact literal text, and a lossless parse option on the grammarToJson
  client calls. Verify Jackson accepts quoted numbers before relying on it.

## 5. Suggested order at a glance

```
PR1 → PR2 → PR3 → PR3b → PR4 → PR5    (live bugs; PR2/PR4 can go in parallel)
PR6, PR7a, PR12                         (independent; any order)
PR9 → PR10 → PR11                       (registry; PR11 alone, last)
PR8 (after PR9) · PR7b · PR13 → PR14
PR15, PR16 → PR17 (after PR8, PR9) · PR18 (strip removal after PR11) · PR19 · PR20
Phase 6 when D7 is decided
```

## 6. Out of scope: file against legend-engine

The engine-side defects listed at the end of the issues doc: `CHAR(n)` → `Varchar(1)`; `BINARY`/`VARBINARY` HTTP 500;
view columns `Varchar(0)[0..1]` with primary keys ignored; `FLOAT`/`REAL` look inverted; the ColSpec deserializer
ignores `multiplicity`; dotted quoted table names are split by the accessor parser.
