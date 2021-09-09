---
'@finos/legend-studio': patch
---

Fix problem where model test data generation fails when encoutering enumeration with 0 or 1 enum value (fixes [#463](https://github.com/finos/legend-studio/issues/463)). Also, we ensure this kind of error is handled gracefully and do not crash the application.
