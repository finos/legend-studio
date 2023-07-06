---
'@finos/legend-query-builder': patch
---

Fix a bug that fails to display subtypes if a propertyMapping of type parent directly points to a child classMapping or more than one class mapping for that subtype ([#1437](https://github.com/finos/legend-studio/issues/1437)).