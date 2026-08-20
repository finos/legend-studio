---
'@finos/legend-extension-dsl-data-space': patch
---

Make execution contexts, their default mapping/runtime, and `executionContextKey` optional on Data Products, and add a `mappingProvider` alternative to `mapping` on execution contexts (resolved via a referenced Data Product's model access point group). Harden query-builder/graph-manager helpers accordingly.
