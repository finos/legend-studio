---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Rename graph manager method prefix `HACKY_` with `HACKY__` to be consistent. Create a new method `HACKY__createDefaultBlankLambda()` to return the raw form of the lambda `x|''` which is used as the default in a lot cases.
