---
'@finos/legend-studio': patch
---

Refactor codebase to use new syntax for `Mobx` `flow` and `flowResult` (related to https://github.com/finos/legend-studio/issues/83).

**BREAKING CHANGE:** A fair amount of core methods are now nolonger returning `Promise<...>`, but instead `GeneratorFn<...>` due to the new `flow` syntax. This does not affect the functionality, just the syntax.
