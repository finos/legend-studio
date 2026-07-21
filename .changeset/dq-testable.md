---
'@finos/legend-extension-dsl-data-quality': patch
'@finos/legend-application-studio': patch
'@finos/legend-graph': patch
---

Add testable support for Data Quality relation validation and relation comparison elements, including a Tests tab with test suites, store test data, and `EqualToJson` / `EqualToRelation` assertions. Also expose testable editor building blocks (states, components, helpers) from `@finos/legend-application-studio` and implement `generateExpected` for `EqualToRelationAssertionState`.
