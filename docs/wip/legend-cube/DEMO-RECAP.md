# Legend Cube: where we are

## Operations

| Operation                                             | What it does                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Join**                                              | Inner, left, right or full join of two inputs on key columns                       |
| **Filter by Column**                                  | Conditions on columns (equals, in, contains, empty, ranges…), combined with and/or |
| **Filter by Expression** (new)                        | Any one-row Pure condition, checked by the engine (`x \| $x.NOTIONAL_MM > 25`)     |
| **Group by Column**                                   | Group keys with Sum, Count, Average, Min, Max, Distinct Count…, or no keys at all  |
| **Pivot by Column** (new)                             | A column's values become columns, each with an aggregation (engine `pivot()`)      |
| **Apply Window Functions**                            | Rank, Row Number, running totals, Lag/Lead, NTile, percentiles, First/Last         |
| **Extend Columns**                                    | Calculated columns as Pure expressions, typed by the engine                        |
| **Compare Column Values**                             | The difference of two inputs' columns, joined on keys                              |
| **Concatenate**                                       | Stacks two inputs with the same columns                                            |
| **Sort, Restrict, Rename, Distinct, Take/Drop/Slice** | The everyday shaping steps                                                         |

## Sources

| Source                | Status | Notes                                                                       |
| --------------------- | ------ | --------------------------------------------------------------------------- |
| **Sample data**       | Ready  | Northwind, Sports and Trades, with ready-made example cubes                 |
| **Project databases** | Ready  | Database tables from a released project, through Depot                      |
| **Direct connection** | Ready  | H2 and DuckDB, with setup SQL or a CSV                                      |
| **Data products**     | Beta   | Access points of governed data products, entitlements enforced              |
| **Ingest data sets**  | Beta   | Data sets from ingest definitions                                           |
| **Functions**         | Beta   | Pure functions returning a relation, from a model or a project, with values |
| **Services**          | WIP    | Deployed services as sources                                                |

## Other features

- Steps check themselves as you go: a red node says what's missing
- Undo for every edit
- Export and import a cube as a file
- Show Pure and Show SQL
- Examples on three sample datasets
- Server-side grid: sorts run on the engine over the whole query
- Drill-down by any column, group rows summed (or averaged, counted…)
- Number, currency and percent column formats
- Runs panel with each query's SQL
- CSV export of the whole query, Excel of the rows shown
- Local mode: ag-grid's grouping, pivot mode and filters on the fetched rows

## Not supported yet

- Saving (WIP)
- Sources: Lake/DSB - will not support by choice

## Next steps

1. **Clean-up and review:** a review of the code so far, and moving Cube's own plumbing onto legend-graph, which it
   uses only lightly today: Cube writes its lambda JSON, reads model outlines and reads execution results itself,
   where legend-graph's metamodel, graph manager and value specifications would share Legend Query's code and
   fixes.
2. **Saving:** save, load and share cubes. The quick win is Mongo, in the same store as Legend Query's
   queries, though other options are worth considering.
3. **Services:** finish services as a source, with their parameters, and figure out how to convert a service's TDS
   result to a relation on the fly, so services that return a TDS can be used like any other source.
4. **Entry points:** open Cube from the other Legend apps:
   - **Marketplace:** add a data product as a source, opening it in Cube.
   - **Studio:** embed Cube to help create and edit data products and materialized views, and to edit functions.
5. **More direct connections:** support more databases in Direct Connection, starting with Snowflake.

## Discussion points

1. **Legend Analytics: Cube becomes Legend Analytics, merging in Data Cube and Query.**
   - Legend Query becomes a node on Cube's canvas: a query built in Query's form is one step of the flow.
   - The results grid becomes Data Cube's grid, so exploring a result works the same everywhere.
   - One saved spec holds both parts:
     - the **cube spec** drives the canvas, with Legend Query as one of its nodes;
     - the **grid spec** is what Data Cube holds today.
   - Together they form one lambda to execute.
2. **Data spaces drive the Legend Query node.**
   - The user picks a data space; the node shows Legend Query's query builder inside it.
   - The query built there is folded into the cube's spec, as one step of the flow.
3. **Other sources:** which additional sources do you want Cube to support?

## How it was built

- About 8 days, built with Claude Opus 5.5, in 8 milestones (M8, saving, is in progress).
- It started with Claude Opus 5 writing down the spec of the internal app.
