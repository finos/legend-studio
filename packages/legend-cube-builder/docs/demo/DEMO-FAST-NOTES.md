# Demo fast notes

## Live build (Trades)

1. **Examples → Trades → Start a new cube**: tick **TRADES**, **DESKS** → **Add 2**
2. **Drop Join Another Input** (lands after TRADES = Left); drag **DESKS → Right**
   - Join columns: **DESK_ID** = **ID** → Apply
3. **Drop Group by Column**
   - Group by: **DESK**, **REGION**
   - Agg 1: **NOTIONAL_USD** · Sum · `TOTAL_NOTIONAL_USD`
   - Agg 2: Count Rows · `TRADE_COUNT`
   - Apply · **F9** → 6 rows
4. **Drop Apply Window Functions**
   - Partition: **REGION**
   - Sort: **TOTAL_NOTIONAL_USD** · Descending
   - Function: Rank · `RANK_IN_REGION`
   - Apply · **F9** → Commodities 1, Rates 2, Equities Cash 3 (Americas)
5. **Drop Extend Columns**
   - Name: `NOTIONAL_MM`
   - Expression: `x | $x.TOTAL_NOTIONAL_USD / 1000000` → Validate
   - Apply · **F9** → Commodities 31.10
6. **Drop Filter by Expression**
   - `x | $x.NOTIONAL_MM > 25` → Validate
   - Apply · **F9** → 4 rows
7. **Show SQL** → Close · **Export** (fold the JSON)

Duplicate-column error on a Join → open it → **Rename them**.

**End spec:** [specs/trades-desks-5-final.cube.json](specs/trades-desks-5-final.cube.json) (Import → F9 → 4 rows).
Steps in between: `specs/trades-desks-1-joined` … `-4-extended`.

## Grid

1. **Examples → Notional by desk and asset class**; right-click `join102` → **Select** → Execute (400 rows)
2. Click **NOTIONAL_USD** header ×2
3. Right-click REGION cell → **Drilldown by "REGION"**; DESK cell → **Drilldown by "DESK"**
4. **Group rows…**: ids → Nothing, PRICE → Average
5. Expand Americas → Commodities
6. NOTIONAL_USD cell → **Format Column…**: Currency, 0 places
7. **Runs** · Export ▸ **CSV (whole query)** · **Local**

## Pivot (DuckDB)

1. **Connect to a source → Direct Connection**: DuckDB, paste the setup SQL below
   - Test connection → schema `demo` → **sales** → Add → **F9** (10 rows)
2. **Drop Pivot by Column**
   - Pivot column: **year** → Load values → All
   - Rows: **country**
   - Aggregation: Sum · **amount**
   - Apply · **F9** → 4 rows (France 120 · 80 · 180)

Setup SQL:

```sql
drop schema if exists demo cascade;
create schema demo;
create table demo.sales (id INTEGER PRIMARY KEY, country VARCHAR(10), product VARCHAR(10), year INTEGER, amount INTEGER, price DOUBLE);
insert into demo.sales values (1, 'France', 'Tea', 2022, 120, 2.5), (2, 'France', 'Coffee', 2023, 80, 3.1), (3, 'France', 'Tea', 2024, 150, 2.7), (4, 'Germany', 'Tea', 2022, 90, 2.4), (5, 'Germany', 'Coffee', 2022, 60, 3.0), (6, 'Germany', 'Coffee', 2024, 110, 3.3), (7, 'Japan', 'Tea', 2023, 200, 2.9), (8, 'Japan', 'Tea', 2024, 40, 2.9), (9, 'France', 'Coffee', 2024, 30, 3.2), (10, 'Spain', 'Coffee', 2022, 70, 3.0);
```

Fallback: [specs/duckdb-sales-pivot.cube.json](specs/duckdb-sales-pivot.cube.json).

## Function

1. **Function** (palette) → Dataset Trades → **tradesAbove** · `1000000` → Add → **F9** → 44 rows

**New** (header) clears the cube; Undo brings it back.
