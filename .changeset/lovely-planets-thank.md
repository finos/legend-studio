---
'@finos/legend-studio-preset-query-builder': patch
---

Support matching supported function when its full path is specified, e.g. both `startsWith('some_string')` and `meta::pure::functions::string::startsWith('some_string')` are now considered valid.
