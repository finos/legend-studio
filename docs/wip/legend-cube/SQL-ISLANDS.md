# Legend Cube: `#SQL{…}#` in the definition flow, research and plan (2026-11-19)

How Cube's definition flow could show a definition written with the engine's SQL island, e.g.
`#SQL{select … from i('…')}#->filter(…)`, and what the editable canvas would do with one. It is based on:

- legend-studio finos/master `305424f6a` and the dev branch `cube-functions-dev` `67a869fba`;
- legend-engine `2abb34b25` (2026-10-22). finos/master `cb5d33f4c` (2026-11-19) has no later commit in the island's
  module or in the SQL HTTP API, and two in the translation's Pure (#5449 binary columns, #5474 cast validation);
- probes against a local open-source engine (build `4.152.1-SNAPSHOT`, commit `aa1c755`);
- a harness that runs the engine's own island compiler on 47 queries, and Cube's reader on what it returns.

The evidence is in `../legend-studio-cube-functions-evidence/sql-island/`. Every name in it is made up. Nothing was
run against anything internal. PLAN §11.34 holds the short version.

## Summary

- **Today the flow refuses every definition that holds an island.** The reader has no case for it: "Cube can't read
  the accessor #SQL{…}#: it reads #>{…}#, #P{…}# and #I{…}#". The viewer shows the Pure instead. One island anywhere
  refuses the whole flow, also the steps written in Pure around it.
- **The engine already turns the SQL into the Pure that Cube reads.** To compile an island, the engine translates its
  SQL to a relation function: `select … from tb('db.T') where …` becomes `#>{db.T}#->filter(…)->select(…)`. A CTE
  becomes a `let`, a `func()` source becomes a call of that function, a `var()` source becomes the variable.
- **No engine route returns that Pure.** The engine keeps it inside the compiled graph. The routes that exist return
  the island's columns, or the SQL's parse tree. So opening an island needs one small engine route.
