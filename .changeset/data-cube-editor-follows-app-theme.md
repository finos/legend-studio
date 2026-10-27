---
'@finos/legend-code-editor': patch
'@finos/legend-lego': patch
'@finos/legend-data-cube': patch
---

Fixed DataCube code editors turning every code editor of the application embedding DataCube (e.g. Studio in the dark theme) light: DataCube editors now use the application's code editor theme when it has one, set with the new `setApplicationCodeEditorTheme` (`getApplicationCodeEditorTheme` reads it back).
