# Legend Cube demo kit

What you need to run the full demo, as in the walkthrough video (`videos/20-walkthrough-v3.webm` in the evidence
folder), on the `cube-demo-feedback` branch. Every number below is what the engine returned when these files were made
(2026-10-13); the sample data is fixed, so they match on the day.

| File                                      | What it is                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `specs/trades-desks-1-joined.cube.json`   | Act 2 after the Join: TRADES and DESKS joined on `DESK_ID` = `ID` (400 rows) |
| `specs/trades-desks-2-grouped.cube.json`  | … then the Group by DESK and REGION (6 rows)                                 |
| `specs/trades-desks-3-ranked.cube.json`   | … then the Rank within region (6 rows)                                       |
| `specs/trades-desks-4-extended.cube.json` | … then the calculated column `NOTIONAL_MM` (6 rows)                          |
| `specs/trades-desks-5-final.cube.json`    | … then Filter by Expression `NOTIONAL_MM > 25`: the finished cube (4 rows)   |
| `specs/duckdb-sales-pivot.cube.json`      | Act 4's DuckDB cube with the Pivot, its setup SQL inside (4 rows)            |
| `duckdb-pivot-setup.sql`                  | The DuckDB setup SQL to paste in Direct Connection for Act 4                 |

**Fallback:** if a live step goes wrong, **Import** the spec of the step before or after it and press **F9**. An
imported cube opens without running.

## Before the demo

- The local engine on `:6300` and the Query dev server (`yarn dev:query`) on this branch, with the Tailwind CSS built
  (`yarn workspace @finos/legend-application-query-deployment build:tailwindcss`).
- Open each example once to warm the engine up.
- Browser at about 1440×900, 100% zoom, a fresh `/query/cube` page.

## 1. An example (about 1 min)

1. **Examples → Top customers by orders**: it opens and runs, 10 rows, **Save-a-lot Markets** first with 31 orders.
2. Click the **Group** step: its editor opens under it. **Escape** closes it.

## 2. A live build on Trades (about 3 min)

The question: which desk trades most, and how does each rank in its region?

1. **Examples → Trades → Start a new cube**. Tick **TRADES** and **DESKS** (new: several tables at once), then
   **Add 2**. TRADES, ticked first, is the step that runs.
   - The source dialog's **← Examples** goes back to the examples.
2. Drag **Join Another Input** onto the canvas: it lands after TRADES (Left). Drag DESKS' dot to the Join's lower
   input (Right). The Join is red; its tooltip says _"Left join columns cannot be empty."_ Open it, **Add join
   columns**: **DESK_ID** = **ID**, **Apply**. _(Fallback: `trades-desks-1-joined`.)_
3. **Add Items ▾ → Group by Column**: tick **DESK** and **REGION**; aggregation 1 **NOTIONAL_USD**, **Sum**, named
   **TOTAL_NOTIONAL_USD**; **Add aggregation**: **Count Rows** named **TRADE_COUNT**. **Apply**, **F9**: 6 desks.
   _(`trades-desks-2-grouped`.)_
4. **Add Items ▾ → Apply Window Functions**: partition by **REGION**; **Add sort column** **TOTAL_NOTIONAL_USD**
   **Descending**; function **Rank** named **RANK_IN_REGION**. **Apply**, **F9**: Americas is Commodities 1, Rates 2,
   Equities Cash 3; Europe is Equity Derivatives 1, Credit 2; Asia is FX 1. _(`trades-desks-3-ranked`.)_
5. **Add Items ▾ → Extend Columns**: name **NOTIONAL_MM**, expression `x | $x.TOTAL_NOTIONAL_USD / 1000000`,
   **Validate** (_"Float, can be empty"_), **Apply**, **F9**: Commodities 31,102,024.71 → **31.10**.
   _(`trades-desks-4-extended`.)_
6. **Add Items ▾ → Filter by Expression**: `x | $x.NOTIONAL_MM > 25`, **Validate**, **Apply**, **F9**: **4 desks**
   (Commodities, Equity Derivatives, FX, Rates), their ranks unchanged. _(`trades-desks-5-final`.)_
7. **Show SQL**: the formatted SQL in a dialog: the `rank() over (partition by …)` inside, the `> 25` filter outside.
   **Copy SQL**, **Close**.
8. **Export**: the spec as JSON, each object folding from the gutter.

If two inputs share a column name that isn't a join key, the Join says _"Duplicate column names between inputs are not
supported…"_: open it and click **Rename them**.

## 3. The results grid (about 2 min)

1. **Examples → Notional by desk and asset class**. Right-click the join step (`join102`) → **Select**, then
   **Execute**: 400 trades. **Hide graph** for room.
2. Click the **NOTIONAL_USD** header twice: sorted descending, on the engine (Runs goes up by 2).
3. Right-click a REGION cell → **Drilldown by "REGION"**: Americas (189), Asia (68), Europe (143). Right-click a DESK
   cell → **Drilldown by "DESK"**.
4. **Group rows…**: set the id columns to **Nothing** and **PRICE** to **Average**; **Close**.
5. Expand **Americas**, then **Commodities** (65): each level is its own query.
6. Right-click a NOTIONAL_USD cell → **Format Column…**: **Currency**, decimal places **0**, **Apply**:
   $81,410,352 for Americas.
7. **Runs**: each run, sort and level fetched, with its SQL.
8. Right-click → **Export ▸ CSV (whole query)**: `Notional_by_desk_and_asset_class.csv`, a header and 400 trades.
9. **Local**: ag-grid's row groups, filters and the Columns panel with **Pivot Mode**. Back to **Server-side**.

## 4. Pivot (about 1.5 min)

1. On any sample cube (H2), point at **Pivot by Column** in the palette: greyed, _"Pivot is not supported on H2."_
2. New page → **Connect to a source → Direct Connection**: Database **DuckDB**, paste `duckdb-pivot-setup.sql` into
   **Setup SQL**, **Test connection**, schema **demo**, pick **sales**, **Add**, **F9**: 10 sales.
3. Palette **Pivot by Column**: pivot column **year**, **Load values** (2022, 2023, 2024), **All**, row column
   **country**, aggregation **Sum** of **amount**. **Apply**, **F9**: a row per country, a column per year: France
   120, 80, 180; Germany 150, –, 110; Japan –, 200, 40; Spain 70, –, –.
4. _(Fallback: Import `duckdb-sales-pivot.cube.json`, F9.)_

## 5. A function as a source (about 1 min)

1. Palette **Function**: Dataset **Trades**, Read **Functions**: `tradesAbove(minNotionalUsd: Float)` and
   `deskBook(desk, side?)`, which runs on its own runtime.
2. Pick **tradesAbove**, value **1000000**, **Add**, **F9**: **44 trades** above a million dollars.

## Not shown, and why

- **Data products:** the data product servers don't run locally. The Data Product tab now takes several access points
  at once, like tables.
- **Services:** work in progress.