- **Measured:** the engine translated 43 of 47 test queries (the other four name sources the open-source engine
  doesn't have). Cube's reader, unchanged, draws 30 of the 43. The other 13 use seven forms the reader has no rule
  for yet (§5).
- **The recommendation, in two stages:**
  1. **A box, with no engine change.** The island is one step, "SQL", never a refusal. A click shows its SQL. The
     Pure steps around it are drawn as usual.
  2. **A container, once the engine has the route.** The island opens like a user-defined function's call (§11.33):
     a frame with the SQL on top and the translated steps inside. A `func()` source nests that function's container.
     What Cube can't read stays a box.
- **In the editable canvas an island is one step holding its SQL**, written back word for word. Its inside is a
  locked drawing. This is also the "SQL source" leaf PLAN §8.1 kept for later, and the node §6.4 needs for services.
- **Not known:** what real islands read. The open-source engine has no `i()` or `p()` source, so the measurement
  used tables (`tb()`), with the table reads swapped for ingest reads before Cube read them. Four questions for the
  user are in §9.

## 1. What an island is

`#SQL{…}#` is an embedded language of Pure (`legend-engine-xt-sql-expression`). It is a value: a relation whose
columns are the query's.

- **Its JSON** is `{_type: 'classInstance', type: 'SQL', value: {sql: '…'}}`: the SQL as one string, nothing parsed.
  The engine's grammar prints the string back unchanged.
- **Where it can stand:** anywhere a relation can. Alone, with Pure steps after it, as a join's other side, in a
  function's body.
- **What its `FROM` can name** (`getSources()` in `fromPure.pure`, plus what an engine build adds through
  `PureToSQLSourceModule.extraDynamicSQLSources`):

  | Source                              | Reads                                                  | In the open-source engine  |
  | ----------------------------------- | ------------------------------------------------------ | -------------------------- |
  | `tb('pkg::Db.SCHEMA.TABLE')`        | a table                                                | yes                        |
  | `func('pkg::f__Relation_1_', a=>1)` | a function returning a relation, with values           | yes                        |
  | `var('name')`                       | a variable of the Pure around it: a `let`, a parameter | yes                        |
  | `csv('a,b\n1,2')`                   | rows written in place                                  | yes                        |
  | `i('pkg::Ingest.DATASET')`          | an ingest data set                                     | no ("No function matches") |
  | `p('pkg::Product.accessPoint')`     | a data product's access point                          | no                         |
  | `service('/pattern')`               | a service                                              | no                         |

  Studio already writes `i()` and `p()`: its SQL playgrounds start from `SELECT * FROM p('…') LIMIT 100`, and
  legend-graph finds both inside an island's text (`V1_AccessorHelper.ts`). So they exist where data products run.

- **PLAN §6.4 needs a correction.** It plans to read a service as `#SQL{select * from service('/pattern')}#`. The
  open-source island refuses `service()`. The `service('/…')` in `testTranspile.pure` belongs to the SQL REST API
  (`/api/sql/v1/execution/*`), whose sources come from providers, not to the island.

## 2. Today

Read with `readCubeDefinition` (`harness/ProbeSqlIsland.test.ts`, `today-reading.json`):

| Definition                                                     | Today             |
| -------------------------------------------------------------- | ----------------- |
| `#SQL{select STATUS, sum(AMOUNT) … group by STATUS}#`          | refused, `source` |
| `#SQL{select * from …}#->filter(…)->select(…)`                 | refused, `source` |
| `#I{…ORDERS}#->join(#SQL{select … from …CUSTOMERS}#, …)`       | refused, `source` |
| `let active = #I{…}#->filter(…); #SQL{… from var('active')}#;` | refused, `source` |

`readClassInstance` (`V1_CubeLambdaReader.ts`) reads `colSpec`, `colSpecArray`, `>`, `P` and `I`, and throws for any
other type. Import Pure in the editor refuses an island the same way.

## 3. What the engine does with one

`SQLCompilerExtension.java`, the island's compiler:

1. parses the SQL (`SQLGrammarParser`);
2. translates the tree to a Pure function, `sqlToPure` (`fromPure.pure`, about 5,600 lines), with the variables in
   scope and the elements its sources name;
3. prints that function as Pure text and compiles the text again, so what it keeps is plain Pure;
4. keeps the result as an `SQLExpression` holding `sqlString`, `pureFunction` and the columns.

At run time the router swaps the island for `pureFunction` (`frameworkExtension.pure`). So the Pure of step 3 is
exactly what runs. It isn't an approximation made for display.

What the routes give:

| Route                                              | Gives                                | For the flow                                                                          |
| -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `POST /api/pure/v1/compilation/lambdaRelationType` | an island's columns, with a model ✅ | types a box                                                                           |
| `POST /api/sql/v1/execution/parseToMetamodel`      | the SQL's parse tree ✅              | names the sources exactly                                                             |
| `POST /api/sql/v1/execution/lambda`                | a lambda, for the REST API's sources | nothing: it refuses `csv()` and `tb()`, and its `func()` wants project coordinates ✅ |
| none                                               | the island's `pureFunction`          | what opening an island needs                                                          |

✅ means measured on the local engine.

## 4. What the translation looks like

From the harness (`island-to-pure.json`; packages shortened here):

| SQL                                                                 | The engine's Pure                                                                            |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `select * from tb('…ORDERS')`                                       | `#>{…ORDERS}#`                                                                               |
| `select ORDER_ID as id, AMOUNT as amt from …`                       | `…->select(~[ORDER_ID,AMOUNT])->rename(~ORDER_ID, ~id)->rename(~AMOUNT, ~amt)`               |
| `… where STATUS = 'ACTIVE'`                                         | `…->filter(x\|$x.STATUS == 'ACTIVE')`                                                        |
| `… group by CUSTOMER_ID having sum(AMOUNT) > 1000`                  | `…->groupBy(~[CUSTOMER_ID], ~[total:x\|$x.AMOUNT:y\|$y->sum()])->filter(x\|$x.total > 1000)` |
| `… order by AMOUNT desc, ORDER_ID limit 10`                         | `…->sort([~AMOUNT->descending(), ~ORDER_ID->ascending()])->limit(10)`                        |
| `with active as (…) select … from active`                           | `let active = …; $active->groupBy(…);`                                                       |
| `… from func('shop::orders::plainOrders__Relation_1_')`             | `shop::orders::plainOrders()->…`                                                             |
| `… from func('…ordersOver_Integer_1__Relation_1_', minimum => 100)` | `100->shop::orders::ordersOver()`                                                            |
| `… from var('rel') where b = var('value')`                          | `$rel->filter(x\|$x.b == $value)`                                                            |
| `row_number() over (partition by C order by A desc)`                | `…->extend(~[C]->over(~A->descending()), ~[rn:{p,w,r\|$p->rowNumber($r)}])`                  |

Three things make it wordier than hand-written Pure:

- **A join renames every column of both sides first**, with the table's alias as a suffix (`ORDER_ID_o`,
  `NAME_c`), then joins, keeps the selected columns and renames them back. One SQL join reads as Rename, Rename,
  Join, Keep Columns, Rename.
