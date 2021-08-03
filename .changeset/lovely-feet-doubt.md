---
'@finos/legend-studio': patch
'@finos/legend-studio-manual-tests': patch
---

Change `HACKY_createServiceTestAssertLambda` to assert equality on json strings to avoid failure on white spaces and extra lines.
