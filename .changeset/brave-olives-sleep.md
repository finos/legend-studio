---
'@finos/legend-studio': patch
---

**BREAKING CHANGE:** Function expression builder will no-longer support building any function unless their expression builders are specified in plugins. This is adjusted to match the behavior of function handler in engine. _Also, by design, core Studio should not handle function matching at all._
