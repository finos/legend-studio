---
'@finos/legend-graph': patch
---

Make V1_createAccessorFromPackageableElement async -- it now handles fetching the columns from matview datasets' RawLambdas. The sync version (like before) is called V1_createAccessorFromPackageableElementWithNonFunctionSources and is still used in building value specs
