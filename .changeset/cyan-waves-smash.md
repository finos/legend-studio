---
'@finos/legend-extension-dsl-data-space-studio': patch
---

Improve the Studio DataSpace query-builder entry points for execution contexts that use a `mappingProvider` and/or have no `defaultRuntime`:

- **Query action** (right-click "Query..." on a DataSpace): fall back to the first execution context when the data space has no `defaultExecutionContext`, surface missing-context cases as user notifications instead of throwing, and enable the runtime selector automatically when the resolved execution context has no `defaultRuntime`.
- **Executable query action** Do not show the dataspace dropdown for executable query builder (as only the current dataspace's exec contexts matter)
