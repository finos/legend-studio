---
'@finos/legend-graph': patch
'@finos/legend-lego': patch
'@finos/legend-query-builder': patch
---

Add support for precise primitive types in filter and post-filter operators. Precise types like VARCHAR, INT, BIGINT, DOUBLE, TIMESTAMP are now mapped to their standard primitive equivalents so operators correctly handle type compatibility checks.
