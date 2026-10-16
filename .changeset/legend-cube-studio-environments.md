---
'@finos/legend-cube-builder': patch
'@finos/legend-application-studio': patch
---

Let Legend Cube in Studio run ingest data sets and data products in production or production parallel, picked in each tab (Mode), starting on production parallel unless the ingest definition Cube was opened from names only a production DID. With the lakehouse contract server configured, runs use the viewer's lakehouse environment from their entitlements, `-pp` added in production parallel, and need no lakehouse runtime in the project; without it, they use the project runtime's environment as before.
