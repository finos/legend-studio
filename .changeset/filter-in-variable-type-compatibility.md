---
'@finos/legend-query-builder': patch
---

Fixed the `is in list of` / `is not in list of` filter operators incorrectly rejecting a compatible multi-valued parameter (e.g. an `Integer[*]` parameter parsed from PURE text) dragged or bound onto a property of the same primitive family, which caused the binding to silently reset to a default value. Also tightened `isTypeCompatibleForAssignment`'s date-family check so a date/time value is no longer treated as compatible with a non-date property.
