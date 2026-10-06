---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
---

Name relational accessor columns the way the engine does: a quoted column such as `"first name"` is now `first name` in the accessor's relation type, so `$r.'first name'` builds in the query builder instead of failing with "Can't find property first name in relation".
