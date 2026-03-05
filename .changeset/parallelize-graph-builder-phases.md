---
'@finos/legend-graph': patch
---

Further optimize graph builder performance by parallelizing independent build phases. After the core sequential phases (indexing, types, stores, mappings, connections, and runtimes) are complete, subsequent passes for services, data elements, function activators, and generation specifications are now executed in parallel using `Promise.all`. This significantly reduces wall-clock time for projects with diverse element types while ensuring all cross-references are correctly resolved.
