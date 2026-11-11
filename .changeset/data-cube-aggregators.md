---
'@finos/legend-data-cube': patch
---

Add aggregations supported by the Relation API in `groupBy()` and `pivot()`: `median`, `mode` (integer and float columns), `percentile`, weighted average (`wavg`), correlation (`corr`), covariance (`covarPopulation`, `covarSample`), value at maximum / minimum (`maxBy`, `minBy`, found by a numeric column) and `all` / `any` for boolean columns. Two-column aggregations pair up the values of the aggregated column with those of another column using `rowMapper()`; when a horizontal pivot is applied, the other column is resolved to its pivot result column. The column properties panel now lets users edit aggregation parameters (e.g. the percentile, the join strings separator, the other column of a two-column aggregation) and only offers two-column aggregations when another compatible column is selected.
