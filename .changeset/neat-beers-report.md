---
'@finos/legend-studio-plugin-query-builder': patch
---

Stabilize query builder MVP (see #174 for more details): This includes some minor UX improvements as well as support for:

- Handling property with multiplicity many `[*]` in filter with `exists()`.
- Properly handling group operations with more than 2 clauses.
- Add support for set operators, such as `in/not-in`.
