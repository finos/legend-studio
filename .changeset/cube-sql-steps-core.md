---
'@finos/legend-cube': patch
---

The lambda reader lets a host read a source as steps of its own: `bindSource` may answer with a relation (`CubeSourceRelation`), read in the source's place, e.g. the clauses of an SQL island whose SQL the host has parsed. `isCubeRowsLet` says whether a let binds rows.
