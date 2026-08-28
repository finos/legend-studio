---
'@finos/legend-extension-dsl-data-product': patch
---

Extract the "Request Access" control from `DataProductDataAccess` into a standalone `DataProductAPGAccessRequestControl` so it can be reused outside the data-access panel (the data space viewer now renders it next to a mapping-provider–backed execution context).

Add `SDLCDataProductResolver` to resolve a legacy SDLC-hosted data product to its Lakehouse deployment, so mapping-provider references from a data space can be opened as a Lakehouse data product from any consumer.
