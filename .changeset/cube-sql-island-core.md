---
'@finos/legend-cube': patch
---

The lambda reader reads the engine's SQL island, `#SQL{…}#`, as a source (`sqlAccessor` in the IR, its SQL kept as written): the lets its SQL reads by name, `var('name')`, are its step's inputs, read before it, and the lambda's parameters it reads are noted. A host's `CubeSourceStep.create` is given how many inputs the step takes, and may return any step.
