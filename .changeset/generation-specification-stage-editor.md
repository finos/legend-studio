---
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

Author a `GenerationSpecification` node that holds several generation elements. The generation specification editor shows each node as a stage of cards, with the recompile that separates one stage from the next labelled on the divider and the specification's cost ("N stages, N recompiles") in the header. Dropping an element on a stage adds it to that stage, so generations that do not need each other run against one compiled graph by default; dropping it on the strip at the end gives it a stage of its own. A stage exists only while something is in it, and a generation that fails is reported on the card that caused it, which offers to move it into a stage of its own.
