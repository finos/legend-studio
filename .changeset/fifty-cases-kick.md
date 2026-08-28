---
'@finos/legend-extension-dsl-data-space': patch
---

Make the data space viewer resilient to partial analytics results returned by the engine:

- `defaultExecutionContext`, `defaultRuntime`, `compatibleRuntimes`, and executable `result` are now optional on both the analytics metamodel and V1 protocol. `executableReturnType` is preserved end-to-end.
- The runtime dropdown is hidden when the selected execution context has no `defaultRuntime`, and the data-access panel/Legend AI integration handle a missing execution context and runtime.
- Added `DataSpaceMappingProviderAccessState` and cache mapping-provider access states in `DataSpaceViewerState` keyed by data product path, with a Refresh button next to the execution context selector to re-run the access lookup on demand.