- **Every lambda's parameter carries its full row type**, `x: (ORDER_ID:Int[1], …)[1]`. Cube's reader ignores it.
- **Arithmetic and string operations are guarded for empty values:**
  `$x.AMOUNT->isEmpty()->if(|[], |$x.AMOUNT->toOne() * 1.2)` for `AMOUNT * 1.2`.

Translating one island took 4 to 350 ms in the harness (22 ms at the middle), after the model was compiled.

## 5. Measured: what Cube's reader makes of it

47 queries over three tables and three functions (`all-cases.txt`): columns, aliases, filters, computed columns,
grouping, having, sorting, limits, distinct, four kinds of join, sub-queries, CTEs, unions, windows, `in` and
`exists`, and each kind of source.

- **The engine translated 43.** The other four: `i()`, `p()` and `service()` (not in this engine), and one query
  I wrote wrongly.
- **Cube's reader, unchanged, draws 30 of the 43** (`cube-reading.json`). The table reads were swapped for ingest
  reads first, since the flow draws ingest data sets and the open-source grammar has no `#I{}`.
  - Filters with `in (select …)` and `exists (…)` draw, as a Filter by Expression.
  - A CTE draws through its `let`. Two CTEs joined draw as two branches.
  - A `func()` source draws as that function's container (F2's rules): 2 opened, 5 as a box, because my test
    functions end in a `cast` the reader has no step for.
  - Windows draw as Partition.
- **The 13 it refuses use seven forms:**

  | Form in the translation                 | From SQL like                                                   | Queries |
  | --------------------------------------- | --------------------------------------------------------------- | ------- |
  | `project(~[name:x\|…, …])`              | a computed column; `o.*` beside others; two columns of one name | 4       |
  | `groupBy` with `x\|$x : y\|$y->count()` | `count(*)`                                                      | 3       |
  | `union(…)`, `unionAll(…)`               | `union`, `union all`                                            | 2       |
  | `except(…)`                             | `except`                                                        | 1       |
  | `slice(20, 20 + 10)`                    | `limit 10 offset 20`                                            | 1       |
  | `join(…, {row1, row2\|true})`           | `cross join`                                                    | 1       |
  | `#TDS{…}#`                              | `csv('…')`                                                      | 1       |

  Cube has a step for five of the seven: New Columns with Keep Columns, Group's Count Rows, Concat (with Distinct
  for `union`), Difference, and Slice. Each of those is a reading rule to add, not a new step. A cross join and
  `#TDS{}` have no step: Join needs keys, and no source holds rows written in place.

Two smaller findings:

