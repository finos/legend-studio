---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-analytics': patch
'@finos/legend-application': patch
---

Legend Cube saves cubes (M8): a `CubeStore` port on the host (`CubeHost.store`) with Legend's implementation over the engine's Cube store (`buildCubeStore`), which `LegendCubeHost` builds, and on the page Load, Save, Save as and Delete in the 'Cube' menu, a Save button, an asterisk for unsaved changes and a question before they are lost, Copy and Paste of the spec, and Alt+N, L, S, C and V. A cube is owned by a deployment, as a service is (`CubeDeploymentOwnership`), which the Save dialog asks for, with a warning that saved cubes aren't backward compatible while Cube is in beta; the store decides who may change a cube. The store keeps every version of a cube, and `CubeStore` reads its history and any version. A host with no store, as Studio's, tracks no unsaved changes. Legend Analytics opens a saved cube at `/analytics/cube/:cubeId` (or `?queryId=`), keeping the address on the cube shown. The navigator's `updateCurrentLocation` takes a `replace` option, so an address a page keeps up to date adds no history entry.
