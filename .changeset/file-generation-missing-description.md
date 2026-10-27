---
'@finos/legend-application-studio': patch
---

Fixed the file generation editor crashing Studio to a blank page when the engine has no configuration description for the file generation's type, for example when the engine doesn't support it or its available generations request fails. The editor now shows a notice in place of the configuration properties, the scope and output path stay editable, and opening it no longer tries to generate files with an unknown generation mode.
