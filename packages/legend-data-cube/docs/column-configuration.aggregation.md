---
title: 'Column: Aggregation'
id: 'data-cube.column-configuration.aggregation'
---

The aggregation computes the value of the column on aggregated rows, i.e. the rows of vertical pivot groups, and the values of horizontal pivot columns.

Some aggregations reference another column, e.g. the weights of a weighted average. The referenced column must be selected and cannot be a horizontal pivot column. By default, the first compatible measure is picked (or the first compatible dimension, if there is no such measure), so check that it is the intended one. When a horizontal pivot is active, a column which is not pivoted (a dimension, or a measure excluded from horizontal pivot) can only reference columns which are not pivoted either. If the referenced column becomes unavailable, e.g. it is unselected, the aggregation falls back to the default one.

> When a horizontal pivot is active, the values of horizontal pivot columns on vertical pivot group rows are aggregated from the already aggregated values of the most detailed rows, rather than from the underlying data. This gives the expected result for `sum`, `min`, `max`, `all` and `any`, as well as for `wavg` when its weight column is aggregated with `sum`. For `median`, `percentile`, `mode`, `corr`, `covar`, `max by` and `min by`, a group row only shows a value when all rows below it have the same value, and is empty otherwise. For `avg`, `var` and `std`, the value on a group row is computed from the values of the rows below it, e.g. it is the average of their averages, rather than the average of the underlying data; similarly, for `count`, it is the number of rows below it which have a value, rather than the total count. These are kept as is so the values of existing data cubes do not change. The values of columns which are not pivoted, e.g. measures excluded from horizontal pivot, are aggregated from their values on the most detailed rows, where rows with the same values for all such columns are merged into one.
