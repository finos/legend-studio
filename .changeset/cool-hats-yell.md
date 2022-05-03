---
'@finos/legend-studio': patch
---

Fix a regression introduced in [`mobx` refactoring](https://github.com/finos/legend-studio/pull/1000) where after leaving text-mode, elements from extensions are not observed properly by change detection ([#1121](https://github.com/finos/legend-studio/issues/1121)).
