---
'@finos/legend-query-builder': patch
---

Support the Data DNS watermark, `forDataDNSWatermark()`, in query builder: choose it in the query options next to the standard watermark, give it an environment (`PROD` or `QA`), a registry URI, a date and an optional milestone, and it round-trips with the query. The date is the business date parameter of the query, which the watermark follows, unless you enter a date of your own.
