---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
'@finos/legend-application': patch
---

Legend Cube saves cubes (M8): a `CubeStore` port on the host (`CubeHost.store`) with Legend's implementation over the engine's Cube store (`buildCubeStore`), and on the page Save, Save as, Load, Delete, New, Copy and Paste, an asterisk for unsaved changes and a question before they are lost, and Alt+N, L, S, C and V. Legend Query gives the page its store, and opens a saved cube at `/query/cube/:cubeId` (or `?queryId=`), keeping the address on the cube shown. The navigator's `updateCurrentLocation` takes a `replace` option, so an address a page keeps up to date adds no history entry.
