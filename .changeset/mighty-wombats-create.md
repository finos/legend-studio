---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-server-lakehouse': patch
---

Replace GET /datacontracts/{id}/approvedUsers (one call per contract)
with POST /datacontracts/approvedUsers, sending all contract ids in
the request body in a single call.
