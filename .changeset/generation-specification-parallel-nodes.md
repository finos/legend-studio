---
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

Keep a `GenerationSpecification` node that holds several generation elements. A node written with `generationElements` loads, round-trips and generates as written, instead of failing to build the graph; a node written with the singular `generationElement` keeps that form on save. The elements of one node generate against the same graph, which is updated once the node is done.
