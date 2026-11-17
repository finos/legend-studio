---
'@finos/legend-application-query': patch
---

Fetch the data spaces and data products once while a query loads: flows that ask for them while they are being fetched wait on that fetch instead of fetching them again.
