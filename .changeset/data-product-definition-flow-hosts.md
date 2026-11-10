---
'@finos/legend-application-marketplace': patch
'@finos/legend-application-marketplace-bootstrap': patch
'@finos/legend-application-marketplace-deployment': patch
'@finos/legend-application-studio': patch
---

Hosts of an access point's definition flow: Legend Marketplace loads Legend Cube's stylesheet and gives the viewer the ingest definitions from Depot, at the data product's version (an ad-hoc deployment has none, and its flows draw their data sets by name); Legend Studio's data product preview gives them from its graph, as the workspace holds them. Marketplace's build keeps the flow's libraries (React Flow, dagre) in a `cube-flow-vendor` chunk loaded only with the flow, instead of the `async-vendor` chunk every lazy page loads.
