---
'@finos/legend-graph': patch
'@finos/legend-studio': patch
---

Due to discrepancies in the test runners for mapping and service, we don't need to do any (un)escaping for the expectedResult assertion data of the service test during its initialization and generation like what we do for mapping test assertion data. So, removing the toGrammarString & fromGrammarString pair for service test runner to avoid it adding additional escape characters. For better context:
// See https://github.com/finos/legend-studio/issues/586
// See https://github.com/finos/legend-engine/issues/429
