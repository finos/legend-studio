---
"@finos/legend-query-builder": patch
---

Fix bug in BasicValueSpecificationEditor when editing CollectionInstanceValue parameters in the LambdaParameterValuesEditor. The fix ensures that entered values properly appear in the editor after input blur by improving MobX observable state updates.
