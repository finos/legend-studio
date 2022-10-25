---
'@finos/legend-graph': minor
---

Add a new option to graph builder `strict: boolean`: when this is enabled, for a fair number of problems which engine consider warnings or non-problems right now, the graph builder will throw error. These problems will most likely be considered as errors in the future by engine compilation. As such, we want to have a mode where we can opt in to check for this kind of problems ([#941](https://github.com/finos/legend-studio/issues/941)).
