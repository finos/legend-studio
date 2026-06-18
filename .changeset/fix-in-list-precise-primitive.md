---
'@finos/legend-query-builder': patch
---

Fix UI crash (`Cannot get placeholder for type [object Object]`) when selecting `is in list of` / `is not in list of` for a filter or post-filter on an accessor relation column whose type is a precise primitive (e.g. `Varchar`, `BigInt`, `Timestamp`). `PrecisePrimitiveType` is now mapped to its standard primitive equivalent in the collection value editor placeholder, in `convertTextToPrimitiveInstanceValue`, and in `QueryBuilderFilterOperator_In` / `QueryBuilderPostFilterOperator_In` (default value + condition-value compatibility check).
