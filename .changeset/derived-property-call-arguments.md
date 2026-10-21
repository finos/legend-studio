---
'@finos/legend-application-studio': patch
---

When a derived property with parameters is dragged into a Pure property mapping lambda, fill its arguments with default values based on the parameter types (as done when dragging a function) instead of always generating an empty `()` call, which did not compile ([#917](https://github.com/finos/legend-studio/issues/917)).
