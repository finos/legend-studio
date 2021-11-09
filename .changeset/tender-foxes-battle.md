---
'@finos/legend-studio': patch
---

Replace `Table|View` with `TableAlias` as the relational mapping source, i.e `MappingElementSource`. Fixes generating mapping test with nested databases (see [#651](https://github.com/finos/legend-studio/issues/651)] for more details).
