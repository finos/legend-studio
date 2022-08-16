---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Renamed `HACKY__createGetAllLambda()` to `createGetAllRawLambda()` and `HACKY__createDefaultBlankLambda()` to `createDefaultBasicRawLambda()` which now will also accept an option to control whether or not the dummy variable `x` should be added by default to the generated raw lambda.
