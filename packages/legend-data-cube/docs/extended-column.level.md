---
title: 'Extended Column: Level'
id: 'data-cube.extended-column.level'
---

# Leaf Level

The value in the extended column is computed at the lowest (most granular) level.

# Group Level

The value in the extended column is computed for each row in the table, no matter whether it's a leaf-level row or an aggregate.

> This is used for operating on aggregated values, e.g., computing a yield (total credits / total volume) or a percentage change. A group-level extended column does not support grouping (pivoting), because it is computed _after_ those operations have been applied. Values are not aggregated; instead, the value on an aggregate row is computed from other aggregate values on the row.
