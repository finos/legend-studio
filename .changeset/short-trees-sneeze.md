---
'@finos/legend-studio': patch
---

Cleanup test utilities: Add `TEST__` and `TEST_DATA__` prefixes for test utilities and test data to avoid polluting namespace. Rename methods that supply mocked store/state to `TEST__provideMocked...`.
