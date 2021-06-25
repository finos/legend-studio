---
'@finos/legend-studio-plugin-query-builder': patch
---

Relax the mapped property check for the explorer tree. When we encounter derived properties or mapped properties whose target set implementation is of type `OperationSetImplementation`, we will skip mappedness checking for the whole branch. The rationale here is that Studio would not try to analyze the mappedness of those complicated cases as Studio will never fully try to understand the lambdas (used in derived properties and operation class mappings). This way, the user can drilled down to these branches. The validation on execution will be handled by the engine. _NOTE: we can potentially show some indicator to let user know mappedness checking has been disabled for branch, but that is for future discussions._
