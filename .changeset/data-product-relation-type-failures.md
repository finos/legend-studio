---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-product': patch
---

Handle data product access point relation type failures: the Studio data product editor no longer sticks a false "returns a Relation type" warning after a failed engine call (it retries, logs the failure, and shows the engine's per access point error), and the data product viewer no longer lets a failed engine lookup hide the artifact's columns or swallow the error.
