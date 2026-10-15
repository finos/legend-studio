---
'@finos/legend-application-studio': patch
'@finos/legend-cube-builder': patch
---

Legend Cube in Studio: a materialized view's primary key leaves out the milestoning columns a write mode adds (`LAKE_DIGEST`, `LAKE_IN_ID`, `LAKE_OUT_ID`, `LAKE_FROM`, `LAKE_THRU`), in Add MatView and when Save MatView asks again, and Save MatView asks again for a key that has one.
