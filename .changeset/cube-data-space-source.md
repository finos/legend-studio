---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-analytics': patch
'@finos/legend-application-analytics-bootstrap': patch
---

A data space as a Legend Cube source (PLAN §11.25). The core's `dataSpace` node runs the relation the host's query builder wrote for it, and a cube's optional mapping makes a run end in `from(mapping, runtime)`. The builder adds the source dialog's Data Space tab and the source's node editor, both through a new host seam (`CubeHost.dataSpaceEditor`), so it keeps no dependency on the query builder. Legend Analytics provides the editor when its deployment has a depot: the depot's released data spaces, and the query builder on a data space's project, whose graph it builds as Legend Query builds a data space's full graph, with the graph plugins Legend Query registers.
