---
'@finos/legend-graph': minor
---

Unsupported elements, connections, set-implementations, etc. are now supported natively without extensions support, these are treated as unknown (sub) elements in the graph and instantiated with classes like `INTERNAL__UnknownPackageableElement`, `INTERNAL__UnknownConnection`, etc.
