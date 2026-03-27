---
'@finos/legend-server-lakehouse': patch
'@finos/legend-application-marketplace': patch
'@finos/legend-application-data-cube': patch
'@finos/legend-graph': patch
---

Add paginated data product fetching via `getDataProductsLitePaginated` and `getAllLiteDataProducts` to `LakehouseContractServerClient`, replacing the removed `getDataProductsLite` endpoint. Update marketplace and data-cube consumers to use the new paginated API.
