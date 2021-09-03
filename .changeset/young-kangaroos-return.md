---
'@finos/legend-graph': patch
---

Since we do not keep the `section index`, we will cause paths inside of the `transform` of `relational property mappings` to be off since we keep the `transform` as raw `relational operation element`. As such, we now mitigate this by always resolving to full paths in this `transform` (fixes [#424](https://github.com/finos/legend-studio/issues/424))
