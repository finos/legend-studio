---
'@finos/legend-application-studio': patch
---

Add DataProduct test suite support with relation assertions. Update Function testSuites form mode -- support adding test data for functions with ingest/dataProduct accessors irrespective of whether runtime is present or not (infer ingest and dataProduct accessors and add columns from ingest dataset or engine api for access points). Use Relation assertions for new tests on functions with Relation and TabularDataset return types. For Relation in particular, also fetch the RelationType columns from engine and them to the expected table
