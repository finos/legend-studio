---
'@finos/legend-graph': patch
---

Fix the building of `PropertyReference` in `XStorePropertyMapping` by defining its owner reference to be the association in the xstore mapping and the input to be the defined user input. Fixes https://github.com/finos/legend-studio/issues/524.
