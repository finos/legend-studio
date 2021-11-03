---
'@finos/legend-studio': patch
---

pr: 629
Fix a problem with escaping of single quote character which causes service tests created in Studio fail ([#586](https://github.com/finos/legend-studio/issues/586)), this can be considered a workaround until we figure out a strategy for the discrepancies in mapping test and service test runners in `Engine` (see [finos/legend-engine#429](https://github.com/finos/legend-engine/issues/429))
