# Alteryx ideas for Legend Cube (plan, 2026-10-28)

The user asked for a deep look at how Alteryx works, and which of its features make sense in Legend Cube (2026-10-28).
This document is that study as a plan: the decisions first, then eleven ideas in build order, what comes later and what
doesn't fit, the engine checks, and the sources. Idea 3 is being built (2026-10-29). The user decides which of the
others to build.

Markers: ✅ the local engine wrote a plan (nothing ran), 📄 read in the code or in Alteryx's documentation, 💭 reasoned
only, 🔎 seen only in a search summary, not on the page itself. Code is cited at finos/master `18a8f8fcf` (2026-10-29).
The probes and the Alteryx catalog are in the local evidence folder, under `alteryx/`.

## 0. Summary

- **Alteryx, briefly.** Designer is a desktop canvas whose tools process records on one machine. Live Query is a
  browser canvas that generates SQL and runs it in BigQuery, Databricks or Snowflake, which makes it the closest product
  to Cube. Cube already has a step for most of their relational tools: 6 sources and 17 transforms
  ([NodeRegistry.ts:167-452](../../../packages/legend-cube/src/nodes/NodeRegistry.ts#L167)).
- **What fits.** Eleven Alteryx features fit Cube, where a cube compiles to one Pure lambda and the engine plans one SQL
  statement. None needs a new engine function. The first ones help people trust a cube: row counts, the rows that didn't
  match, more Group functions and column profiles. Then edits across many columns, Transpose, canvas notes and search, a
  plain-English description and checks. Parameters and saved functions come after M8 (§2).
- **The structural difference.** An Alteryx output can feed several tools, and Filter, Join and Unique have two or three
  outputs each. A cube is a forest of trees: a step's output feeds at most one step
  ([Query.ts:97](../../../packages/legend-cube/src/graph/Query.ts#L97)). Every idea works with that rule except showing
  both sides of a filter from one source, which needs AX1.
- **Engine checks** (§4): 17 probes, planned for Snowflake, Databricks, MemSQL, DuckDB and H2. 15 plan on both Snowflake
  and Databricks, 13 on MemSQL. What doesn't plan isn't needed by the eleven ideas: `#TDS{}#` literals (no database),
  `jaroWinklerSimilarity` (not Databricks or MemSQL), `generateSeries` and replace-all `regexpReplace` (not MemSQL).
- **What the checks don't cover.** They read **relational tables** of the Northwind model. **Data product (`#P{}#`) and
  ingest (`#I{}#`) accessors weren't planned**: the local open-source engine refuses them. A ✅ means the database's
  dialect writes the step's SQL, not that it ran, and not that a data product cube was tried. Each probe also tests an
  idea on bare tables, not after Cube's own shapes (a `let`-bound window, a Join's right input, the run lambda's
  `from()`, sort and limit). Those compositions are 💭 until each idea's first step checks them.

## 1. Decisions for the user, most decisive first

| #   | Decision                                                  | Options                                                                                                                                                                                                                                                               | Recommended                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AX1 | Branching: may a step feed more than one step?            | (a) keep the forest; both sides of a filter need two copies of the chain; (b) fan-out: a shared step is bound with `let`, as Partitions are for window isolation (PLAN §8.6). (b) brings Alteryx's T/F, L/J/R and U/D outputs, and two paths compared from one source | **Open.** All eleven ideas work without it; only showing both sides of a filter at once needs it. (b) touches the graph's invariant ([Query.ts:132-136](../../../packages/legend-cube/src/graph/Query.ts#L132)), the layout, the emitter's `let` rules (never a `let` after a Sort, §8.6) and Import Pure |
| AX2 | Counts and profiles: on demand, or after every run?       | (a) on demand: "Count rows" and "Profile" buttons; (b) after every run                                                                                                                                                                                                | **(a) first.** Each is one more warehouse query, about the price of running every step once. An analyst quoted by TechTarget said Alteryx needs a cost estimate before a warehouse run (28 Jan 2026). Revisit (b) once the cost is known                                                                  |
| AX3 | Rows without a match: Join kinds, or a step of their own? | (a) two more Join kinds, "Left rows without a match" and "Left rows with a match"; (b) a new step                                                                                                                                                                     | **(a).** No graph rule changes; the Join editor, its key pairs and its suggested keys (§11.22) are reused                                                                                                                                                                                                 |
| AX4 | Rolling windows: reopen frames?                           | (a) keep them declined: the user declined frames on 2026-10-09 (PLAN §11.6, `PLAN.md:3551-3560`), and M5b kept them out (§11.9, `PLAN.md:4302`); (b) reopen them                                                                                                      | **(a), until users ask.** Live Query ships a Rolling Window tool on its Snowflake and Databricks palettes 📄. The engine has `rows` and `_range` frames (§4), but an unpartitioned window can't take a rows frame ✅ (§11.6)                                                                              |
| AX5 | Checks: Cube-only, or Legend Data Quality validations?    | (a) Cube-only: checks run with the cube in both hosts, saved in its spec once cubes are saved (M8); (b) in Studio, also saved next to the MatView as a data-quality relation validation                                                                               | **Open.** (a) needs nothing from Studio. (b) keeps producers' checks in Legend SDLC, reviewed and versioned with the MatView, each check a named `AGGREGATE` assertion 💭. It couples Studio's Create MatView flow to the Data Quality extension, and Analytics has no project to save them in            |

## 2. The ideas, in build order

Sizes are rough: S is a few days, M a week or two, L a milestone. Probe numbers (P01-P17) are §4's.

| #   | Idea                                       | From Alteryx                                               | Plans                        | Size   | Waits on                                 |
| --- | ------------------------------------------ | ---------------------------------------------------------- | ---------------------------- | ------ | ---------------------------------------- |
| 1   | Row counts on every step, and join checks  | Counts on connections; Join's L, J and R outputs           | P07, P17 ✅ on all five      | S-M    | nothing (AX2: when counts run)           |
| 2   | Rows without a match, and duplicate keys   | Join's L and R, Unique's D, Filter's F                     | P01, P03, P05 ✅ on all five | M      | AX3; AX1 only for both sides of a filter |
| 3   | More Group functions                       | Summarize                                                  | P14, P15 ✅ on all five      | S      | nothing; **being built**                 |
| 4   | A column profile of a step                 | Results window, Browse, Live Query's profiling             | P06 ✅ on all five           | M      | #5791's D1 (where it shows); AX2 (when)  |
| 5   | One edit for many columns                  | Multi-Field Formula, Data Cleansing, Select, Union by name | nothing new to plan          | M      | nothing                                  |
| 6   | Transpose (unpivot)                        | Transpose                                                  | P08 ✅ on all five           | M      | nothing                                  |
| 7   | Notes, groups, skip a step, palette search | Tool Container, Comment, Global Search                     | nothing new to plan          | S each | M8, for notes and groups                 |
| 8   | Describe the cube in plain English         | Ask Alteryx; Trifacta's recipe                             | nothing to plan              | S      | nothing                                  |
| 9   | Checks on a step                           | Test, Expect Equal; Trifacta's rules                       | P06 and P17's aggregates ✅  | M-L    | AX5; Studio's Create MatView flow        |
| 10  | Parameters                                 | Analytic Apps                                              | not probed                   | L      | M8                                       |
| 11  | Steps saved as a function                  | Macros                                                     | not probed                   | L      | M8, and Studio                           |

### 2.1 Row counts on every step, and join checks

**Size** S-M. **Waits on** nothing; AX2 decides when counts run.

- **In Alteryx 📄:** after a run, each connection shows its record count and its size in KB ([Workflow
  Configuration](https://help.alteryx.com/designer/current/en/workflows/workflow-configuration.html), Connection
  Progress). Join sends unmatched left rows to L, matched rows to J and unmatched right rows to R
  ([Join](https://help.alteryx.com/designer/current/en/tools/join/join-tool.html)), so three counts check a join at a
  glance. Append Fields and Join Multiple can warn or stop when more than 16 records are appended or joined ([Append
  Fields](https://help.alteryx.com/designer/current/en/tools/join/append-fields-tool.html), [Join
  Multiple](https://help.alteryx.com/designer/current/en/tools/join/join-multiple-tool.html)). Trifacta's join shows a
  match percentage, and the matches and non-matches of each side ([join
  metrics](https://help.alteryx.com/trifacta-classic/en/reference/join-metrics.html)).
- **In Cube today 📄:** the grid says "N rows in T" for the step that ran
  ([CubeGridRegion.tsx:208](../../../packages/legend-cube-builder/src/components/grid/CubeGridRegion.tsx#L208)). An
  edge shows only its port's label, such as Left and Right on a Join
  ([CubeCanvasElements.ts:100](../../../packages/legend-cube-builder/src/components/canvas/CubeCanvasElements.ts#L100)).
  "Row counts on the nodes after a run" is on the backlog (`ISSUES.md:597`).

**Pure:** bind each step with `let`, count each one, and stack the counts.

```
{| let a = <source>->select(~[ORDER_ID, SHIP_COUNTRY]);
   let b = $a->filter(r | $r.SHIP_COUNTRY == 'France');
   $a->aggregate(~[n: x | 1 : y | $y->count()])->extend(~step: x | 'a')
     ->concatenate($b->aggregate(~[n: x | 1 : y | $y->count()])->extend(~step: x | 'b'));
}
```

- **Plan results:** P07 ✅ on all five, as one statement: `WITH a AS (…), b AS (…) … count(1) … UNION ALL …`. P17 ✅ on
  all five: a side's rows and distinct keys.
- **Design:** a "Count rows" action counts every step of the cube in one query. For a join, it also counts each side's
  rows and distinct keys. When a side's keys repeat, the join multiplies rows, and Cube can say by how much ("right
  side: 830 rows, 89 keys"). With idea 2's anti-join, the same query can count each side's unmatched rows, Alteryx's L
  and R 💭.
- **To check first 💭:** P07 binds a select and a filter. Cube's `let` rules (PLAN §8.6) bind only Partitions today,
  never write a `let` after a Sort, and keep a sorted Limit's ORDER BY inside its CTE. Counting every step binds every
  step, so those cases need probes. The fallback counts each step's own sub-tree inline, without `let`. It needs no new
  rule, since no step feeds two ([Query.ts:97](../../../packages/legend-cube/src/graph/Query.ts#L97)), but it scans the
  inputs again for each count.

### 2.2 Rows without a match, and duplicate keys

**Size** M. **Waits on** AX3 for its shape; AX1 only for both sides of a filter at once.

- **In Alteryx 📄:** Filter has a True (T) and a False (F) output
  ([Filter](https://help.alteryx.com/designer/current/en/tools/preparation/filter-tool.html)). Join's L and R outputs
  hold the rows that found no match ([Join](https://help.alteryx.com/designer/current/en/tools/join/join-tool.html)).
  Unique sends the first row of each key to U and the rest to D
  ([Unique](https://help.alteryx.com/designer/current/en/tools/preparation/unique-tool.html)). Whether Join matches NULL
  keys is unsettled: Community answers disagree, and the Join page doesn't say 🔎.
- **In Cube today 📄:** one output per step, and a step can't feed two
  ([Query.ts:132-136](../../../packages/legend-cube/src/graph/Query.ts#L132)). Join offers Inner, Left, Right and Full
  on pairs of equal keys, and a NULL key never matches (D4,
  [Join.ts:43](../../../packages/legend-cube/src/nodes/transforms/Join.ts#L43),
  [Join.ts:331-333](../../../packages/legend-cube/src/nodes/transforms/Join.ts#L331)). Compare Column Values joins its
  inputs with a full outer join and subtracts numbers
  ([Difference.ts:111-118](../../../packages/legend-cube/src/nodes/transforms/Difference.ts#L111)); it isn't a set
  difference.

**Pure:**

```
// Left rows without a match (anti-join): NOT EXISTS (select 1 …)
$left->filter(l | !$right->exists(r | $r.CUSTOMER_ID == $l.CUSTOMER_ID))

// Left rows with a match (semi-join): IN (select …)
$left->filter(l | $l.CUSTOMER_ID->in($right->select(~CUSTOMER_ID)))

// Duplicate keys: a window count bound with let, then a filter
{| let n_w = $input->extend(~[ORDER_ID]->over(), ~[n: {p, w, r | 1} : y | $y->size()]);
   $n_w->filter(r | $r.n > 1); }
```

- **Plan results:** P01 ✅, P03 ✅ and P05 ✅ on all five. With `count()` in place of `size()` the engine drops the
  `OVER` and writes a plain aggregate (P05x ⚠️). Cube already writes `size()`
  ([PartitionEmitter.ts:47](../../../packages/legend-cube/src/ir/emitters/PartitionEmitter.ts#L47), pinned by
  [PartitionEmitter.test.ts:232](../../../packages/legend-cube/src/ir/__tests__/PartitionEmitter.test.ts#L232)).
- **NULL keys 💭** (from the SQL): `NOT EXISTS` keeps a left row whose key is NULL, as a left join's unmatched rows do,
  and the semi-join drops it, as an inner join does. Both agree with D4.
- **Design:**
  - Two more Join kinds (AX3), "Left rows without a match" and "Left rows with a match", keep the left columns only.
    They need no change to the graph rules.
  - "Find duplicate keys" adds Apply Window Functions (Count rows over the key) and a Filter (`n > 1`) in one go.
  - The other side of a Filter by Column is exact already: its negation keeps NULL rows (D4,
    [FilterEmitter.ts:79-82](../../../packages/legend-cube/src/ir/emitters/FilterEmitter.ts#L79)), so the two sides
    add up to the input. Filter by Expression has no such rule yet; it is I4 of the expression editor's plan
    (`EXPRESSION-EDITOR.md:305`). Showing both sides from one source needs AX1, or a second copy of the chain.
- **To check first 💭:** P01 and P03 read bare tables. A Join's right input can be any chain, a `let`-bound window
  included; `exists` and `in` over such an input need probes on every database.

### 2.3 More Group functions

**Size** S. **Waits on** nothing. **Being built** since 2026-10-29: median, percentile, standard deviation and
concatenate, on the branch `cube-group-functions`.

- **In Alteryx 📄:** Summarize offers Count Null and Non Null, Median, Mode, Percentile, Std Dev, Variance, Product,
  Concatenate (with a start, a separator and an end), Concatenate Distinct, First, Last, Longest, Shortest, and finance
  functions such as NPV and IRR
  ([Summarize](https://help.alteryx.com/designer/current/en/tools/transform/summarize-tool.html)).
- **In Cube today 📄:** Count, Count Rows, Distinct Count, Distinct Value, Sum, Average, Min and Max, shared by Group and
  Apply Window Functions ([Aggregation.ts:40-54](../../../packages/legend-cube/src/nodes/transforms/Aggregation.ts#L40)).

**Pure:**

```
$input->groupBy(~[CATEGORY_ID], ~[
  med:    x | $x.UNITS_IN_STOCK : y | $y->median(),
  sd:     x | $x.UNITS_IN_STOCK : y | $y->stdDevSample(),
  p90:    x | $x.UNITS_IN_STOCK : y | $y->percentile(0.9),
  cities: x | $x.SHIP_CITY : y | $y->joinStrings(', ')])
```

- **Plan results:** P14 ✅ and P15 ✅ on all five. H2 writes the median as `percentile_cont(0.5)`. The engine also writes
  SQL for mode, variance, correlation and covariance 📄; those weren't probed.
- **Notes:** Group and Apply Window Functions share the list, so each new function is checked in Pivot and in window
  aggregates before it is offered there. First and Last need an order, which Alteryx takes from record position (§3.2).
  Once this lands, #5791's "Add this view as steps" could map DataCube's StdDev and Join Strings instead of refusing
  them 💭.

### 2.4 A column profile of a step

**Size** M. **Waits on** #5791's D1 (DataCube as the results region) for where it shows; AX2 for when it runs.

- **In Alteryx 📄:** the Results window draws a quality bar under each column, for the rows shown ([Results
  window](https://help.alteryx.com/designer/current/en/workflows/results-window.html)). Browse profiles each column: the
  top 5 values with counts, length or numeric statistics, and a date histogram whose bucket follows the range, from hour
  to year. It stops after 300 MB of records
  ([Browse](https://help.alteryx.com/designer/current/en/tools/in-out-tools/browse-tool.html)). Live Query's results
  grid has a Turn on Profiling button: a quality bar, a type icon, and a chart or the top values of each column. It
  fetches up to 500 rows at a time ([results
  grid](https://help.alteryx.com/live-query/en/workflows/interactive-results-grid.html)).
- **In Cube today 📄:** none. The closest are the local-mode grid's status bar
  ([CubeResultGrid.tsx:610](../../../packages/legend-cube-builder/src/components/grid/CubeResultGrid.tsx#L610)) and
  Explore JSON's most frequent values of a field
  ([CubeJsonShape.ts:250](../../../packages/legend-cube-builder/src/stores/variant/CubeJsonShape.ts#L250)).

**Pure:** one `aggregate()` over the step, then each column's top values.

```
$step->aggregate(~[
  rows: x | 1 : y | $y->count(),
  region_empty: x | if($x.SHIP_REGION->isEmpty(), | 1, | 0) : y | $y->sum(),
  country_distinct: x | $x.SHIP_COUNTRY : y | $y->distinct()->count(),
  date_min: x | $x.ORDER_DATE : y | $y->min(),
  date_max: x | $x.ORDER_DATE : y | $y->max()])
// and, per column: groupBy(~c, count) -> sort(descending) -> limit(10)
```

- **Plan results:** P06 ✅ on all five, as one `select count(1), sum(case …), count(distinct …), min(…), max(…)`. The
  top values per column weren't probed 💭.
- **Notes:** in the warehouse the profile covers the whole result, where Alteryx profiles what the client holds. Exact
  distinct counts on wide, high-cardinality results are the costly part, hence on demand (AX2). The query belongs in
  the host-free core (`legend-cube`), whatever shows it.

### 2.5 One edit for many columns

**Size** M. **Waits on** nothing.

- **In Alteryx 📄:** Multi-Field Formula applies one expression to every chosen column and writes over them or to
  prefixed copies ([Multi-Field
  Formula](https://help.alteryx.com/designer/current/en/tools/preparation/multi-field-formula-tool.html)). Data Cleansing
  trims, replaces nulls with blanks or 0, strips letters, numbers or punctuation, and changes case ([Data
  Cleansing](https://help.alteryx.com/designer/current/en/tools/preparation/data-cleansing-tool.html)). Select renames,
  retypes, reorders and drops in one grid
  ([Select](https://help.alteryx.com/designer/current/en/tools/preparation/select-tool.html)). Union matches columns by
  name by default ([Union](https://help.alteryx.com/designer/current/en/tools/join/union-tool.html)).
- **In Cube today 📄:** Extend adds columns and refuses a name the input already has
  ([Extend.ts:253-254](../../../packages/legend-cube/src/nodes/transforms/Extend.ts#L253)). Restrict keeps the input's
  order, not the order picked ([Restrict.ts:35-38](../../../packages/legend-cube/src/nodes/transforms/Restrict.ts#L35)).
  Concat's autofixes won't line up inputs that hold the same columns in another order
  ([ConcatAutofix.ts:33-35](../../../packages/legend-cube/src/nodes/transforms/ConcatAutofix.ts#L33),
  [:97-99](../../../packages/legend-cube/src/nodes/transforms/ConcatAutofix.ts#L97)). There is no cast step.

**Pure:** only `extend`, `select` and `rename`, which Cube writes today 📄. A replaced column is a temporary column, a
drop and a rename.

- **Plan results:** nothing new to plan.
- **Design:**
  - **Replace a column in Extend.** Cube's emitters already add and drop temporary columns
    ([TemporaryColumns.ts](../../../packages/legend-cube/src/ir/TemporaryColumns.ts)).
  - **"Clean columns".** Pick columns and presets (trim, upper or lower case, empty to 0 or blank, cast), and Cube
    writes the replacements in one Extend. The `toOne` and `coalesce` quick fixes it needs are planned in I2
    (`EXPRESSION-EDITOR.md:298`).
  - **Restrict keeps the picked order.** The engine's `select` keeps the order it is given (`Restrict.ts:37`). Concat
    can then line up the second input by name, as Alteryx's Union does. Saved Restricts already list their columns in the
    input's order (the editor sorts them,
    [CubeRestrictDraft.ts:34-37](../../../packages/legend-cube-builder/src/stores/editors/CubeRestrictDraft.ts#L34)),
    so old cubes keep their order 💭. The emitter's subsequence check
    ([RestrictEmitter.ts:27-31](../../../packages/legend-cube/src/ir/emitters/RestrictEmitter.ts#L27)) goes.

### 2.6 Transpose, or unpivot

**Size** M. **Waits on** nothing.

- **In Alteryx 📄:** Transpose turns chosen data columns into Name and Value rows and keeps the key columns
  ([Transpose](https://help.alteryx.com/designer/current/en/tools/transform/transpose-tool.html)). It is on Live Query's
  Snowflake and Databricks palettes ([Snowflake tools](https://help.alteryx.com/live-query/en/snowflake-tools.html),
  [Databricks tools](https://help.alteryx.com/live-query/en/databricks-tools.html)).
- **In Cube today 📄:** Pivot by Column, static, up to 100 values
  ([Pivot.ts:61](../../../packages/legend-cube/src/nodes/transforms/Pivot.ts#L61)). Nothing goes the other way: the
  engine has `pivot` but no `unpivot` relation function (§4).

**Pure:** one projection per column, stacked.

```
{| let t = <input>->select(~[PRODUCT_ID, UNITS_IN_STOCK, UNITS_ON_ORDER]);
   $t->extend(~[attribute: x | 'UNITS_IN_STOCK', value: x | $x.UNITS_IN_STOCK])
     ->select(~[PRODUCT_ID, attribute, value])
     ->concatenate($t->extend(~[attribute: x | 'UNITS_ON_ORDER', value: x | $x.UNITS_ON_ORDER])
                     ->select(~[PRODUCT_ID, attribute, value])); }
```

- **Plan results:** P08 ✅ on all five: `WITH t AS (…) select … UNION ALL select …`.
- **Notes:** the values need one type, so Concat's conversion rules apply, with text as the fallback across families.
  Import Pure would have to recognize the pattern. An engine `unpivot` would be cleaner, and is worth an engine issue.
- **To check first 💭:** P08 reads a bare table. Transpose after a Partition or a Sort meets PLAN §8.6's `let` rules
  (only Partitions are bound; never a `let` after a Sort).

### 2.7 Notes, groups, skipping a step, palette search

**Size** S each. **Waits on** M8 (#5679) for notes and groups; nothing for search and skipping.

- **In Alteryx 📄:** a Tool Container has a caption, colors, a collapse icon and an enable or disable switch ([Tool
  Container](https://help.alteryx.com/designer/current/en/tools/documentation/tool-container-tool.html)). A Comment
  holds free text ([Comment](https://help.alteryx.com/designer/current/en/tools/documentation/comment-tool.html)). Each
  tool's annotation fills itself from its settings ([Tool
  Configuration](https://help.alteryx.com/designer/current/en/tools/tool-configuration.html)). Global Search finds a
  tool and drags it onto the canvas
  ([Search](https://help.alteryx.com/designer/current/en/get-started/designer-user-interface/search.html)). Reviewers
  describe large workflows as "spaghetti" 🔎.
- **In Cube today 📄:** each step shows its settings as its label, which covers Alteryx's annotations
  ([CubeCanvasElements.ts:175-181](../../../packages/legend-cube-builder/src/components/canvas/CubeCanvasElements.ts#L175)).
  One step is selected at a time ([Query.ts:89](../../../packages/legend-cube/src/graph/Query.ts#L89)), React Flow's
  selection and multi-select are off
  ([CubeCanvas.tsx:183-186](../../../packages/legend-cube-builder/src/components/canvas/CubeCanvas.tsx#L183)), and
  there are no notes or groups. Palette search and notes on steps are on the backlog (`ISSUES.md:598-599`).

**Pure:** nothing new; a skipped step is left out of the lambda.

- **Plan results:** nothing to plan.
- **Design:**
  - Palette search can ship now.
  - "Skip this step", for a step with one input: the emitter leaves it out and the canvas dims it.
  - Notes and groups go in the spec's `meta`. They are worth having only once cubes are saved (M8).

### 2.8 Describe the cube in plain English

**Size** S. **Waits on** nothing.

- **In Alteryx 📄:** Ask Alteryx can summarize what a workflow does, and document it with a Comment ([Ask Alteryx in
  Designer](https://help.alteryx.com/ask-alteryx/en/ask-alteryx-in-designer.html)). Trifacta's recipe panel shows the
  steps in readable language by default, with a toggle to its Wrangle code ([recipe
  panel](https://help.alteryx.com/trifacta-classic/en/reference/ui-reference/transformer-page/context-panel/recipe-panel.html)).
- **In Cube today 📄:** every step describes itself
  (`describe()`, [QueryNode.ts:112](../../../packages/legend-cube/src/graph/QueryNode.ts#L112)), and the canvas labels
  use it. Nothing reads the whole chain.

**Pure:** none; it reads the steps, not the lambda.

- **Plan results:** nothing to plan.
- **Design:** "Describe" lists the steps from each source to the running step as numbered sentences, with no LLM. It
  helps most in Studio, where a MatView definition is reviewed. An LLM summary, or natural language to steps, can come
  later through Legend's AI features if wanted.

### 2.9 Checks on a step

**Size** M-L. **Waits on** AX5; Studio's Create MatView flow, to save them as validations.

- **In Alteryx 📄:** Test checks a record count, or an expression for every row or for the first row
  ([Test](https://help.alteryx.com/designer/current/en/tools/developer/test-tool.html)). Expect Equal compares results
  with an expected set ([Expect
  Equal](https://help.alteryx.com/designer/current/en/tools/developer/expect-equal-tool.html)). Trifacta has 17 rule
  types, among them Unique, Not Missing, In Range, Match and Formula, and shows a quality bar for each rule ([data
  quality rules](https://help.alteryx.com/trifacta-classic/en/concepts/feature-overviews/overview-of-data-quality/overview-of-data-quality-rules.html),
  [rules reference](https://help.alteryx.com/trifacta-classic/en/reference/data-quality-rules-reference.html)).
- **In Cube today 📄:** none. Legend has a Data Quality DSL: a relation validation configuration holds a query and
  named validations
  ([DataQualityValidationConfiguration.ts:189-194](../../../packages/legend-extension-dsl-data-quality/src/graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.ts#L189)),
  each an assertion lambda typed `ROW_LEVEL` or `AGGREGATE` (the same file, :35-38 and :166-171).

**Pure:** an aggregate over the step per check, run together in one statement, as idea 1's counts are.

- **Plan results:** P06 ✅ and P17 ✅ are the aggregates such checks write. Checks as such weren't probed 💭.
- **Design:** checks on a step: the key is unique, a column is never empty, values stay in a range, there is at least
  one row. In Studio, the checks could be saved next to the MatView as a data-quality relation validation (AX5).

### 2.10 Parameters

**Size** L. **Waits on** M8 (#5679): parameters matter once cubes are saved and shared.

- **In Alteryx 📄:** Interface tools (Drop Down, Date, Text Box and others) turn a workflow into an Analytic App, and
  Action tools update each tool's configuration at run time, down to its raw XML ([Analytic
  Apps](https://help.alteryx.com/designer/current/en/apps-and-macros/analytic-apps.html),
  [Action](https://help.alteryx.com/designer/current/en/tools/interface-tools/action-tool.html)).
- **In Cube today 📄:** a run sends `parameterValues: []`
  ([V1_LegendCubeEngine.ts:1305](../../../packages/legend-cube-builder/src/graph-manager/protocol/pure/v1/V1_LegendCubeEngine.ts#L1305)).
  A function source takes a value per parameter, saved with the step
  ([FunctionSource.ts:128-140](../../../packages/legend-cube/src/nodes/sources/FunctionSource.ts#L128)). Import Pure
  refuses a lambda with parameters
  ([CubeLambdaParts.ts:105-107](../../../packages/legend-cube/src/ir/reader/CubeLambdaParts.ts#L105)).

**Pure:** the cube's lambda takes parameters, such as an as-of date or a region, and its steps read them.

- **Plan results:** not probed.
- **Design:** parameters are asked for in a short form before a run. Unlike Alteryx's XML patching, they are typed.
  Legend Query already runs parameterized lambdas.

### 2.11 Steps saved as a function

**Size** L. **Waits on** M8 (#5679), and Studio.

- **In Alteryx 📄:** a macro packages part of a workflow as a tool, with typed inputs and outputs, shared through a
  macro repository with versions ([Macros](https://help.alteryx.com/designer/current/en/apps-and-macros/macros.html)).
  Batch and iterative macros rerun it per control record or in a loop.
- **In Cube today 📄:** copy and paste of one step
  ([CubeEditorState.ts:1844](../../../packages/legend-cube-builder/src/stores/CubeEditorState.ts#L1844)). The Project
  Function source reads a function that returns a relation
  ([FunctionSource.ts:128-131](../../../packages/legend-cube/src/nodes/sources/FunctionSource.ts#L128)).

**Pure:** a function from a relation to a relation, and a step that applies it.

- **Plan results:** not probed.
- **Design:** "Save these steps as a function" writes the function into a project through Studio, where it is
  reviewed, versioned and tested in Legend SDLC. "Apply function" then uses it as a step. Batch and iterative macros
  don't carry over, because they loop.

## 3. Later, and what doesn't fit

### 3.1 Later

- **Auto-run with a cache.** Run after Apply for small results (`ISSUES.md:584`), and keep recent results in memory so
  switching back costs nothing. Optional, for AX2's reason.
- **Top N per group.** Two steps today (Row Number, then a Filter). A "per group" option on Take first rows would write
  both (P04 ✅ on all five).
- **Split and regex.** `splitPart` plans everywhere (P10 ✅). Replace-all `regexpReplace` is refused on MemSQL and H2
  (P11). Both are usable in Extend today through the function catalogue (I1). Showing each database's results is I2.
- **Map values** (Find Replace, `Switch`). A two-column editor written as nested `if` 💭. Inline `#TDS{}#` tables don't
  plan on any database (P13).
- **Fuzzy match.** `jaroWinklerSimilarity` plans on Snowflake, DuckDB and H2, not on Databricks or MemSQL (P12). It
  needs a join on a condition, and a blocking key, or it is a cross join.
- **Date spine** (Generate Rows). `generateSeries` plans except on MemSQL (P09), and a cube has no source of that kind.
- **Rolling windows.** AX4.
- **Random sample.** The engine has no sampling relation function (§4); `random()` wasn't probed.
- **Fill empties with the mean or median** (Imputation). A window average and `coalesce`; easier after idea 5.
- **Date parsing** (DateTime). `parseDate` wasn't probed; check it on each database before offering it.
- **Suggestions from a selected value.** Depends on #5791's C1, host items on a cell's menu.

### 3.2 Doesn't fit

A cube compiles to one SQL statement with no side effects.

- **Loops and row-by-row logic:** iterative and batch macros, Generate Rows loops, a Multi-Row Formula that reads its
  own previous result, Make Group, Block Until Done, Detour, Control Container.
- **Code and side effects:** Python, R, Run Command, Download, Email, workflow events.
- **Files and writes:** Directory, wildcard inputs, Output Data, Data Stream In. Temporary tables need CREATE rights,
  and data product consumers only read. Writes go through MatViews in Studio.
- **Order without a sort:** Record ID, first or last N rows, First and Last. Cube asks for the sort.
- **Types from the data:** Auto Field, Dynamic Rename and Select, headers taken from the data. Cube's Pivot lists its
  values on purpose.
- **Native SQL steps:** Formula In-DB, SQL Transform. They lose typing, Import Pure and portability, and D9
  (`PLAN.md:25`) chose the Pure chain.
- **Analysis products:** predictive, spatial, reporting, time series, prescriptive, address, demographic, per-row LLM
  prompts. DataCube would bring charts if #5791 lands.

## 4. Engine checks

Each check is a relation lambda on the g4 Northwind model, planned by a local legend-engine (`3aeb3f0f7f`, 2026-10-23)
for five databases. **A plan proves the engine writes SQL for the step, not that the SQL runs: nothing ran on any of
them.** The checks read **relational tables** (`#>{…}#`) through each database's dialect. **Data product (`#P{}#`) and
ingest (`#I{}#`) accessors weren't planned**, because the local open-source engine refuses them, so a ✅ doesn't mean a
data product cube was tried. The harness (`run.mjs`) and the full SQL (`out-2026-10-28.txt`) are in the local evidence
folder, under `alteryx/probes/`.

| Probe                                                              | Alteryx tool it stands for       | Snowflake | Databricks | MemSQL | DuckDB | H2  | Note                                                                                           |
| ------------------------------------------------------------------ | -------------------------------- | --------- | ---------- | ------ | ------ | --- | ---------------------------------------------------------------------------------------------- |
| P01 `filter(!exists(…))`                                           | Join, L output (anti-join)       | ✅        | ✅         | ✅     | ✅     | ✅  | `NOT EXISTS (select 1 …)`, correlated                                                          |
| P02 left join, then `isEmpty`                                      | Join, L output (alternative)     | ✅        | ✅         | ✅     | ✅     | ✅  |                                                                                                |
| P03 `in(relation)`                                                 | Join, J output on keys only      | ✅        | ✅         | ✅     | ✅     | ✅  | The subquery skips NULL keys                                                                   |
| P04 `rowNumber` over a partition, then a filter                    | Sample, first N per group        | ✅        | ✅         | ✅     | ✅     | ✅  | The filter lands outside the window (a subselect)                                              |
| P05 a count over a key with `size()`, bound with `let`, then `> 1` | Unique, D output                 | ✅        | ✅         | ✅     | ✅     | ✅  | Cube's own window rules (PLAN §8.6)                                                            |
| P05x the same with `count()`                                       | —                                | ⚠️        | ⚠️         | ⚠️     | ⚠️     | ⚠️  | Plans, but **drops the `OVER`**: an aggregate, not a window. Cube already writes `size()`      |
| P06 one `aggregate()`: empties, distinct, min, max                 | Column profile                   | ✅        | ✅         | ✅     | ✅     | ✅  | One statement profiles every column                                                            |
| P07 the counts of two steps, `concatenate`                         | Counts on connections            | ✅        | ✅         | ✅     | ✅     | ✅  | One `WITH a, b … count(1) … UNION ALL`                                                         |
| P08 a projection per column, `concatenate`                         | Transpose                        | ✅        | ✅         | ✅     | ✅     | ✅  | `UNION ALL` over a CTE                                                                         |
| P09 `generateSeries` and `adjust`                                  | Generate Rows (a date spine)     | ✅        | ✅         | ❌     | ✅     | ✅  | MemSQL: "generateSeries is not supported"                                                      |
| P10 `splitPart`                                                    | Text To Columns                  | ✅        | ✅         | ✅     | ✅     | ✅  | `splitPart` is 0-based                                                                         |
| P11 replace-all `regexpReplace`, `regexpLike`                      | RegEx, Data Cleansing            | ✅        | ✅         | ❌     | ✅     | ❌  | MemSQL replaces only the first match; H2 has no translation for `regexpReplace`                |
| P12 a join on `jaroWinklerSimilarity > 0.9`                        | Fuzzy Match                      | ✅        | ❌         | ❌     | ✅     | ✅  | Databricks and MemSQL: "not supported yet". A similarity join is a costly cross join           |
| P13 a `#TDS{…}#` literal joined with a table                       | Text Input (inline lookup table) | ❌        | ❌         | ❌     | ❌     | ❌  | "ClassInstanceHolder cannot be cast to SelectWithCursor"; the literal alone fails the same way |
| P14 `joinStrings` in a `groupBy`                                   | Summarize, Concatenate           | ✅        | ✅         | ✅     | ✅     | ✅  |                                                                                                |
| P15 `median`, `stdDevSample`, `percentile` in a `groupBy`          | Summarize, statistics            | ✅        | ✅         | ✅     | ✅     | ✅  | H2 writes the median as `percentile_cont(0.5)`                                                 |
| P16 `ntile`                                                        | Tile, equal records              | ✅        | ✅         | ✅     | ✅     | ✅  | Cube has it (Apply Window Functions)                                                           |
| P17 the rows and distinct keys of one side                         | Join size guard                  | ✅        | ✅         | ✅     | ✅     | ✅  |                                                                                                |

15 of the 17 checks plan on both Snowflake and Databricks, and 13 on MemSQL. P05x isn't counted: it plans, wrongly.

The engine's relation functions at `3aeb3f0f7f` include `exists`, `in`, `except`, `intersect`, `union`, `asOfJoin`,
`lateral`, `recurse`, `generateSeries`, `pivot`, `ntile`, `percentRank`, `cumulativeDistribution`, `lag`, `lead`,
`first`, `last`, `nth`, `emptyFirst` and `emptyLast`, and the `rows` and `_range` frames 📄. There is **no `unpivot`**:
the name appears only in the SQL dialect translations for DuckDB and MemSQL. `JoinKind` has no cross join (`INNER`,
`LEFT`, `RIGHT`, `FULL`). Cube writes `lateral` (Explode Array) and `in` over a list (Filter by Column), and none of
`exists`, `in` over a relation, `except`, `intersect`, `asOfJoin`, `recurse` or `generateSeries` yet 📄.

## 5. Sources

### 5.1 Alteryx

The Designer pages are the 2026.3 documentation, read on 2026-10-28. The Live Query, Ask Alteryx and Trifacta Classic
pages and the TechTarget article were read again on 2026-10-29, for the claims above.

- **Designer:** [Results window](https://help.alteryx.com/designer/current/en/workflows/results-window.html),
  [Browse](https://help.alteryx.com/designer/current/en/tools/in-out-tools/browse-tool.html), [Workflow
  Configuration](https://help.alteryx.com/designer/current/en/workflows/workflow-configuration.html), [Tool
  Configuration](https://help.alteryx.com/designer/current/en/tools/tool-configuration.html),
  [Filter](https://help.alteryx.com/designer/current/en/tools/preparation/filter-tool.html),
  [Join](https://help.alteryx.com/designer/current/en/tools/join/join-tool.html),
  [Unique](https://help.alteryx.com/designer/current/en/tools/preparation/unique-tool.html),
  [Union](https://help.alteryx.com/designer/current/en/tools/join/union-tool.html), [Append
  Fields](https://help.alteryx.com/designer/current/en/tools/join/append-fields-tool.html), [Join
  Multiple](https://help.alteryx.com/designer/current/en/tools/join/join-multiple-tool.html),
  [Summarize](https://help.alteryx.com/designer/current/en/tools/transform/summarize-tool.html),
  [Transpose](https://help.alteryx.com/designer/current/en/tools/transform/transpose-tool.html), [Multi-Field
  Formula](https://help.alteryx.com/designer/current/en/tools/preparation/multi-field-formula-tool.html), [Data
  Cleansing](https://help.alteryx.com/designer/current/en/tools/preparation/data-cleansing-tool.html),
  [Select](https://help.alteryx.com/designer/current/en/tools/preparation/select-tool.html), [Tool
  Container](https://help.alteryx.com/designer/current/en/tools/documentation/tool-container-tool.html),
  [Comment](https://help.alteryx.com/designer/current/en/tools/documentation/comment-tool.html),
  [Search](https://help.alteryx.com/designer/current/en/get-started/designer-user-interface/search.html),
  [Test](https://help.alteryx.com/designer/current/en/tools/developer/test-tool.html), [Expect
  Equal](https://help.alteryx.com/designer/current/en/tools/developer/expect-equal-tool.html),
  [Macros](https://help.alteryx.com/designer/current/en/apps-and-macros/macros.html), [Analytic
  Apps](https://help.alteryx.com/designer/current/en/apps-and-macros/analytic-apps.html),
  [Action](https://help.alteryx.com/designer/current/en/tools/interface-tools/action-tool.html).
- **Live Query:** [overview](https://help.alteryx.com/live-query/en/live-query.html), [query
  execution](https://help.alteryx.com/live-query/en/get-started-with-live-query/query-execution-in-live-query.html),
  [results grid](https://help.alteryx.com/live-query/en/workflows/interactive-results-grid.html), [Snowflake
  tools](https://help.alteryx.com/live-query/en/snowflake-tools.html), [Databricks
  tools](https://help.alteryx.com/live-query/en/databricks-tools.html).
- **Ask Alteryx:** [Ask Alteryx in Designer](https://help.alteryx.com/ask-alteryx/en/ask-alteryx-in-designer.html).
- **Trifacta Classic:** [join metrics](https://help.alteryx.com/trifacta-classic/en/reference/join-metrics.html), [data
  quality rules](https://help.alteryx.com/trifacta-classic/en/concepts/feature-overviews/overview-of-data-quality/overview-of-data-quality-rules.html),
  [rules reference](https://help.alteryx.com/trifacta-classic/en/reference/data-quality-rules-reference.html), [recipe
  panel](https://help.alteryx.com/trifacta-classic/en/reference/ui-reference/transformer-page/context-panel/recipe-panel.html).
- **News:** TechTarget, [Alteryx launches in-warehouse data prep tool for
  BigQuery](https://www.techtarget.com/searchdatamanagement/news/366637939/Alteryx-launches-in-warehouse-data-prep-tool-for-BigQuery)
  (28 Jan 2026), for AX2's cost estimate.
- **Seen only in search summaries 🔎**, because the Alteryx Community site blocks automated reading:
  - NULL join keys: Community answers disagree, and the official Join page doesn't say
    ([joins](https://community.alteryx.com/discussion/360072/joins)).
  - "Spaghetti" workflows: reviews and a Community thread ([G2](https://g2.com/products/alteryx/reviews_and_filters?page=2),
    [workflow complexity](https://community.alteryx.com/discussion/1285346/workflow-complexity)).

The Designer catalog (`alteryx/reports/alteryx-designer-catalog.md` in the local evidence folder) holds every page read,
the source of each claim, the list of claims seen only in search summaries, and the claims that conflict.

### 5.2 Legend

- Legend Cube at finos/master `18a8f8fcf`: `packages/legend-cube`, `packages/legend-cube-builder`, and this folder's
  [PLAN.md](PLAN.md), [ISSUES.md](ISSUES.md) and [EXPRESSION-EDITOR.md](EXPRESSION-EDITOR.md).
- The Data Quality DSL: `packages/legend-extension-dsl-data-quality`.
- finos/legend-studio#5791: Legend DataCube as the results grid (plan, DATACUBE-GRID.md, PLAN §11.26; decisions D1-D7
  open).
- finos/legend-studio#5679: M8, saved cubes (PLAN §11.13).
- legend-engine `3aeb3f0f7f` (2026-10-23): the relation functions under
  `legend-engine-core/legend-engine-core-pure/legend-engine-pure-code-functions-relation/legend-engine-pure-functions-relation-pure/src/main/resources/core_functions_relation/relation/functions/`.
- The study's report, a page private to the user, and its local copy (`alteryx/alteryx-ideas-for-cube.html` in the
  local evidence folder).