- **Sums lose their precision in SQL.** `sum(AMOUNT)` over a `Numeric(18,2)` column types as `Number`.
- **Seen, not looked into:** an island in a function's body that names the columns of another function of the same
  model (`select ORDER_ID from func('…')`) failed to compile when both were compiled in one pass ("unknown columns
  referenced in query"). The same island compiled after the model, as the HTTP routes do, works.

## 6. Options

| Option                                        | How                                                                                        | Engine change | Verdict                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------- |
| A. One box                                    | The reader reads the island as one step holding its SQL.                                   | none          | **Stage 1.** Ends the refusal. Shows no steps.                      |
| B. Open it from the engine's translation      | A route returns each island's `pureFunction`; Cube reads it as it reads a function's body. | one route     | **Stage 2.** The steps shown are the ones that run. Reuses F1–F3.   |
| C. Translate the SQL in the browser           | Cube reads the parse tree (`parseToMetamodel`) and maps it to steps itself.                | none          | No: a second copy of `sqlToPure`, which would drift from what runs. |
| D. Translate at build time, into the artifact | The data product's artifact carries each island's Pure.                                    | generation    | Later, if the route's model compile proves slow in Marketplace.     |

## 7. The design

### 7.1 Stage 1: a box

- **Reading.** `readClassInstance` reads type `SQL` as a new IR node holding the text. The flow's reader binds it as
  one step that has no input, or one input per `var()` it names. It never refuses the definition for it.
- **Drawing.** One dashed step, like a call Cube can't open (§11.33): an SQL badge, the query's first line, and "its
  columns aren't known". A click shows the whole SQL under the flow, with Copy, as a function's Pure is shown.
- **What it reads.** The box lists the data sets and access points its `FROM` names. legend-graph already finds
  `i()` and `p()` in an island's text for the ingest Overview: Cube asks legend-graph through an API over that code.
  It doesn't write a second matcher.
- **After it.** Its columns aren't known, so the steps after it are drawn without being checked, with the note the
  flow already shows for that.
- **Typed, where the host can.** The engine's `lambdaRelationType` gives the island's columns today. Studio has the
  graph to send. A host that asks gets a typed box and checked steps after it. Marketplace would send a pointer to
  the product's project: left for stage 2, which needs the same model.

### 7.2 The engine route

A route beside the island's compiler, name open:

```
POST /api/sql/v1/expression/toPure
{ "model": PureModelContext, "lambdas": [ Lambda, … ] }
→ [ { "islands": [ { "sql": "…", "lambda": Lambda } ] }, … ]
```

- It compiles each lambda against the model, as `lambdaRelationType` does, so `var()` sees the variables around the
  island. For each island, in the order met, it returns the Pure the compiler kept, as protocol JSON.
- It takes several lambdas because a flow asks for the definition and for the body of each function it opens.
- The harness (`IslandToPure.java`, 60 lines) is this route's body without the HTTP: compile, take
  `SQLExpression.pureFunction`, print it, parse it to JSON.
- It needs nothing new in Pure. A draft PR to finos/legend-engine, as #5481 and #5495 were.

### 7.3 Stage 2: a container

- **Loading.** A host gives the flow one more loader, beside `loadFunctions` and `loadIngestDefinition`: "translate
  these lambdas' islands". The order becomes: functions, then islands (the definition's and the opened bodies'),
  then the functions the translations call, then ingest definitions.
- **Reading.** The translation goes in the island's place, as a function's body goes in its call's place, and is
  read with the same rules (USER-FUNCTIONS.md §4). A `let` of a CTE stays inside the container.
- **Drawing.** F3's frame, with an SQL badge and the query's first line on top, and **</>** showing the SQL.
  - A `func()` source is that function's container, nested.
  - A `var()` source is an edge coming into the frame.
  - More than 5 steps starts folded, the rule calls have. Most joins will: one SQL join is five steps (§4).
- **What Cube can't read** stays stage 1's box, with the reason in its tooltip. So does an island whose translation
  the host couldn't get: no route in this engine, the model didn't compile, the request failed.
- **The reading rules of §5,** most common first: `project`, `count(*)`, `union` and `unionAll`, `except`, `slice`
  with a sum. A cross join and `#TDS{}` stay boxes until Cube has steps for them.
- **Left as written at first:** the empty-value guards and the alias suffixes. A display rule can come later if
  people find them noisy.

### 7.4 Hosts

| Host                                                | Stage 1                | The model for typing and stage 2               |
| --------------------------------------------------- | ---------------------- | ---------------------------------------------- |
| Marketplace's viewer (access points)                | nothing to wire        | a pointer to the product's project and version |
| Marketplace's Producer Info (views, #5936)          | nothing to wire        | the same                                       |
| Studio (the preview, the ingest Overview, MatViews) | nothing to wire        | the graph, as Studio compiles lambdas today    |
| Legend Analytics, Import Pure                       | the editor's step (§8) | the cube's own model                           |

### 7.5 The editable canvas

- **One step holding the SQL.** Its editor is a code editor on the text. Cube writes it back as `#SQL{…}#`, word for
  word, so a round trip never rewrites someone's SQL.
- **Its inputs** are the `var()` names it reads. With none it is a source.
- **Its inside** is stage 2's drawing, locked: to change it, people change the SQL.
- **Its columns** come from the engine (`lambdaRelationType`), as a function source's do.
- **One node for three plans:** this step, §8.1's "SQL source" leaf, and §6.4's service read (once an engine has a
  `service()` source for the island).

## 8. Implementation plan

One reviewable PR each, checked the usual way.

| Step | What                                                                                                                                                                               | Packages                                                         | Tests                                                                                                                                | Unlocks                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| SQ1  | The box: the IR node, the flow's reader binding it (inputs from `var()`), the dashed step, the SQL under the flow, the sources it names through a legend-graph API.                | legend-graph, legend-cube, legend-cube-builder, dsl-data-product | The four cases of §2 drawn. A box's inputs. The sources named. An engine round trip of each case's grammar. Today's tests unchanged. | every flow that holds an island         |
| SQ2  | The typed box: a host option that asks `lambdaRelationType`; Studio wires it.                                                                                                      | legend-cube-builder, Studio                                      | A typed box checks the steps after it. A failed request leaves the box untyped.                                                      | checked steps after a box, in Studio    |
| SQ3  | The engine's route (§7.2), a PR to finos/legend-engine.                                                                                                                            | legend-engine                                                    | The 43 queries of §5 as the route's test. `var()` inside a lambda with a `let`.                                                      | SQ4                                     |
| SQ4  | The container: the loader, the read order, the translation read in place, the frame, nesting a `func()` source, the fallback to SQ1's box. Marketplace and Studio wire the loader. | legend-cube-builder, dsl-data-product, Marketplace, Studio       | One test per source kind and per fallback. The 30 queries of §5 as fixtures. Loader order. The entry still loads none of the editor. | islands shown as steps                  |
| SQ5  | The reading rules of §5, one small PR per form or two.                                                                                                                             | legend-cube                                                      | Each form from the engine's own output. An engine round trip per form.                                                               | the other 13 queries of §5              |
| SQ6  | The editor's step (§7.5), Import Pure reading islands, the user guide's section and images, a demo video (the milestone rule).                                                     | legend-cube, legend-cube-builder, Analytics                      | Emitter and spec round trips keeping the text. Locked steps refuse edits.                                                            | editing cubes that hold SQL; §6.4, §8.1 |
| SQ7  | Later: the translation in the artifact (option D); a display rule for the guards and the suffixes; counting islands in the coverage script.                                        |                                                                  |                                                                                                                                      |                                         |

SQ1 needs nothing from anyone. SQ3 can be raised at the same time, since SQ4 waits for it to be released.

## 9. Questions for the user

1. **Two stages?** First the box (SQ1), which ends the refusal with no engine change. Then the steps inside (SQ4),
   which needs the engine's route. Recommended: yes.
2. **May I draft the engine route** as a PR to finos/legend-engine (SQ3)? Recommended: yes, alongside SQ1.
3. **What do real islands read?** I could only test tables, functions, variables and inline rows. If you can share
   two or three real definitions with the names changed, I can check that `i()` and `p()` translate to `#I{}` and
   `#P{}` reads, which stage 2 depends on. A count of how many access points and views hold an island would also
   say how much this is worth.
4. **In the editor, SQL as text only?** Recommended: yes, with the locked drawing. The alternative is a "Convert to
   Steps" action that replaces the island with Cube's own steps for good. For functions you chose no such action,
   because people change the function itself. An island has no definition elsewhere, so the action is more
   defensible here, but its result is the wordy Pure of §4.

## Evidence

`../legend-studio-cube-functions-evidence/sql-island/` (its `README.md` says how to run each again):

- `model.pure`: the test model;
- `probe.py`, `cases1.txt`, `cases3.txt`: the column types of islands, from the engine;
- `harness/IslandToPure.java`, `all-cases.txt`, `island-to-pure.json`: the engine's translation of each query;
- `harness/ProbeSqlIsland.test.ts`, `cube-reading.json`: Cube's reader on each translation;
- `cases-today.txt`, `today-reading.json`: the flow today.

Engine files read: `legend-engine-xts-sql/legend-engine-xt-sql-expression/` (`…-grammar/…/SQLExpressionGrammarParserExtension.java`,
`…-compiler/…/SQLCompilerExtension.java`, `…-pure/…/frameworkExtension.pure`),
`legend-engine-xt-sql-transformation/legend-engine-xt-sql-pure/…/binding/fromPure/fromPure.pure` (`getSources` 96-153,
`sqlToPure` 194-258, `processTableFunction` 2569-2640) and its `tests/dynamic/testDynamic.pure`,
`legend-engine-xt-sql-http-api/…/SqlExecute.java`.
