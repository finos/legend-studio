---
'@finos/legend-shared': major
---

**BREAKING CHANGE:** Rework `serializeArray` and `deserializeArray`: these methods now take an `options` object instead of just the `skipIfEmpty: boolean` flag. This options object has the original `skipIfEmpty?: boolean | undefined` and a new flag called `INTERNAL__forceReturnEmptyInTest?: boolean | undefined` to make exception for grammar roundtrip test.
