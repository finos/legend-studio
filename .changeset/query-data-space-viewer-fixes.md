---
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-application-query-bootstrap': patch
---

Fix the data space viewer in Legend Query's data space search: diagrams show again (the Legend Query bootstrap imports the diagram extension's stylesheet again, which it lost in #3132), `Run Query` creates a query on the data space in the chosen execution context instead of doing nothing, and the diagram's description card keeps its text light on its dark overlay in light themes and no longer pads the description out of view.
