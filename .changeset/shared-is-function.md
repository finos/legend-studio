---
'@finos/legend-shared': patch
'@finos/legend-lego': patch
'@finos/legend-application-marketplace': patch
---

Add `isFunction` to `@finos/legend-shared`, next to `isString` and the other type guards, and use it instead of `typeof … === 'function'` where a value may be a function.
