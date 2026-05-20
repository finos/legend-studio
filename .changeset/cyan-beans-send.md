---
'@finos/legend-application-marketplace': patch
'@finos/legend-server-marketplace': patch
---

Enhance Lakehouse field search results to better separate data products from datasets.

- Add dedicated `Data Products` and `Datasets` columns in field search results.
- Add dataset chip tooltip support and dataset click-to-query behavior for legacy products (with marketplace fallback for lakehouse products).
- Extend field-search response models to include optional dataset metadata (`datasetDescription`, `defaultExecutionContext`) used by the UI.
