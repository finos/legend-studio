---
'@finos/legend-application-marketplace': patch
'@finos/legend-server-marketplace': patch
---

Add `show_all` parameter to data product search API and set to False by default, `has_filtered_products` metadata field, and "Show all data products" telemetry event. Fall back to config file when trending endpoint returns fewer than 4 data products.
