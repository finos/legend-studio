---
'@finos/legend-server-marketplace': patch
'@finos/legend-application-marketplace': patch
---

Overwrite trending section in config with actual top clicked data products from Analytics Endpoint

Add `hygiene_score` and `meets_hygiene_threshold` fields to `DataProductSearchResult` model to filter search results by hygiene threshold, showing only qualifying data products by default.
Add "Show all data products" option on the last page for users who can't find their data product.
