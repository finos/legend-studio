---
'@finos/legend-query-builder': patch
'@finos/legend-extension-dsl-data-space-studio': minor
---

feat: add DataProduct test suite support with access point test seeding and EqualToRelation assertions; update `convertDataSpaceToDataProduct` and `observe_DataProduct` call sites in `DataSpaceToDataProductConverter` and `DataSpaceEditorState` to propagate the editor's shared MobX `ObserverContext` — required so that the new deeply-nested testable fields (test suites, access point tests, data resolvers) are recursively observed under the same context as the rest of the graph, ensuring MobX change detection works correctly for DataProducts converted from DataSpaces
