---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Remove `PureProtocolProcessorPlugin.V1_getExtraExecutionInputCollectors()` and simplified the mechanism where we collect graph data for execution input: now we just send the full graph and do no filtering.
