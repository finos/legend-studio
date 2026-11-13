---
'@finos/legend-query-builder': patch
---

Reopen typed TDS queries that have a post-filter after a window column (`extend()`) or after `select(~[...])`: the post-filter is now written as `$row.column` instead of the TDS getters (e.g. `$row.getNumber('rank')`), and the query builder can read it back instead of falling back to text mode.
