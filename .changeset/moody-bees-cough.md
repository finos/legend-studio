---
'@finos/legend-studio-plugin-query-builder': patch
---

Support for `take()` function only for execution using `graphFetch()`, not actual result modifier. This is because we want make it clear that there are 2 distinct `take()` functions being used: `meta::pure::tds::take()` in projection query and `meta::pure::functions::collection::take()` in graph fetch query. The latter works on the collection of instances itself and therefore, not so useful, whereas the former actually affects execution performance.
