---
'@finos/legend-graph': minor
---

Add `sdlc` to BasicModel, to provide a `versioned` sdlc pointer for a metamodel graph.
Leverage sdlc pointer when applicable to send over `V1_PureModelContextPointer` to engine to lessen payload and improve performance by removing unneccesary transformation and serialization of all elemetns.
