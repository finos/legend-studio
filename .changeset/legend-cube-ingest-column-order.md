---
'@finos/legend-cube-builder': patch
---

Legend Cube: a batch-milestoned ingest data set lists the columns its write mode adds in the order the engine returns them, `LAKE_DIGEST`, `LAKE_IN_ID`, `LAKE_OUT_ID` (then `LAKE_FROM`, `LAKE_THRU` for a business-temporal one), so its runs no longer fail with "The engine returned the column "LAKE_DIGEST" at position …, but the query has "LAKE_IN_ID" there". A saved cube's data sets take the new order when it is opened or refreshed, with a warning that their columns were reordered.
