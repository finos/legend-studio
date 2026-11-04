---
'@finos/legend-data-cube': patch
'@finos/legend-application-data-cube': patch
---

Keep the engine's precise primitive column types (e.g. `Int`, `Varchar(200)`, `Numeric(18,4)`) instead of collapsing them into core primitives: columns now record their type variable values, numeric precise columns default to measures (with the scale of `Numeric` as default decimals), relation casts declare `Numeric`/`Varchar` with their actual type variable values, configurations saved with collapsed types are upgraded on load (DataCubes saved by older versions get their full column types, including type variable values, from the engine when loaded, and keep them once saved again), the column properties panel shows the precise type, and the filter editor warns about values outside the constraints of the column type. In Legend DataCube, the DuckDB cache now creates columns matching their precise type (e.g. `BIGINT` for `BigInt`, `DECIMAL(38,s)` for `Numeric(p,s)` so values wider than the declared precision still fit, `TIMESTAMP` for `Timestamp`), reads back decimal values with their scale (without failing on values beyond the safe integer range), and maps local file `BOOLEAN`/`DECIMAL(p,s)`/`UBIGINT` columns correctly.

Behavior changes and compatibility notes:

- `Numeric` columns now default to measures aggregated with `sum` (they used to default to dimensions); `BigInt`/`UBigInt` columns already did.
- DuckDB-backed sources (Lakehouse, Iceberg, local file, cache) now report grid result columns with their precise types: `Date` as `StrictDate`, `Timestamp` as `Timestamp` (was `DateTime`), integers and floats as their precise types, and `Decimal` as `Numeric` (was `Decimal`), so the casts written into pivot queries change accordingly.
- Removed the `Decimal` to `Float` workaround from pivot query generation, as the engine now handles `Decimal`.
- Removed the internal `DataCubeColumnConfiguration._convertPreciseToPrimitiveType()`, which nothing else referenced.
- DataCubes saved by this version persist precise column types, so older deployments cannot load them (they fail with a column type mismatch); DataCubes saved by older versions are upgraded on load.
- DataCubes saved by older versions need an extra engine call on each load until they are saved again.
- The DuckDB cache now follows the column types the engine reports: `Date` is cached as `TIMESTAMP` (it used to be `DATE`, which dropped the time of day), `Decimal` and `Numeric` of unknown size as `DECIMAL(38,18)` (they used to be `DOUBLE`), `StrictTime` as `TIME` and `Byte` as `BLOB`. Binary results from DuckDB are reported as `Byte` (hex strings) and `TIME` results as `StrictTime`.
- `StrictTime` and `Byte` columns are now recognized as their own kind of column: they can be displayed and grouped by but not filtered (previously they were treated as text, so adding a filter on a `StrictTime` column failed). Local file ingest now accepts DuckDB `TIME` (typed as a string) and `BLOB` (typed as `Byte`) columns.
