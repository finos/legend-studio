---
'@finos/legend-cube-builder': patch
---

A definition's flow (`@finos/legend-cube-builder/definition-flow`) opens the calls of user-defined functions: `loadCubeDefinitionFunctions` loads the functions a definition calls through the host's loader, and `readCubeDefinition` with `functions` puts each call Cube can open in its body's place, reporting it as a container (`functionCalls`), and each it can't as one step typed by the columns the function declares. `findCubeDefinitionIngestDefinitions` sees through the bodies.
