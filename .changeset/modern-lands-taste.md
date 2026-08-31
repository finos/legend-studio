---
'@finos/legend-extension-dsl-data-space': patch
---

Rename user-facing "Data Product" strings to "Data Space" throughout the Data Space UI so the label matches the concept and no longer collides with the Lakehouse Data Product concept:

- Data Space viewer header ("Verified Data Space" badge, "Query Data Space" action) and info panel labels/tooltips ("Data Space", "Click to View Data Space", "Edit Data Space", "View Data Space").
- Data Space query builder setup panel: header label, `title`/`placeholder` on the selector and copy-link button, and the "Open advanced search for data space..." tooltip.
- Data Space advanced search modal: title, search placeholder, snapshot-toggle tooltip, and load-failure message.
- "Current Data Space" filter option contributed by the plugin to the query loader / template-query filters.
- Command palette entries for the Data Space diagram viewer (recenter, zoom/view/pan tools, next/previous diagram, toggle description) and the models documentation search.
- Data Space analysis status messages and validation errors surfaced from the graph manager and protocol processor plugin (e.g. `Analyzing data space...`, `Fetching data space analysis result from cache...`, `Fetching data space artifacts from cache...`, `Can't fetch data space analysis result cache: ...`, `Can't find data space element ...`, `Can't build data space executable`, `Can't transform data space support info`, `Can't include data space '<path>' in a mapping: ...`, `Data space support email 'address' field is missing or empty`, etc.).

Strings that genuinely refer to the Lakehouse `DataProduct` element (e.g. the "mapping provider" backing a Data Space execution context in `DataSpaceExecutionContextViewer`) are intentionally unchanged, as are endpoint URLs and telemetry trace names.
