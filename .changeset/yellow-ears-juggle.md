---
'@finos/legend-graph': major
---

**BREAKING CHANGE:** Reordered parameters for execution-related method in `AbstractPureGraphManager` (before we had: `graph, mapping, query, runtime`, now we have `query, mapping, runtime, graph`) to make this more consistent with other methods.
