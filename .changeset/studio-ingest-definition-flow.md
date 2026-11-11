---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-product': patch
---

The Definition tab of an ingest definition with materialized views opens on what they do: a Flow | Pure switch, a list of the views down the left, each with its number of steps, and the picked view on the right. Its head shows its name, its primary key, the classification of its data and the data sets it reads, with its own Edit in Cube and Lineage; below, its flow, drawn read-only by Legend Cube's definition flow, which loads the first time it shows. A view Cube can't draw says why and shows its own Pure. While the flow shows, the header keeps View SQL and Create MatView; Pure is the whole definition's Pure, under the header as it was. A definition without materialized views is unchanged. Studio still reads only the views of an ingest definition's JSON. The lineage dialog names the view whose lineage it shows. `describeDefinitionFlowRefusal` is exported, for hosts of the flow to say why Cube can't draw a definition.
