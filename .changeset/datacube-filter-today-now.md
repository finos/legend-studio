---
'@finos/legend-data-cube': patch
---

Specify a date filter value in DataCube the way Legend Query does. A condition on a column which carries a date now picks how its value is specified: an absolute date, an absolute date and time, `today()` or `now()` - the last 2 being resolved when the query runs, and round-tripping through the snapshot.

An absolute value which carries a time of day is specified down to the second, through the same `datetime-local` control the query builder uses, rather than being truncated to a date.

This also fixes filtering on a column typed with a timestamp, which threw `Can't build primitive value instance for unsupported type` when the query was built.
