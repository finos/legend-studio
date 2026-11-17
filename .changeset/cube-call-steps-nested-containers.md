---
'@finos/legend-cube': patch
---

A host can read a call as one step whose inputs are its relations (`bindCall` on `readCubeQuery`), e.g. a user-defined function a definition's flow can't open; and a definition's flow can draw containers inside containers (`StepContainer.parentId`). The reader's free-variable walker (`findCubeFreeVariables`) and relation-input table (`getCubeRelationInputCount`) are exported, for a host that opens calls itself.
