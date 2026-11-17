# Legend Cube: user-defined functions in the definition flow, research and plan (2026-11-12)

How Cube's definition flow could draw the user-defined functions an access point calls, each call as a container of
its body's steps, and what the editable canvas would do with them. It is based on:

- legend-studio finos/master `caa7ca0fe`;
- legend-engine `3aeb3f0f7` (the files read are the same as finos/master `014a7af46`);
- legend-depot `d47f2a12` (the same as upstream master in the routes read);
- probes against the local engine on `:6300` (build `4.152.1-SNAPSHOT`, commit `aa1c755`).

The prototype is the local branch `cube-user-functions` in `../legend-studio-cube-functions`. The evidence, the mock
data, the scripts and the shots are in `../legend-studio-cube-functions-evidence/`. Every name in them is made up.
PLAN §11.33 holds the short version.

## Summary

- **Today the viewer refuses every access point whose rows come from a user function.** It shows "No flow for this
  definition: it reads a source Cube's flow doesn't show yet", then the Pure. Cube reads any call of a function with
  a package as a source, and the flow reads only ingest data sets. A function called in the middle of a chain takes
  its input with it: `#I{…}#->shop::common::onlyOpen()` reads as one source, so even the ingest data set before it is
  lost. A scalar function in a filter already draws, as a Filter by Expression.
- **The recommendation: open each call in the browser, before Cube reads the steps.** Put the function's body in the
  call's place, with the call's values in place of its parameters. Then draw the body's steps in a container (§11.29's
  frame), with the call on top: `ordersSince(%2026-01-01, 'EMEA')`. A call Cube can't open is one box, typed by the
  columns the function declares. It never refuses the whole flow.
- **Each host already has the bodies, and no engine call is needed.**
  - Studio has them in its graph, dependencies included.
  - Marketplace gets them from Depot: one request per project version returns every function of the project and of
    its dependencies.
