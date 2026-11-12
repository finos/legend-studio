---
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

An ingest definition's content can now be read, for viewing only, into a fully modelled `IngestDefinitionSpecification` (read and write modes, owner, data sets with their sources, columns, formats, partitions, lookup indexes, preprocessors and classification, batch logic, references and annotations), with `graphManager.getOrBuildIngestDefinitionSpecification`. It reads older versions of the protocol as the protocol reader does, keeps a type it doesn't know as an unknown node, and is built on demand: graph building is unchanged, the content stays what is saved, and content that can't be read leaves the specification undefined with a warning. The ingest definition editor state builds it when the editor opens, with its lambdas as Pure. Relation columns built from their protocol (`V1_buildRelationTypeFromV1RelationType`, `V1_buildResolvedRelationTypeFromV1RelationType`) now keep their `description`.
