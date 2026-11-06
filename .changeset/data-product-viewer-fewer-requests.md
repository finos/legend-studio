---
'@finos/legend-extension-dsl-data-product': patch
---

The data product viewer now fetches the data product's data requests once and shares them across access point groups, and fetches only the data product entity it needs from depot. It also fetches approved users for system account contracts and completed data requests once per data product instead of once per access point group, and no longer fetches the user's access status separately when it is already known from the user's contracts. When the data product is not present on the project version, or the version can't be loaded from depot, the error now says so.
