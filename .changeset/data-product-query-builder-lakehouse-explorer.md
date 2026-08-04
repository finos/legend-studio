---
'@finos/legend-query-builder': patch
---

Fix Data Product query builder for Lakehouse access points:

- `initWithDataProduct` now wires the accessor as the source element for Lakehouse execution contexts even when the graph has no compatible `LakehouseRuntime`, so the relation explorer loads instead of falling back to the class explorer.
- Always render the runtime selector in the Data Product setup panel. When no compatible runtime is available, it renders disabled with a red border and a "No compatible runtimes available" placeholder.
- Show the enclosing access point group id as a subtitle in the Execution ID dropdown option label for Lakehouse access points, to disambiguate access points that share the same title/id across different groups.
