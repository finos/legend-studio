---
'@finos/legend-application-studio': patch
'@finos/legend-graph': patch
---

When a property is dragged from the source type tree into a Pure property mapping lambda, fill the arguments of every derived property along the dropped path (e.g. `$src.firmFor('', 0).name`) with default values based on the parameter types, instead of always generating an empty `()` call for the last derived property only, which did not compile ([#917](https://github.com/finos/legend-studio/issues/917)). Added `generateDerivedPropertyCallString()` next to `generateFunctionCallString()`.
