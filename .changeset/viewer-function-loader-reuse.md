---
'@finos/legend-extension-dsl-data-product': patch
---

The function loader of an access point's definition flow reads Depot's answer into Depot's `ProjectVersionEntities` and `StoredEntity`, asks for `CORE_PURE_PATH.FUNCTION` and names a dependency with `generateGAVCoordinates`; a function's Pure is printed through the graph manager's `entitiesToPureCode`; the loader's type is Cube's `CubeDefinitionFunctionLoader` (the `DataProductFunctionLoader` alias, never released, is gone).
