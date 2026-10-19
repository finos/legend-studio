---
'@finos/legend-graph': patch
---

Create metamodel ids (`_UUID`) on first read instead of in every constructor. Building a graph creates millions of references whose ids are never read, and generating them took about a quarter of the load time of a large project in Studio.
