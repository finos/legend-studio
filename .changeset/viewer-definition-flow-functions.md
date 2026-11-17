---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

An access point's definition flow opens the calls of user-defined functions (PLAN §11.33): the viewer state takes a `loadFunctions` action, beside `loadIngestDefinition`, and Marketplace gives it `createDepotFunctionLoader`, which reads every function of the data product's project and its dependencies from Depot in one request, kept for the page. The functions load before the ingest definitions, as a function's body may read some; a function's Pure shows under the flow; a line says when a function drawn as one box leaves the steps after it unchecked; and the flow's telemetry counts the calls opened and the ones drawn as one box, by why.