- **Four facts shape the design:**
  1. A call names a function by its path without the signature its element carries (`activeOrders`, not
     `activeOrders__Relation_1_`). Overloads are told apart by how many values they take.
  2. A function only compiles with steps after it if it declares every column it returns (`Relation<Any>` doesn't).
     So after a closed box the columns are known.
  3. Legend Engine refuses generic functions.
  4. Data products are not in the finos engine, and the artifact Studio models lists no functions.
- **The prototype draws every case asked for.** In the mock, 9 of the 10 access points that call functions draw where
  today they are refused. The tenth already drew: its function is a scalar in a filter.
- **For the editable canvas, keep the call as one step.** Its inside is a locked drawing of the body. The Pure and the
  saved cube keep the call, never the body. To change its steps, people change the function itself.
- **Decided with the user on 2026-11-14** (§12): boxes, nesting for function containers, the call as one step, no Copy
  Its Steps Out, and a call holding more than 5 steps starts folded.

## 1. How it works today

The flow reads a lambda in the browser: `readCubeDefinition` (`CubeDefinitionReader.ts`) → `splitCubeLambda` →
`readCubeQuery` (core `QueryReader.ts`), with a `bindSource` that types ingest data sets from their definitions.

- **A call is read as a source.** `isCubeLambdaSource` treats any call whose name has `::`, and isn't one Cube reads as
  a step (`RELATION_INPUTS`), as a source. `findCubeLambdaSources` doesn't look inside one. The flow's `bindSource`
  refuses any source but `#I{}` with `CubeLambdaReadErrorKind.SOURCE`. The details name the function: "…and this one
  reads the function shop::orders::activeOrders()".
- **A short name is refused as `noStep`.** A call written without its package, e.g. `activeOrders()` under an import,
  has no `::`, so Cube looks for a step of that name and refuses it: "it uses activeOrders(), which Cube has no step
  for yet".
- **A scalar function in an expression draws.** `$o.ORDER_DATE >= shop::orders::defaultCutoff()` can't be read as a
  Filter by Column, so it is kept as a Filter by Expression, printed as written.
- **`findCubeDefinitionIngestDefinitions` misses the ingest definitions a function reads.** The host loads none for
  them, so even a flow that drew would show their data sets with no columns.

What the viewer shows today for each case, from the reader run on the mock (`scripts/ProbeToday.test.ts`) and the real
Marketplace on the mock (shots `today-*`):

| Case                                                    | Today                                       |
| ------------------------------------------------------- | ------------------------------------------- |
| `activeOrders()->groupBy(…)`, the basic case            | refused, `source`                           |
| `ordersSince(%2026-01-01, 'EMEA')->select(…)`, values   | refused, `source`                           |
| `largeActiveOrders(10000.0)` calling `activeOrders()`   | refused, `source`                           |
| `#I{…ORDERS}#->onlyOpen()->select(…)`, in the middle    | refused, `source`: the data set is lost too |
| `#I{…CUSTOMERS}#->join(activeOrders()->rename(…), …)`   | refused, `source`                           |
| `filter(o\|$o.ORDER_DATE >= defaultCutoff())`, a scalar | drawn: a Filter by Expression               |
| a function with two statements, one Cube can't draw     | refused, `source`                           |
| a function Depot doesn't have                           | refused, `source`                           |

## 2. From a call to a function

### 2.1 What the engine and Studio do

- **An element's name carries its signature.** The parser names a function `name + signature`
  (`DomainParseTreeWalker.java:537`). The suffix is built from each parameter's short type name and multiplicity,
  then the return type's (`HelperModelBuilder.terseSignatureSuffix`, `HelperModelBuilder.java:316-350`). For example:

  - `activeOrders__Relation_1_`
  - `ordersSince_StrictDate_1__String_1__Relation_1_`
  - `onlyOpen_Relation_1__Relation_1_`

  Type arguments don't count, so `Relation<Any>` and `Relation<(a:Integer)>` both give `Relation`. Depot stores the
  element at that path, with the suffix (checked on `:6300`).

- **No generic functions.** The engine's grammar refuses `function f<T>(…)`: "Type and/or multiplicity parameters
  are not authorized in Legend Engine" (`DomainParseTreeWalker.java:462-465`, checked on `:6300`).
- **A call keeps its name as written.** `AppliedFunction.function` is the text of the call: a full path, or a short
  name under an import, never with the suffix. `x->f(a)` is stored as `f(x, a)` (`DomainParseTreeWalker.java:1114-1119`,
  1298-1305; checked on `:6300`: `activeTrades()` stayed short in a function's body).
- **The compiler finds a function by `package::name` and picks an overload.**
  - It keys user functions by `package::name` without the suffix (`FunctionCompilerExtension.java:83-97`).
  - Overloads that take as many values share a builder, which takes the first, in the order registered, whose
    parameter types fit the call (`MultiHandlerFunctionExpressionBuilder.java:94-107`).
  - A short name is looked up under the section's imports, which come only from a `SectionIndex` in the model
    (`CompileContext.java:544-636`, `PureModel.java:1489-1501`). A lambda compiled alone gets only the engine's own
    imports (`Compiler.java:69-72`).
- **The caller sees the declared return type, not the body's** (`FunctionCompilerExtension.java:98`).
- **Studio has no resolver from a call to an overload.** Its graph keys functions by path with the suffix, so
  `V1_ValueSpecificationBuilderHelper` leaves `expression.func` undefined for a user call
  (`V1_ValueSpecificationBuilderHelper.ts:820-822`, comment at 915-922). Four places strip the suffix, each written
  its own way:
  - `V1_getFunctionNameWithoutSignature` (`V1_DomainHelper.ts:87-94`): `endsWith`. Correct; nothing calls it yet.
  - `getFunctionName` (`DomainHelper.ts:748-750`, the graph's `functionName`): `indexOf`. Correct in practice.
  - `V1_buildFunctionInfoAnalysis` (`V1_EngineHelper.ts:732`, the query builder's function explorer): `split`.
    Correct in practice.
  - Cube's own `callPathOf` (`V1_CubeFunctionOutlineBuilder.ts:111-127`, Cube's Function source picker): **wrong**
    for a function that takes two or more values and has an underscore in its name. It joins the parameters' parts
    with `''` where the engine uses `_`, misses the suffix, and falls back to the name's first segment. Checked
    (2026-11-14) on engine-parsed elements: `demo::fn::trades_since_StrictDate_1__String_1__Relation_1_` gets the call
    path `demo::fn::trades`, so the cube calls a function that doesn't exist. `tradesSince(…)`, `only_active(rel)`
    and `active_trades()` come out right. Its own test passes only through the fallback.
- **legend-graph already follows function bodies to find `#I{}` reads**, for Studio's ingest Overview
  (`V1_AccessorHelper.ts:816-848`, `getIngestDatasetsReadByRawLambda`). It matches with
  `f.path.startsWith(`${funcPath}\_`)`, takes the first hit, and ignores overloads. `my::foo` would also match
  `my::foo_bar__…`.

### 2.2 Cube's rule (the prototype's)

- **A user call** is a call whose name has a package outside `meta::` (`isCubeUserFunctionName`). The engine's own
  functions are written short or under `meta::`. Whether it _is_ a user function is whatever the host's loader finds.
  There is no hard-coded list: a function the loader doesn't have is drawn as a "not found" box, not refused.
- **Matching:** each loaded element's call name is its package plus its name without the suffix. legend-graph's
  `V1_getFunctionNameWithoutSignature` gives it, read through legend-graph's protocol classes in cube-builder's `v1/`
  folder (`V1_CubeFunctionDefinition.ts`), behind the `CubeProtocolJson.ts` seam as the ingest reader is. The call opens the one function of that name that takes as many values.
  If several do, Cube draws an `ambiguous` box rather than guess. Telling them apart by literal types is a later step.
- **Platform functions Cube doesn't support yet** keep today's refusal: e.g. `->asOfJoin()` at the top of a lambda is
  still `noStep`. Inside a function's body it closes that function into a box (§4).
- **Short names:** not opened. Two reasons suggest they are rare in deployed access points, though neither is proven:

  - Studio drops the section index when it builds its graph, and writes resolved paths only
    (`V1_PureGraphManager.ts:1074-1081`).
  - Raw lambdas aren't rewritten, so a short name would lose its import on save.

  The local engine has no DataProduct parser to check it on, so the measurement script counts short names (§10).

## 3. Where each host gets the bodies

| Host                              | Bodies from                                                                                                                                                                                                                     | Requests                                                     | Cache                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Marketplace viewer                | Depot: `GET /projects/{g}/{a}/versions/{v}/classifiers/meta::pure::metamodel::function::ConcreteFunctionDefinition/dependencies?transitive=true&includeOrigin=true&versioned=false` (`DepotServerClient.getDependencyEntities`) | 1 per project version, the first time a definition calls one | per page, per version, as a promise; a failure isn't kept |
| Studio's data product preview     | the graph: own, dependency and generated functions (`graph.functions`), as `elementToEntity(fn).content`, as the ingest hook does (`DataProductEditor.tsx:3090`)                                                                | 0                                                            | none needed                                               |
| Studio's ingest Overview (#5894)  | the graph, as above. The ingest's content is only raw JSON, but functions are separate elements, fully built in form mode (`EditorGraphState.ts:341-420`). Text mode's light graph has empty bodies: read after the full build. | 0                                                            | none needed                                               |
| Producer Info views (Marketplace) | the same Depot loader: the views' lambdas come from the ingest definition at the data product's version, in the same project (decision 6 of `access-point-cube-flow`)                                                           | the same 1, shared with the access points                    | the same                                                  |

- **Why not one GET per function:** the single-entity route needs the path with its suffix, which the call doesn't
  have. `POST …/dependencies/paths` needs it too.
- **The Depot routes and shapes here were read from Depot's code** and answered by the mock. None was called against
  a real Depot.
- **The route is hidden from Swagger but live** (`EntitiesDependenciesResource.java:78-98`). It returns
  `ProjectVersionEntities`, each entity wrapped as a `DepotEntity`. `includeOrigin=true` adds the project itself, so
  one request covers both.
- **Without `includeOrigin`:** `GET …/versions/{v}/entities?classifierPath=…` gets the project's own functions
  (`EntitiesResource.java:101-118`).
- **What it costs:** every function of the project and its dependencies comes down once, bodies included. The script
  in §10 reports how many functions the access points call. The open question is the size for a large project.
- **Legacy JSON:** `/entities` returns content as published, which may use legacy fields (`returnType`, a parameter's
  `class`). The engine upgrades them on read, and so does legend-graph's deserializer, which the prototype reads
  through.

### 3.1 Could the artifact or Depot hand the functions over?

The finos engine has no data products: no grammar, compiler, protocol or artifact generation for them. Studio models
the artifact's access point (`V1_AccessPointImplementation`, `V1_DataProductArtifact.ts:333-368`) with these fields:

- `id`, `description`
- `resourceBuilder`: a `functionAccessPoint`'s `functionGrammar`, its Pure text
- `relationElement`, `lambdaGenericType`
- `dependencyDatasets`, `dependencyAccessPoints`

None lists the functions a definition calls. Studio's model drops keys it doesn't know, so the raw JSON may hold more.
What would help, from the most useful:

1. **Per access point, the functions its lambda calls, by element path with the suffix, at every depth.** This makes
   resolution exact: overloads and short names exactly as the compiler chose them.
2. **Each of those functions' content**, or the project version it comes from. The Depot request would then not be
   needed.
3. **Per call, the relation type the compiler gave it.** The engine's own columns for every container.
4. **Whether `dependencyDatasets` is transitive** through functions and views. Producer Info asked the same.

None blocks shipping: the Depot route and the graph are enough.

## 4. Reading rules

Opening a call (`expandCubeDefinitionFunctions`, `CubeDefinitionFunctions.ts`) works on the IR before
`readCubeQuery`.

| Rule                          | What the prototype does                                                                                                                                                                                                       | Box reason              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Parameters                    | Each free `$param` of the body gets the call's value. A lambda in the body that binds the same name hides it.                                                                                                                 |                         |
| Name capture                  | A value whose variables a lambda of the body binds (e.g. `$o` passed into `filter(o\|…)`) can't be put in.                                                                                                                    | `capture`               |
| The relation a function takes | The call's input, e.g. `#I{…}#` in `#I{…}#->onlyOpen()`, is read before the container and wired into it. The body must read it exactly once: Cube's canvas is a forest, where a step feeds one step.                          | `sharedInput`           |
| The access point's parameters | Passed as values, they stay `$businessDate`. P5's parameter boxes wire into the steps inside, where Cube shows parameters today (a filter's condition, a new column).                                                         |                         |
| Lets                          | Each `let` before the last statement gets its value put in where it is read. A relation let read twice is drawn twice, as Cube's own lets are.                                                                                |                         |
| Several statements            | Anything but lets before the last statement, e.g. `assert(…)`. The engine's own inliner (`preeval.pure`) opens only bodies of one expression.                                                                                 | `statements`            |
| Recursion                     | A function on the way to itself.                                                                                                                                                                                              | `recursion`             |
| Depth                         | Calls are opened 8 deep (`CUBE_DEFINITION_FUNCTION_DEPTH`); the loader loads that deep.                                                                                                                                       | `depth`                 |
| A body Cube can't draw        | Each opened body is read alone first, the relations it takes standing in as sources drawn by name. If Cube refuses it, the call is a box with Cube's words, e.g. a body using `->asOfJoin()`.                                 | `notDrawable`           |
| Not found, ambiguous          | §2.2.                                                                                                                                                                                                                         | `notFound`, `ambiguous` |
| Generic functions             | None to handle: Legend Engine refuses them.                                                                                                                                                                                   |                         |
| Relation or scalar            | A call where rows are read is opened. A scalar call in an expression stays as written: the step gets a ƒ badge, and its tooltip gives the function's signature. Opening it would print a condition the producer didn't write. |                         |
| Two calls of one function     | Each gets its own copy of the body, and its own container.                                                                                                                                                                    |                         |

## 5. Column types after a container

Probed on `:6300` (`mock/probe-compile.pure`, `p2.pure`, `p3.pure`). These are compile results, not just reading:

- **A function with steps after it compiles only if it declares every column it returns.**
  - `Relation<Any>` fails: an internal `ClassCastException` from the compiler, not a clean message.
  - Declaring some of the columns fails too.
  - Declaring all of them, with compatible types (`Integer` for `Int`, `String` for `Varchar(10)`, `[0..1]` for
    `[1]`), passes.
- **A function that takes a relation must declare all its columns too.** There is no structural subtyping. So a
  mid-chain function fits exactly one shape of input.
- **The compiler types the call by the declared return type** (`FunctionCompilerExtension.java:98`).

The options:

| Source                                                   | Precise?                                                            | Available                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A. From the body: Cube infers its steps                  | Yes: `Varchar(32)`, not `String`                                    | When the body opens and its sources are typed                                                                               |
| B. The declared return type                              | Names and Pure types only: `String`, `Integer`, `[0..1]` by default | Whenever steps follow a call (they couldn't compile otherwise); not for a function whose output is the whole access point's |
| C. The engine: `lambdaRelationType` with a model pointer | Yes                                                                 | Needs an engine call and an engine that compiles data products (not finos). The flow makes none today.                      |

**Recommended: A for an opened call, B for a box.** Later, compare A's column names with B's and say so when they
differ. The prototype does A and B, not the comparison. A box with no declared columns (`Relation<Any>`, with no step
after it, or not found) leaves the steps after it unchecked. The viewer then says so in a line.

## 6. Load order

The ingest accessor sits inside the body, so functions load first:

1. `loadCubeDefinitionFunctions(lambda, load)`: async. It loads the names the lambda calls, then the names their
   bodies call, as deep as calls open, asking for each name once.
2. `findCubeDefinitionIngestDefinitions(lambda, { functions })`: now sees through the bodies, the middle of a chain
   included.
3. The host loads those ingest definitions, as today.
4. `readCubeDefinition(lambda, { functions, getIngestDefinition })`: sync.

## 7. Drawing (the read-only flow)

Shots in the artifact.

- **An opened call is a container** (§11.29's frame and colours, from a light module so the flow loads none of the
  editor). Its head has:

  - its fold;
  - ƒ and the call with its values, e.g. `ordersSince(%2026-01-01, 'EMEA')`. The values are printed by Cube's
    `printIR`.
  - the project, when the function comes from a dependency (e.g. `shop-common`);
  - **</>**, which shows the function's Pure under the flow.

  The tooltip gives its path, signature and project.

- **Nested calls are frames inside frames**, through dagre's nested clusters (`parentId` on a container). §11.29
  decided "no nesting" for the user's own containers. Function containers nest, the user's stay flat: a decision for
  the user (§12).
- **Folding:** ▾ folds a call to one box, "2 steps, folded", which ▸ or a double-click opens. A folded call hides the
  calls inside it. In the read-only flow folding is the viewer's own, not saved.
- **What starts folded** (the user, 2026-11-14: "fold them past some size"): a call holding more than 5 steps, the
  steps of the calls in it included (`CUBE_DEFINITION_CALL_OPEN_STEPS`); smaller calls start open. The mock's
  `topActiveOrders()` holds 6 and starts folded. The measurement script reports how many steps real calls hold
  (`openedCallsBySteps`), to check the 5.
- **A call Cube can't open is one step**, dashed: ƒ, the call, and "6 columns, as declared" or "not found". Its tooltip
  says why. A click shows its Pure, or says Depot doesn't have it.
- **A scalar call** puts a small ƒ badge on its step. The tooltip lists each function with its signature.
- **The function's Pure** is its element as the engine prints it (`jsonToGrammar/model`), shown under the flow with
  Copy and Close. That is one engine call per click, as the access point's own Pure is.

## 8. The editable canvas (Legend Analytics, Import Pure, a materialized view)

**The Pure must keep the call.** Two ways to hold it:

- **E1, recommended: the call is one step.**
  - A call with no relation input is the `FunctionSource` Cube already has: it saves `function`, `signature`,
    `parameters` and `values`, and its emitter writes `pkg::f(values)`.
  - A call in the middle of a chain needs a new step with an input, which emits `$input->pkg::f(values)`.
  - The step's inside is a drawing of the body, read again from the project each time the cube opens. It is never
    saved.
  - Its columns come from the body, when it opens, or from the declared type. The engine types it otherwise, as a
    function source is typed today.
- **E2: the body's steps are in the cube, locked,** and the emitter writes the call for the block.
  - The saved cube would need the call to rebuild the block.
  - Every edit (delete, insert, move, paste, containers' reconcile) would have to respect the lock.
  - A changed function would leave stale steps.

**Locked: yes.** The steps are the function's, an element of the project or of a dependency. To change them, people
change the function itself (the user, 2026-11-14: no Copy Its Steps Out). The container's menu offers, instead of
Rename and Remove:

- **Show the Function's Pure**;
- **Open the Function in Studio**, when the host knows the project.

**The container model:**

- The user's containers stay in `meta.containers`: saved, flat and editable.
- Function containers come from the call steps and are never in `meta.containers`. Only their fold state is saved,
  e.g. `meta.foldedCalls: [stepId]`.
- A user's container may hold a call step, since a call is one step. A call can't hold the user's containers, since
  its inside isn't the cube's.

**Import Pure** refuses function sources today (`CubeLambdaSources.ts`, `NOT_YET`). E1's step is what would read
them.

The prototype's editor mock-up (`?fnmock=` in Legend Analytics) is only for looks. It builds a cube whose steps are
the function's (E2-like), with locked containers carrying the call. Its menu's Pure and Studio items do nothing.

## 9. What the engine and Depot offer

- **No inliner over HTTP.**
  - The only one is Pure-side, `meta::pure::router::preeval`, used in routing. It inlines bodies of one expression
    only (`preeval.pure:1052-1058`).
  - `inlineQualifiedProperties` inlines qualified properties, not functions.
- **A function's element, given its full path and a model:** `POST pure/v1/analytics/function/modelCoverage?includeFunction=true`
  (`FunctionAnalytics.java:55-103`). It returns the element with its body plus the classes it touches. It needs the
  suffix, and makes one call per function.
- **Typing:**
  - `POST pure/v1/compilation/lambdaRelationType(/batch)` with a model pointer types a lambda's relation
    (`Compile.java:153-226`).
  - `lambdaReturnType` returns the raw type only.
  - Neither works on data product lambdas without the non-finos extension.
- **Ids from descriptors:** `FunctionDescriptor.functionDescriptorToId` (legend-pure) turns `pkg::f(Integer[1]):String[1]`
  into its path.
- **Depot:** the classifier route in §3. `entitiesByClassifierPath` lists a classifier across all projects' latest
  releases, which the measurement script uses.

Nothing here replaces the browser reader. The useful piece is Depot's classifier route.

## 10. Measuring what it unlocks

`scripts/measure-function-coverage.mjs`, run by the user against the internal Depot. It loads the prototype's reader
from the worktree's built `lib`.

1. It lists data products: Depot's `entitiesByClassifierPath` for the DataProduct classifier (latest releases), or
   `--projects g:a:v,…`.
2. It reads every Lakehouse access point twice:
   - as the viewer does today;
   - with its functions opened, loading functions with the Depot route of §3 and ingest definitions as the viewer
     does.
3. It writes `access-points.csv`, `access-points.json` and `summary.json`, all local. The summary counts:
   - drawn today, and which access points call functions;
   - unlocked, and unlocked with every call opened;
   - still refused, by reason;
   - boxes by reason;
   - the deepest nesting;
   - distinct functions declaring columns vs returning `Relation<Any>`;
   - short names Cube has no step for;
   - Depot failures.

```
node measure-function-coverage.mjs --depot https://<depot>/depot/api --out ./coverage \
  [--header 'Authorization: …' | --cookie '…'] [--projects g:a:v,…] [--limit N] [--concurrency 4]
```

Dry runs on the mock only (2026-11-14, after `scripts/add-large-function.mjs` added a function holding six steps):

- With `--projects org.example.shop:order-insights:1.4.0` (`mock/coverage-dry-run/`):
  - 10 access points: 1 drawn today, 10 drawn with functions opened;
  - 9 unlocked, 6 of them with every call opened;
  - boxes: 1 `statements`, 1 `notDrawable`, 1 `notFound`;
  - functions: 6 declaring columns, 1 returning `Relation<Any>`;
  - opened calls by size: 1 of 1 step, 5 of 2-3 steps, 1 of 6-10 steps (folded at first).
- With the default listing (`mock/coverage-dry-run-default/`, the mock answering `entitiesByClassifierPath` with all
  its data products): 9 data products, 21 access points, 12 drawn today, 9 unlocked.

I have not run it against anything internal.

## 11. Implementation plan

One reviewable PR each, into a dev branch like `cube-view-dev`. Each step is checked the usual way: lint with zero
warnings, root `tsc --build`, the changeset, and the tests below.

| Step | What                                                                                                                                                                                                                                                                                                                                | Packages                                                                 | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                 | Unlocks                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| F1   | Core. The reader reads a call as one step whose inputs are its relations (`bindCall`). Containers nest (`parentId`; `getShownContainers` gives the innermost a step and checks the block with the nested steps).                                                                                                                    | legend-cube                                                              | `QueryReader`: a call with relation inputs, inputs read before it. `StepContainer`: nested, the innermost owns a step, a parent not drawn, a folded parent. The existing container tests unchanged. Core also exports its free-variable walker (`findCubeFreeVariables`) and its relation-input table (`getCubeRelationInputCount`), which F2 reuses rather than copies.                                                              | F2, F3                            |
| F2   | The flow's reader opens calls: `CubeDefinitionFunctions.ts` (loader, opening, the rules of §4), `V1_CubeFunctionDefinition.ts` (v1 folder, legend-graph's classes), `readCubeDefinition`'s `functions` option, `functionCalls` and `scalarFunctions`, and `findCubeDefinitionIngestDefinitions` seeing through bodies.              | legend-cube-builder                                                      | One unit test per rule and per box reason. Overloads by count. Loader depth and each name asked once. The mock's 9 cases. An engine round trip parsing the mock's functions on `:6300` (the `#>`→`#I` swap). Today's reader tests unchanged. The entry's module list grows by five light modules and `serializr` (legend-graph's own): re-measure the lazy chunk with P1's `measure.mjs`, as the no-flag decision rested on its size. | F3, F4, F5                        |
| F3   | The flow draws them: frames and boxes (read-only), the nested layout (`layoutCubeCanvas`), folding, the closed step, the scalar badge, `onShowFunction`. Container styles move to a light module (`CubeCanvasContainerStyle.ts`).                                                                                                   | legend-cube-builder                                                      | jsdom: a frame per opened call, nested frames, fold and open, a box's tooltip, the badge. Layout: a frame round its nested frame. The entry still loads none of the editor (the entry test's module list).                                                                                                                                                                                                                            | F4, F5, F6                        |
| F4   | The Marketplace viewer: `loadFunctions` beside `loadIngestDefinition`, `createDepotFunctionLoader` (one request, cached per page), the read order, the function's Pure under the flow, the note for unchecked steps. Telemetry counts calls opened and boxes by reason in the show event.                                           | dsl-data-product, Marketplace (+ its deployment for the changeset check) | The loader: one request for several definitions, a failure not kept, own project with no chip. The state: functions loaded before ingest definitions. Components: the Pure panel, the note. Marketplace: the loader wired for SDLC data products, not for ad-hoc ones.                                                                                                                                                                | users of Marketplace              |
| F5   | Studio: the preview's `loadFunctions` from the graph, and the ingest Overview's view flows.                                                                                                                                                                                                                                         | legend-application-studio                                                | DataProduct preview and ingest Overview tests with a function in the graph, one from a dependency, and text mode not reading early.                                                                                                                                                                                                                                                                                                   | Studio                            |
| F6   | Producer Info's view flows, once its design is picked: the same loader.                                                                                                                                                                                                                                                             | dsl-data-product                                                         | As F4, for a view calling a function.                                                                                                                                                                                                                                                                                                                                                                                                 |                                   |
| F7   | The editor (E1): a call step with an input beside `FunctionSource`; the inside drawn locked; the menu (Show the Function's Pure, Open in Studio); `meta.foldedCalls`, a call over 5 steps folded until saved otherwise; Import Pure reading function calls; the user guide's section and images; a demo video (the milestone rule). | legend-cube, legend-cube-builder, Analytics, Studio (Open in Studio)     | Emitter and spec round trips with the call kept. Locked steps refuse edits. Engine round trips of Import Pure on functions. The video's checks.                                                                                                                                                                                                                                                                                       | editing cubes that call functions |
| F8   | Later: overloads told apart by literal types; the artifact's fields (§3.1) if they come.                                                                                                                                                                                                                                            | legend-cube-builder                                                      |                                                                                                                                                                                                                                                                                                                                                                                                                                       |                                   |

**Found on the way, fixed first (user, 2026-11-14):**

- Cube's `callPathOf` bug (§2.1): Cube's Function source picker calls the wrong function for names like
  `trades_since(since, desk)`. Fixed in finos/legend-studio#5908.
- legend-graph's prefix match in `V1_AccessorHelper` (§2.1): Studio's ingest Overview can list the data sets of the
  wrong function for a view that calls `orders()` when `orders_above(…)` comes first, and it picks an overload by
  order. Fixed in finos/legend-studio#5909.
- The other two strippers are correct in practice. Using legend-graph's `V1_getFunctionNameWithoutSignature`
  everywhere is a tidy-up, not a fix.
- The flow reader's `printMultiplicity` (from P5) does what legend-graph's `generateMultiplicityString` does, with
  brackets.

## 12. Decisions

Settled with the user on 2026-11-14 (all seven):

1. **Boxes, not refusal:** a function Cube can't open is one box, and the rest of the flow is drawn.
2. **Nesting:** containers that are function calls nest; the user's own containers stay flat (§11.29).
3. **The editor's model:** E1, a call is one step whose inside is a locked drawing.
4. **No Copy Its Steps Out:** people change a function's steps in the function itself.
5. **First view:** a call holding more than 5 steps starts folded (§7).

6. **The data product artifact (§3.1):** not asked for now. Depot's one request is enough; revisit if the measurement
   shows `ambiguous` boxes or slow loads.
7. **The two bugs found (§11):** fixed first, as finos/legend-studio#5908 (Cube's Function source picker) and #5909
   (legend-graph's lookup behind the ingest Overview).

## Evidence

`../legend-studio-cube-functions-evidence/`:

- `scripts/`:
  - `gen-function-mock.mjs`, the mock's data: the engine parses and prints it;
  - `shoot-functions.mjs`, the viewer's shots;
  - `shoot-analytics.mjs`, the editor's shots;
  - `measure-function-coverage.mjs`;
  - `ProbeToday.test.ts`, the reader before and after;
  - `crop.mjs`.
- `mock/`:
  - `functions-mock.json`;
  - the compile probes `probe-*.pure`, `p2.pure`, `p3.pure`;
  - `coverage-dry-run/`.
- `shots/v1/`: the screenshots.
- `page/`: the artifact page's source.
- The mock harness's variant is `MOCK_VARIANT=functions` in `../legend-studio-marketplace-search-evidence/scripts/`.
  Backups of the files it changed are `*.bak-functions`.
- Launch entries: `cube-functions-mock` (:6420), `cube-functions-marketplace` (:9104), `cube-functions-analytics`
  (:9105).
