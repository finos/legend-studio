---
'@finos/legend-application-studio': patch
---

Fix how Studio maps relational column types to primitive types for the database builder column preview and for generated test data: `DOUBLE` and `REAL` now map to `Float` (were `Integer`), `BIT` to `Boolean` (was `String`), `DATE` to `StrictDate` (was `Date`), `NUMERIC` to `Decimal` like `DECIMAL` (was `Number`), and `BIGINT` to `Integer` (was unmapped, so its value was missing from mock table data). `JSON`, semi-structured, binary and other types fall back to `String`.
