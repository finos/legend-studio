---
'@finos/legend-graph': patch
'@finos/legend-query-builder': patch
'@finos/legend-application-studio': patch
---

Say what a query reads of an ingest data set other than its rows, e.g. `EOD_POSITIONS (batch metadata)` for `#I{…|metadata}#`. In Studio's ingest definition Overview, a view's Reads and a data set's Read by say so. In the query builder, the source's label in the explorer and in the Dataset picked say so, and its path ends with the qualifier, e.g. `…EOD_POSITIONS|metadata`. legend-graph's ingest data set references keep the qualifier, and `getIngestAccessorQualifierLabel` and `getIngestDatasetReadLabel` word it.
